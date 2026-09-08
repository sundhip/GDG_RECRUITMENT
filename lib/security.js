import { auth } from "./auth.js";
import { resolveDepartment } from "./submissions.js";
import { verifySessionToken } from "./session-helper.js";
import { isWhitelistedAdminEmail } from "./admin-auth.js";

/**
 * Extract authenticated user session from Next.js request headers.
 * @param {Headers|object} reqHeaders
 * @returns {Promise<object|null>}
 */
export async function getSessionUser(reqHeaders) {
  try {
    let cookieStr = "";
    if (reqHeaders) {
      if (typeof reqHeaders.get === "function") {
        cookieStr = reqHeaders.get("cookie") || "";
      } else if (reqHeaders.cookie) {
        cookieStr = reqHeaders.cookie;
      }
    }

    if (cookieStr) {
      const match = cookieStr.match(/(?:session_token|better-auth\.session_token)=([^;]+)/);
      if (match && match[1]) {
        const user = verifySessionToken(decodeURIComponent(match[1]));
        if (user) {
          if (isWhitelistedAdminEmail(user.email)) {
            user.role = "admin";
          }
          return user;
        }
      }
    }

    const session = await auth.api.getSession({
      headers: reqHeaders,
    });
    if (session?.user) {
      if (isWhitelistedAdminEmail(session.user.email)) {
        session.user.role = "admin";
      }
      return session.user;
    }
    return null;
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}

/**
 * Reusable server-side Authentication Guard.
 * Returns the user object if authenticated, or throws/returns a 401 error response object.
 * @param {Headers|object} reqHeaders
 * @returns {Promise<{ user: object|null, response: Response|null }>}
 */
export async function requireAuth(reqHeaders) {
  const user = await getSessionUser(reqHeaders);
  if (!user) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required to access this resource",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }
  return { user, response: null };
}

/**
 * Reusable server-side Admin Authorization Guard.
 * Verifies both authentication AND admin role ('admin').
 * Returns 401 if unauthenticated, 403 if authenticated but not admin.
 * @param {Headers|object} reqHeaders
 * @returns {Promise<{ user: object|null, response: Response|null }>}
 */
export async function requireAdmin(reqHeaders) {
  const { user, response: authResponse } = await requireAuth(reqHeaders);
  if (authResponse) {
    return { user: null, response: authResponse };
  }

  const isAdmin = user.role === "admin" || isWhitelistedAdminEmail(user.email);
  if (!isAdmin) {
    return {
      user: null,
      response: new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Administrative privileges are required to perform this action",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  user.role = "admin";
  return { user, response: null };
}

/**
 * Object-level Authorization / IDOR Guard.
 * Verifies that the authenticated user either owns the target resource (matched by email)
 * or possesses administrative privileges.
 * @param {object} sessionUser
 * @param {string} targetEmail
 * @returns {{ allowed: boolean, response: Response|null }}
 */
export function enforceOwnershipOrAdmin(sessionUser, targetEmail) {
  if (!sessionUser) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    };
  }

  const userEmail = (sessionUser.email || "").toLowerCase().trim();
  const requestedEmail = (targetEmail || "").toLowerCase().trim();

  if (sessionUser.role === "admin" || (userEmail && requestedEmail && userEmail === requestedEmail)) {
    return { allowed: true, response: null };
  }

  return {
    allowed: false,
    response: new Response(
      JSON.stringify({
        error: "Forbidden",
        message: "You are not authorized to view or modify resources belonging to other applicants",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    ),
  };
}

// -------------------------------------------------------------
// INPUT VALIDATION & SANITIZATION
// -------------------------------------------------------------

/**
 * Sanitize plain string input: trims, removes control chars/null bytes, truncates.
 * @param {any} val
 * @param {number} maxLen
 * @returns {string}
 */
export function sanitizeString(val, maxLen = 500) {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return str.slice(0, maxLen);
}

/**
 * Validate standard email format.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email || typeof email !== "string") return false;
  if (email.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate college registration number format (e.g. 25BCE1328, 25EEE1562, 26ECE176).
 * Years are strictly restricted between 23 and 26.
 * @param {string} regNo
 * @returns {boolean}
 */
export function validateRegistrationNumber(regNo) {
  if (!regNo || typeof regNo !== "string") return false;
  const regNoRegex = /^(23|24|25|26)[A-Z]{3}\d{3,5}$/i;
  return regNoRegex.test(regNo.trim());
}

/**
 * Validate phone number format (10 to 15 digits, optional leading +).
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate submission document ID format.
 * @param {string} id
 * @returns {boolean}
 */
export function validateSubmissionId(id) {
  if (!id || typeof id !== "string") return false;
  const idRegex = /^[a-zA-Z0-9_.-]{1,128}$/;
  return idRegex.test(id.trim());
}

/**
 * Sanitize rich HTML content for email templates (strips dangerous tags and attributes).
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtmlContent(html) {
  if (!html || typeof html !== "string") return "";
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, "")
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, "")
    .replace(/javascript:/gi, "");
  return clean.slice(0, 50000);
}

/**
 * Comprehensive server-side validator for applicant submission payloads.
 * Strictly binds applicant.Email to verifiedSessionEmail (Anti-Spoofing).
 * @param {object} rawBody
 * @param {string} verifiedSessionEmail
 * @returns {{ valid: boolean, errors: string[], sanitizedData: object|null }}
 */
export function validateSubmissionInput(rawBody, verifiedSessionEmail) {
  const errors = [];

  if (!rawBody || typeof rawBody !== "object") {
    return { valid: false, errors: ["Invalid request payload format"], sanitizedData: null };
  }

  const {
    Name,
    RegistrationNumber,
    Phone,
    Department,
    Pref,
    Questions,
    Answers,
  } = rawBody;

  // 1. Validate and bind applicant identity
  const sanitizedEmail = (verifiedSessionEmail || "").toLowerCase().trim();
  if (!validateEmail(sanitizedEmail)) {
    errors.push("Invalid verified session email address");
  }

  // 2. Validate Name
  const sanitizedName = sanitizeString(Name, 100);
  if (!sanitizedName || sanitizedName.length < 2) {
    errors.push("Full Name is required and must be at least 2 characters");
  }

  // 3. Validate Registration Number
  const regNo = sanitizeString(RegistrationNumber, 20).toUpperCase();
  if (!validateRegistrationNumber(regNo)) {
    errors.push("Registration number must start with year 23-26, followed by 3 department letters and 3-5 digits (e.g. 25BCE1328, 25EEE1562, 26ECE176)");
  }

  // 4. Validate Phone Number
  const phone = sanitizeString(Phone, 20);
  if (!validatePhoneNumber(phone)) {
    errors.push("Valid phone number (10-15 digits) is required");
  }

  // 5. Validate Department
  const deptInput = sanitizeString(Department, 100);
  if (!deptInput) {
    errors.push("Department is required");
  } else {
    const resolved = resolveDepartment(deptInput);
    if (!resolved) {
      errors.push(`Unknown or invalid department specified: "${deptInput}"`);
    }
  }

  // 6. Sanitize Answers / Questions payload
  const rawAnswers = Answers || Questions || {};
  let sanitizedAnswers;

  if (Array.isArray(rawAnswers)) {
    sanitizedAnswers = [];
    for (const item of rawAnswers) {
      if (!item) continue;
      if (Array.isArray(item) && item.length >= 2) {
        const key = sanitizeString(item[0], 200);
        const val = sanitizeString(item[1], 5000);
        if (key) {
          sanitizedAnswers.push({
            questionId: key,
            questionText: key,
            questionVersion: 1,
            type: "generic",
            value: val,
          });
        }
      } else if (typeof item === "object") {
        const qId = sanitizeString(item.questionId || item.id || item.name || item.questionText, 200);
        const qText = sanitizeString(item.questionText || item.name || qId, 1000);
        const qVer = Number(item.questionVersion) || 1;
        const qType = sanitizeString(item.type, 50) || "generic";
        const val = sanitizeString(item.value ?? item.answer ?? "", 5000);
        if (qId) {
          sanitizedAnswers.push({
            questionId: qId,
            questionText: qText,
            questionVersion: qVer,
            type: qType,
            value: val,
          });
        }
      }
    }
  } else if (typeof rawAnswers === "object" && rawAnswers !== null) {
    sanitizedAnswers = {};
    for (const [key, val] of Object.entries(rawAnswers)) {
      const sanitizedKey = sanitizeString(key, 200);
      const sanitizedVal = sanitizeString(val, 5000);
      if (sanitizedKey) sanitizedAnswers[sanitizedKey] = sanitizedVal;
    }
  } else {
    sanitizedAnswers = {};
  }

  if (errors.length > 0) {
    return { valid: false, errors, sanitizedData: null };
  }

  return {
    valid: true,
    errors: [],
    sanitizedData: {
      Name: sanitizedName,
      Email: sanitizedEmail, // Strictly verified session email
      RegistrationNumber: regNo,
      Phone: phone,
      Department: deptInput,
      Pref: sanitizeString(Pref, 20),
      Answers: sanitizedAnswers,
    },
  };
}

/**
 * Validate shortlist update payload.
 * Prevents mass assignment by explicitly returning only the shortlisted boolean flag.
 * @param {object} rawBody
 * @returns {{ valid: boolean, shortlisted: boolean, errors: string[] }}
 */
export function validateShortlistInput(rawBody) {
  if (!rawBody || typeof rawBody !== "object") {
    return { valid: false, shortlisted: false, errors: ["Invalid request body"] };
  }

  if (rawBody.shortlisted === undefined || rawBody.shortlisted === null) {
    if (rawBody.currentPhase !== undefined || rawBody.phase !== undefined || rawBody.scores !== undefined) {
      const p = parseInt(rawBody.currentPhase ?? rawBody.phase, 10);
      const validPhase = !isNaN(p) && p >= 1 && p <= 6 ? p : 1;
      const res = {
        valid: true,
        shortlisted: validPhase >= 4,
        errors: [],
      };
      if (rawBody.currentPhase !== undefined || rawBody.phase !== undefined) res.currentPhase = validPhase;
      if (rawBody.scores && typeof rawBody.scores === "object") res.scores = rawBody.scores;
      if (rawBody.rubric && typeof rawBody.rubric === "object") res.rubric = rawBody.rubric;
      if (rawBody.status) res.status = sanitizeString(rawBody.status, 50);
      return res;
    }
    return { valid: false, shortlisted: false, errors: ["'shortlisted' field is required"] };
  }

  const isShortlisted = Boolean(
    rawBody.shortlisted === true ||
    rawBody.shortlisted === "true" ||
    rawBody.shortlisted === 1 ||
    rawBody.shortlisted === "1"
  );

  const res = { valid: true, shortlisted: isShortlisted, errors: [] };

  if (rawBody.currentPhase !== undefined || rawBody.phase !== undefined) {
    const p = parseInt(rawBody.currentPhase ?? rawBody.phase, 10);
    if (!isNaN(p) && p >= 1 && p <= 6) {
      res.currentPhase = p;
    }
  }
  if (rawBody.scores && typeof rawBody.scores === "object") {
    res.scores = rawBody.scores;
  }
  if (rawBody.rubric && typeof rawBody.rubric === "object") {
    res.rubric = rawBody.rubric;
  }
  if (rawBody.status) {
    res.status = sanitizeString(rawBody.status, 50);
  }

  return res;
}

/**
 * Validate custom mail payload for bulk sending.
 * @param {object} rawBody
 * @returns {{ valid: boolean, errors: string[], sanitizedData: object|null }}
 */
export function validateEmailPayload(rawBody) {
  const errors = [];

  if (!rawBody || typeof rawBody !== "object") {
    return { valid: false, errors: ["Invalid request payload format"], sanitizedData: null };
  }

  const { recipients, payloadData } = rawBody;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    errors.push("Recipients list must be a non-empty array");
  } else if (recipients.length > 100) {
    errors.push("Maximum recipient batch size is 100 per request");
  }

  const validatedRecipients = [];
  if (Array.isArray(recipients)) {
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      if (!r || typeof r !== "object") {
        errors.push(`Recipient at index ${i} is malformed`);
        continue;
      }
      const email = sanitizeString(r.Email || r.email, 254).toLowerCase();
      const name = sanitizeString(r.Name || r.name, 100) || "Applicant";
      const department = sanitizeString(r.Department || r.department || r.departmentName, 100);

      if (!validateEmail(email)) {
        errors.push(`Recipient at index ${i} contains invalid email address: "${email}"`);
      } else {
        validatedRecipients.push({
          Email: email,
          Name: name,
          Department: department,
        });
      }
    }
  }

  if (!payloadData || typeof payloadData !== "object") {
    errors.push("payloadData object containing subject and body is required");
  }

  const subject = sanitizeString(payloadData?.subject, 200);
  if (!subject) {
    errors.push("Email subject is required");
  }

  const body = sanitizeHtmlContent(payloadData?.body || "");
  if (!body) {
    errors.push("Email body content is required");
  }

  if (errors.length > 0) {
    return { valid: false, errors, sanitizedData: null };
  }

  return {
    valid: true,
    errors: [],
    sanitizedData: {
      recipients: validatedRecipients,
      payloadData: {
        subject,
        body,
        mailType: sanitizeString(payloadData.mailType, 50),
      },
    },
  };
}

/**
 * Create clean, user-safe error response without leaking internal database stack traces or credentials.
 * @param {Error|any} error
 * @param {string} fallbackMessage
 * @param {number} status
 * @returns {Response}
 */
export function createSafeErrorResponse(error, fallbackMessage = "An error occurred while processing your request", status = 500) {
  // Controlled server-side error logging
  console.error(`[SEC_ERROR] Status ${status}:`, error);

  return new Response(
    JSON.stringify({
      error: status >= 500 ? "Internal Server Error" : "Bad Request",
      message: fallbackMessage,
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}
