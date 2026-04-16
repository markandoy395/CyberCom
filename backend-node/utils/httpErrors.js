import {
  DATABASE_UNAVAILABLE_MESSAGE,
  isDatabaseUnavailableError,
} from './databaseErrors.js';

const toErrorMessage = (error, fallback = 'Internal server error') => {
  if (typeof error === 'string') {
    return error;
  }

  return error?.message || fallback;
};

export const getErrorResponse = (
  error,
  { defaultStatus = 500, defaultMessage = 'Internal server error' } = {}
) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return {
      status: 400,
      body: {
        success: false,
        error: 'Invalid JSON in request body',
      },
    };
  }

  if (isDatabaseUnavailableError(error)) {
    return {
      status: 503,
      body: {
        success: false,
        error: DATABASE_UNAVAILABLE_MESSAGE,
      },
    };
  }

  return {
    status: error?.status || defaultStatus,
    body: {
      success: false,
      error: toErrorMessage(error, defaultMessage),
    },
  };
};

export const handleRouteError = (res, error, options = {}) => {
  const { status, body } = getErrorResponse(error, options);

  return res.status(status).json(body);
};

export const sendServiceResult = (
  res,
  result,
  { successStatus = 200, defaultErrorStatus = null } = {}
) => {
  if (!result || result.success !== false) {
    return successStatus === 200
      ? res.json(result)
      : res.status(successStatus).json(result);
  }

  if (isDatabaseUnavailableError(result)) {
    return res.status(503).json({
      success: false,
      error: DATABASE_UNAVAILABLE_MESSAGE,
    });
  }

  if (defaultErrorStatus) {
    return res.status(defaultErrorStatus).json(result);
  }

  return res.json(result);
};

