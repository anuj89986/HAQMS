const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/reports/doctor-stats
// optimized aggregation reporting for admin/receptionists dashboard
router.get('/doctor-stats', authenticate, async (req, res) => {
  try {
    const start = Date.now();

    // Fixed: Fetch all doctors without looping
    const doctors = await prisma.doctor.findMany();

    // get today date for filtering today's queue tokens
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // fetched all doctors
    const reportData = await Promise.all(
      doctors.map(async (doc) => {
        // use aggregation queries to get all counts 
        const appointmentStats = await prisma.appointment.groupBy({
          by: ['status'],
          where: { doctorId: doc.id },
          _count: true,
        });

        let totalAppointments = 0;
        let completedAppointments = 0;
        let cancelledAppointments = 0;

        appointmentStats.forEach((stat) => {
          totalAppointments += stat._count;
          if (stat.status === 'COMPLETED') {
            completedAppointments = stat._count;
          } else if (stat.status === 'CANCELLED') {
            cancelledAppointments = stat._count;
          }
        });

        //today;s queue tokens
        const queueTokensCount = await prisma.queueToken.count({
          where: {
            doctorId: doc.id,
            createdAt: { gte: today },
          },
        });

        const revenue = completedAppointments * doc.consultationFee;

        return {
          id: doc.id,
          name: doc.name,
          specialization: doc.specialization,
          department: doc.department,
          totalAppointments,
          completedAppointments,
          cancelledAppointments,
          todayQueueSize: queueTokensCount,
          revenue,
        };
      })
    );

    const durationMs = Date.now() - start;

    res.json(new ApiResponse(200, {
      timeTakenMs: durationMs,
      reportData,
    }, 'Doctor statistics report generated successfully'));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, null, 'Failed to generate report'));
  }
});

module.exports = router;
