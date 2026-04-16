import { getErrorResponse } from '../utils/httpErrors.js';

// Global error handling middleware
// NOTE: Express treats middleware with 4 args as error handlers (err, req, res, next)
const errorHandler = (err, req, res, next) => {
  const { status, body } = getErrorResponse(err);

  // Log error details for server-side debugging
  if (status >= 500) {
    // Prefer full stack when available
    console.error('[ErrorHandler] Unhandled error:', err?.stack || err);
  } else {
    console.warn('[ErrorHandler] Handled error:', err?.message || err);
  }

  // In non-production, include the stack trace in the response for easier debugging
  if (process.env.NODE_ENV !== 'production') {
    body.stack = err?.stack;
  }

  res.status(status || 500).json(body);
};

export default errorHandler;
