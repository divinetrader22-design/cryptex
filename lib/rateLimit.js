// Simple in-memory rate limiter for API routes
// Tracks IP attempts and blocks after threshold

const attempts = new Map();

export function rateLimit(ip, maxAttempts = 10, windowMs = 60000) {
  const now = Date.now();
  const key = ip || 'unknown';

  if (!attempts.has(key)) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  const record = attempts.get(key);

  // Reset window if expired
  if (now - record.firstAttempt > windowMs) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  record.count++;

  if (record.count > maxAttempts) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.firstAttempt + windowMs - now) / 1000) };
  }

  return { allowed: true, remaining: maxAttempts - record.count };
}

export function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}
