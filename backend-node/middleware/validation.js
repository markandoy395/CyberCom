// Request validation middleware
const validateRequest = (requiredFields = []) => (req, res, next) => {
  const body = req.body || {};

  // Check required fields
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return res.status(400).json({
        success: false,
        error: `Missing required field: ${field}`,
      });
    }
  }

  // Validate email format if email field exists
  if (body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }
  }

  // Validate password strength if password field exists
  if (body.password) {
    if (body.password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
      });
    }
  }

  next();
};

// Sanitize input to prevent injection attacks
const sanitizeInput = (req, res, next) => {
  const sanitize = obj => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  next();
};

export { validateRequest, sanitizeInput };
