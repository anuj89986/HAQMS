const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate ,authorize } = require('../middleware/auth');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments
// List all appointments
// PERFORMANCE BUG: Classic N+1 Query Issue!
// Instead of using Prisma's include, it loops through each appointment and executes
// individual select statements for Patient and Doctor details.
router.get('/', authenticate, async (req, res) => {
  try {
    const { doctorId, status } = req.query;

    const where = {};
    if (doctorId) where.doctorId = doctorId;
    if (status) where.status = status;

    // used include to fetch data in single query
    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { appointmentDate: 'asc' },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            age: true,
            medicalHistory: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
      },
    });

    res.json(new ApiResponse(200, appointments, 'Appointments retrieved successfully'));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, null, 'Failed to fetch appointments', error.message));
  }
});

// POST /api/appointments
// Book an appointment
// DESIGN BUG: Duplicate-prone schema. No unique index blocks duplicate appointment bookings.
// In this API, we have a half-hearted verification that is easily bypassed or logically flawed,
// allowing multiple bookings for the exact same date and doctor.
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, doctorId, appointmentDate, reason } = req.body;

    if (!patientId || !doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'Patient, Doctor, and Appointment Date are required.' });
    }

    const appDate = new Date(appointmentDate);
    
    // created the start and end of the slot but its only for every hour
    const startOfSlot = new Date(appDate);
    startOfSlot.setMinutes(0, 0, 0);
    
    const endOfSlot = new Date(startOfSlot);
    endOfSlot.setHours(endOfSlot.getHours() + 1);

    const existingBooking = await prisma.appointment.findFirst({
      where: {
        doctorId,
        appointmentDate: {
          gte: startOfSlot,
          lt: endOfSlot,
        },
        status: { not: 'CANCELLED' },
      },
    });

    if (existingBooking) {
      throw new ApiError(400, 'This time slot is already booked for the selected doctor. Please choose a different time.');
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        appointmentDate: appDate,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    res.status(201).json(new ApiResponse(201, appointment, 'Appointment booked successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to book appointment', error.message));
  }
});

//changed the authenticate to only doctor and admin can update
router.patch('/:id', authenticate,authorize(['ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.status(200).json(new ApiResponse(true, updated, 'Appointment status updated successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to update appointment', error.message));
  }
});

module.exports = router;
