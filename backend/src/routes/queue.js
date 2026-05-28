const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/queue
// List all active queue tokens
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    const tokens = await prisma.queueToken.findMany({
      where,
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(new ApiResponse(200, tokens, 'Queue tokens retrieved successfully'));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, null, 'Failed to retrieve queue'));
  }
});

// POST /api/queue/checkin
// Generate a new queue token for a patient
router.post('/checkin', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentId } = req.body;

    if (!patientId || !doctorId) {
      throw new ApiError(400, 'Patient and Doctor ID are required for check-in.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // retry up to 5 times if a duplicate tokenNumber slips in
    const newToken = await prisma.$transaction(async (transc) => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const maxTokenResult = await transc.queueToken.aggregate({
          where: {
            doctorId,
            queueDate: today,
          },
          _max: { tokenNumber: true },
        });

        const currentMax = maxTokenResult._max.tokenNumber || 0;
        const nextTokenNumber = currentMax + 1;

        try {
          return await transc.queueToken.create({
            data: {
              tokenNumber: nextTokenNumber,
              queueDate: today,
              patientId,
              doctorId,
              appointmentId: appointmentId || null,
              status: 'WAITING',
            },
            include: { patient: true, doctor: true },
          });
        } catch (err) {
          // Prisma unique constraint error code
          if (err.code !== 'P2002') {
            throw err;
          }
          // otherwise retry
        }
      }

      throw new Error('Failed to allocate token after retries');
    });

    res.status(201).json(new ApiResponse(201, newToken, 'Checked in successfully. Token generated.'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    console.error('Queue check-in error:', error);
    res.status(500).json(new ApiResponse(500, null, 'Check-in failed'));
  }
});

// PATCH /api/queue/:id)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      throw new ApiError(400, 'Status is required');
    }

    const updatedToken = await prisma.queueToken.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        patient: true,
        doctor: true,
      },
    });

    res.json(new ApiResponse(200, updatedToken, 'Queue token status updated successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to update queue token'));
  }
});

module.exports = router;
