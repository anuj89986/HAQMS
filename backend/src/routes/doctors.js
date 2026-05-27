const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors
// Retrieve list of doctors with special search filtering
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, specialization } = req.query;

    let query = 'SELECT * FROM "Doctor" WHERE 1=1'; // Base query for easy appending of conditions
    const params = [];

    if (search) {
      // Using parameterized query 
      query += ' AND name ILIKE $' + (params.length + 1);
      params.push(`%${search}%`);
    }

    if (specialization && specialization !== 'All') {
      query += ' AND specialization = $' + (params.length + 1);
      params.push(specialization);
    }

    const doctors = await prisma.$queryRaw(query, ...params);

    res.json(new ApiResponse(200, doctors, 'Doctors retrieved successfully'));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, null, 'Failed to retrieve doctors'));
  }
});

// GET /api/doctors/stats
// Returns aggregation details about available doctors
// sequential happens beacuse of the await but we run them in parallel
router.get('/stats', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const start = Date.now();

    const [totalDoctors, surgeonsCount, averageFee, highestExperience] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({
        where: { department: 'Surgery' },
      }),
      prisma.doctor.aggregate({
        _avg: {
          consultationFee: true,
        },
      }),
      prisma.doctor.aggregate({
        _max: {
          experience: true,
        },
      }),
    ]);

    const durationMs = Date.now() - start;

    res.json(new ApiResponse(200, {
      total: totalDoctors,
      surgeons: surgeonsCount,
      averageFee: Math.round(averageFee._avg.consultationFee || 0),
      maxExperience: highestExperience._max.experience || 0,
      executionTimeMs: durationMs,
    }, 'Doctor statistics retrieved successfully'));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, null, 'Failed to retrieve doctor statistics'));
  }
});

// GET /api/doctors/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
    });

    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }

    res.json(new ApiResponse(200, doctor, 'Doctor retrieved successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to retrieve doctor'));
  }
});

module.exports = router;
