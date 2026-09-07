// In-memory sliding-window rate limiter for backend API endpoints

const rateLimitStore = new Map();

// Periodic cleanup of expired rate limit buckets every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000).unref?.();
}

/**
 * Check rate limit for a given key.
 * @param {string} key - Unique identifier (e.g. IP + endpoint or userEmail + endpoint)
 * @param {number} limit - Max requests allowed in the window
 * @param {number} windowMs - Window duration in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetTime: number, total: number }}
 */
export function checkRateLimit(key, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    const newRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, newRecord);
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: newRecord.resetTime,
      total: 1,
    };
  }

  record.count += 1;
  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);

  return {
    allowed,
    remaining,
    resetTime: record.resetTime,
    total: record.count,
  };
}

/**
 * Get client IP address from Next.js request headers.
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  try {
    const forwardedFor = req.headers?.get?.("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    const realIp = req.headers?.get?.("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }
  } catch (e) {
    // Ignore header extraction errors
  }
  return "127.0.0.1";
}

/**
 * Rate limit guard helper.
 * Returns Response with 429 Too Many Requests if limit is exceeded, or null if allowed.
 * @param {Request} req
 * @param {object} options
 * @param {string} options.prefix - Prefix namespace for the endpoint
 * @param {number} options.limit - Max requests
 * @param {number} options.windowMs - Window in ms
 * @param {string} [options.identifier] - Optional user identifier (e.g. email)
 * @returns {Response | null}
 */
export function rateLimitGuard(req, { prefix = "api", limit = 60, windowMs = 60000, identifier = null }) {
  const ip = getClientIp(req);
  const key = `${prefix}:${identifier || ip}`;
  const result = checkRateLimit(key, limit, windowMs);

  if (!result.allowed) {
    const retryAfterSecs = Math.ceil((result.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: retryAfterSecs,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSecs),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
        },
      }
    );
  }

  return null;
}

export function resetRateLimits() {
  rateLimitStore.clear();
}
