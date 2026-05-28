const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { ApiResponse } = require("../utils/ApiResponse.js");
const { ApiError } = require("../utils/ApiError.js");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET; // removed the fallback hardcoded for better security
if(!JWT_SECRET){
  throw new Error("JWT_SECRET is not defined in environment variables");
}
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // regex for email validation
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; // regex for password validation (min 8 chars, at least one letter and one number)
const ALLOWED_ROLES = ['RECEPTIONIST', 'DOCTOR', 'ADMIN']; // Allowed roles

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    // removed the console log to avoid logging sensitive data

    let { email, password, name, role } = req.body;

    email = email?.trim().toLowerCase();
    password = password?.trim();
    name = name?.trim();
    role = role?.trim();
    // trimmed the input data to avoid and extra spaces at starting and ending

    if (!email || !password || !name) {
      throw new ApiError(400, "Name, email and password are required");
    }
    // added basic validation for email and password by using regexpattern
    if (!emailRegex.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }

    if (!passwordRegex.test(password)) {
      throw new ApiError(400, "Password must be at least 8 characters long and contain both letters and numbers");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(400, "User already exists with this email");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: ALLOWED_ROLES.includes(role) ? role : 'RECEPTIONIST', // Default to RECEPTIONIST if role is not valid
      },
    });

    // removed the password from user object before sending to frontend
    const { password: _, ...userWithoutPassword } = user; // Exclude password from response
    res.status(201).json(new ApiResponse(201, userWithoutPassword, "User registered successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status).json(
        new ApiResponse(error.status, null, error.message)
      );
    } else {
      if (process.env.NODE_ENV === "development") {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error", errorStack: error.stack });
      } else {
        res.status(500).json(new ApiResponse(500, null, "Internal Server Error"));
      }
    }
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    // removed the console log to avoid to log the sensitive data of login
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();
    password = password?.trim();

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError(401, "Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new ApiError(401, "Invalid credentials");
    }

    // changed the expiry time to 1 day for better security
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "1d" },
    );

    // added secure cookie option for better security 
    const option = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    };

    // changed the reponsed format to be consistent and the token is sent to cookie
    res
    .status(200)
    .cookie('token',token,option)
    .json(new ApiResponse(200, {user: { id: user.id, email: user.email, name: user.name, role: user.role } }, "Login successful"));
    // changed the error handling in login also
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json(
        new ApiResponse(error.statusCode, null, error.message)
      );
    } else {
      // Handle unexpected errors
      if (process.env.NODE_ENV === "development") {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error", errorStack: error.stack });
      } else {
        res.status(500).json(new ApiResponse(500, null, "Internal Server Error"));
      }
    }
  }
});

// GET /api/auth/me
// Returns current user details based on JWT
const { authenticate } = require("../middleware/auth");
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.json(new ApiResponse(200, user, "User details retrieved successfully"));
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status).json(
        new ApiResponse(error.status, null, error.message)
      );
    } else {
      if (process.env.NODE_ENV === "development") {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error", errorStack: error.stack });
      } else {
        res.status(500).json(new ApiResponse(500, null, "Internal Server Error"));
      }
    }
  }
});

// added logout endpoint to clear the cookie rather removing from localStorage
router.post("/logout", (req, res) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.json(new ApiResponse(200, null, "Logout successful"));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error:", error);
      res.status(500).json({ error: "Internal Server Error", errorStack: error.stack });
    }
      else {
        res.status(500).json(new ApiResponse(500, null, "Internal Server Error"));
      }
  }
});

module.exports = router;
