const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const { ApiResponse } = require('../utils/ApiResponse');
const { ApiError } = require('../utils/ApiError');

const router = express.Router();
const prisma = new PrismaClient();

// Phone number validation regex
const phoneRegex = /^[0-9]{10}$/; // 10 digit phone number regex validation

// GET /api/patients
// Get all patients with search, filtering, and EFFICIENT SQL PAGINATION
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, gender, page = 1, limit = 5 } = req.query;
    
    // made where clause for database-level filtering
    const where = {};

    if (search) {
      // rather than doing many queries we use one query with or condition
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gender && gender !== 'All') {
      where.gender = { equals: gender, mode: 'insensitive' };
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const offset = (pageNum - 1) * limitNum;

    // done pagination and counting
    const [patients, totalCount] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: offset,
      }),
      prisma.patient.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json(new ApiResponse(200, {
      patients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPatients: totalCount,
        totalPages,
      },
    }, 'Patients retrieved successfully'));
  } catch (error) {
    res.status(500).json(new ApiResponse(500, null, 'Failed to fetch patients'));
  }
});

// GET /api/patients/:id
// Get patient details by ID with appointments included
router.get('/:id', authenticate, async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        appointments: true, // Fetching relation direct
      },
    });

    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    res.json(new ApiResponse(200, patient, 'Patient retrieved successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to retrieve patient'));
  }
});

// POST /api/patients (Register patient)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, age, gender, medicalHistory } = req.body;

    // now it is checked with validation of phoen number
    if (!name || !phoneNumber || !age || !gender) {
      throw new ApiError(400, 'Name, phoneNumber, age, and gender are required.');
    }

    if (!phoneRegex.test(phoneNumber)) {
      throw new ApiError(400, 'Invalid phone number format. Please provide a 10 digit number.');
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      throw new ApiError(400, 'Age must be a valid number between 0 and 150.');
    }

    const patient = await prisma.patient.create({
      data: {
        name,
        email: email || null,
        phoneNumber,
        age: ageNum,
        gender,
        medicalHistory: medicalHistory || '',
      },
    });

    res.status(201).json(new ApiResponse(201, patient, 'Patient registered successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to register patient'));
  }
});

// DELETE /api/patients/:id
// now only admin can delete the patient
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new ApiError(404, 'Patient not found');
    }

    await prisma.patient.delete({ where: { id } });

    res.json(new ApiResponse(200, null, `Successfully deleted patient ${patient.name}`));
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(new ApiResponse(error.statusCode, null, error.message));
    }
    res.status(500).json(new ApiResponse(500, null, 'Failed to delete patient'));
  }
});

module.exports = router;
