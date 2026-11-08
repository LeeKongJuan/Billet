// In-memory rate limiter for auth routes
const requestCounts = new Map();

// Periodic cleanup every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of requestCounts.entries()) {
    if (now - record.startTime > 60000) {
      requestCounts.delete(key);
    }
  }
}, 300000);

export function authRateLimit(maxRequests = 20, windowMs = 60000) {
  return (req, res, next) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = requestCounts.get(ip) || { count: 0, startTime: now };

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count++;
    }

    requestCounts.set(ip, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Bạn đã thực hiện quá nhiều yêu cầu, vui lòng thử lại sau một phút'
        }
      });
    }

    next();
  };
}
