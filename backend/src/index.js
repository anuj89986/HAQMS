const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const { ApiError } = require('./utils/ApiError');
const { ApiResponse } = require('./utils/ApiResponse');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// currently allowing the development domain
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Body parser
app.use(express.json());

// added the cookie parser middleware to handle cookies 
app.use(cookieParser());

// Simple request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reports', reportRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Hospital Appointment and Queue Management System (HAQMS) Backend API',
    status: 'Running',
    version: '1.0.0'
  });
});

// fixed error leaking to client
app.use((err, req, res, next) => {
  // it is only log in the server console
  console.error('[CRITICAL-ERROR]:', err);

  // Check if error is an ApiError instance
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(
      new ApiResponse(err.statusCode, null, err.message)
    );
  }

  // For unexpected errors, return generic message without details
  res.status(500).json(
    new ApiResponse(500, null, 'An unexpected internal server error occurred!')
  );
});

// Listen on port
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`   HAQMS BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
  console.log(`   ENVIRONMENT: ${process.env.NODE_ENV}`);
  console.log(`===================================================`);
});

// Catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, should exit process after logging critical error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
