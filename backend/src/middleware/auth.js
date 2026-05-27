const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');

const JWT_SECRET = process.env.JWT_SECRET ;
if(!JWT_SECRET){
  throw new Error("JWT_SECRET is not defined in environment variables");
}

// Authentication middleware
const authenticate = (req, res, next) => {
  // Extract token from cookies or Authorization header
  const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json(new ApiResponse(401, null, 'No token provided. Please log in.'));
  }

  try {
    // removed the ignore checking of expired token
    const decoded = jwt.verify(token, JWT_SECRET); 
    if (!decoded || !decoded.id) {
      throw new ApiError(401, 'Invalid token. Please log in again.');
    }
    
    // Add user details to request object
    req.user = decoded;
    next();
  } catch (error) {
    // Improved error handling for token verification
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(new ApiResponse(401, null, 'Token expired. Please log in again.'));
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(new ApiResponse(401, null, 'Invalid token. Please log in again.'));
    }
    else if (error instanceof ApiError) {
      return res.status(error.status).json(new ApiResponse(error.status, null, error.message));
    }
    else {
      return res.status(500).json(new ApiResponse(500, null, 'An unexpected error occurred.'));
    }
  }
};

// Role authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(new ApiResponse(401, null, 'Unauthorized. Please log in.'));
    }

    // Role-based verification
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json(new ApiResponse(403, null, `Forbidden. Requires role: ${roles.join(' or ')}`));
    }

    next();
  };
};

//removed the leagacyAdminOnly middleware as it is not used we can do it with authorize only by putting role as admin only

module.exports = {
  authenticate,
  authorize,
};
