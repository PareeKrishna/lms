/**
 * Structured logging utility following best practices
 * Provides consistent logging format across the application
 */

const getTimestamp = () => new Date().toISOString();

const formatLog = (level, message, context = {}) => {
  const logEntry = {
    timestamp: getTimestamp(),
    level: level.toUpperCase(),
    message,
    ...context,
  };
  return JSON.stringify(logEntry);
};

export const logger = {
  info: (message, context = {}) => {
    console.log(formatLog('info', message, context));
  },

  error: (message, error = null, context = {}) => {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };
    console.error(formatLog('error', message, errorContext));
  },

  warn: (message, context = {}) => {
    console.warn(formatLog('warn', message, context));
  },

  debug: (message, context = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog('debug', message, context));
    }
  },

  // Request logging helper
  request: (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
    const userId = req.auth?.()?.userId || 'anonymous';

    logger.info('Incoming request', {
      method,
      url,
      ip,
      userId,
    });

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request completed', {
        method,
        url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId,
      });
    });

    next();
  },
};

export default logger;
