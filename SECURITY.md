# Security Architecture & Trust Boundary Specification

## 1. Overview & Trust Philosophy

This document outlines the security architecture and defensive controls implemented across the recruitment portal. The system adheres strictly to the core principle:

> **NEVER TRUST THE CLIENT.**

All privileged operations, authentication checks, role authorizations, input validations, and database mutations are executed and verified on the server before interacting with Firestore or external services.

---

## 2. Authentication & Identity Management

### User Identification
- Users authenticate via Better Auth session management backed by Firestore (`better-auth` + `better-auth-firestore`).
- Upon authentication, a secure HTTP-only cookie is issued to the client.
- The server extracts and validates the session on every request using `auth.api.getSession({ headers })` inside [`lib/security.js`](file:///D:/Archive/lib/security.js).

### Anti-Identity-Spoofing
- In previous versions, the backend trusted the client-supplied `Email` field in request payloads.
- **Defensive Fix**: In [`app/api/submit-form/route.js`](file:///D:/Archive/app/api/submit-form/route.js), the applicant's identity is strictly stamped from the verified session (`session.user.email`). Any client-supplied `Email` in `req.body` is ignored and overwritten, making applicant impersonation mathematically impossible.

---

## 3. Authorization & Role Enforcement

### Centralized Security Guards
Server-side authorization is encapsulated in reusable guards in [`lib/security.js`](file:///D:/Archive/lib/security.js):

1. **`requireAuth(headers)`**:
   - Ensures caller has an active, valid session.
   - Rejects unauthenticated requests with `401 Unauthorized`.

2. **`requireAdmin(headers)`**:
   - Validates session AND checks that `session.user.role === "admin"`.
   - Rejects unauthenticated requests with `401 Unauthorized`.
   - Rejects authenticated regular applicants with `403 Forbidden`.

3. **`enforceOwnershipOrAdmin(sessionUser, targetEmail)`**:
   - Enforces object-level authorization (IDOR prevention).
   - Allows access if `sessionUser.role === 'admin'` OR `sessionUser.email === targetEmail`.
   - Rejects cross-user data tampering with `403 Forbidden`.

### Server Component Authorization & PII Protection
- The Admin Page at [`app/(pages)/admin/page.jsx`](file:///D:/Archive/app/(pages)/admin/page.jsx) verifies authentication and admin role *on the server* prior to querying Firestore.
- Unauthenticated requests are redirected immediately to `/auth/signin`.
- Non-admin applicants receive a server-rendered `403 Access Denied` view.
- **Zero applicant PII is ever rendered into React Server Component payloads or HTML sent to unauthorized callers.**

---

## 4. Input Validation & Mass Assignment Defenses

All incoming request fields are validated and sanitized server-side:

| Field | Validation Rule | Error Behavior |
|---|---|---|
| `Name` | String, 2–100 chars, stripped of control characters | 400 Bad Request |
| `Email` | RFC 5322 compliant, max 254 chars, lowercased & trimmed | Stamped from verified session |
| `RegistrationNumber` | Regex `/^\d{2}[A-Z]{3}\d{4}$/` (e.g. `25BCE5612`) | 400 Bad Request |
| `Phone` | Validated 10–15 digit phone format (`/^\+?[0-9]{10,15}$/`) | 400 Bad Request |
| `Department` | Must resolve to a valid registered department in catalog | 400 Bad Request |
| `Answers` | Sanitized key-value / array map (max 5,000 chars per answer) | 400 Bad Request if malformed |
| `shortlisted` | Strict boolean coercion (`true` / `false`) | 400 Bad Request |
| `submissionId` | Regex `/^[a-zA-Z0-9_.-]{1,128}$/` (prevents path traversal) | 400 Bad Request |

### Mass Assignment Prevention
- In [`app/api/shortlist/[id]/route.js`](file:///D:/Archive/app/api/shortlist/%5Bid%5D/route.js), the update payload is explicitly whitelisted to `{ shortlisted, status, updatedAt }`. Injected fields (`role`, `Email`, `Name`, etc.) are dropped.
- In [`app/api/submit-form/route.js`](file:///D:/Archive/app/api/submit-form/route.js), arbitrary object spreading is removed; only validated schema fields are passed to `buildCanonicalSubmission()`.

---

## 5. Rate Limiting Strategy

Endpoint rate limiting is managed via an in-memory sliding window bucket in [`lib/rate-limit.js`](file:///D:/Archive/lib/rate-limit.js):

- **Form Submission (`POST /api/submit-form`)**: 5 requests / 60s per applicant.
- **Email Dispatch (`POST /api/send-email`)**: 10 requests / 60s per admin.
- **Applicant Data Queries (`GET /api/check-*`, `GET /api/get-submissions`)**: 30 requests / 60s.
- **Admin Shortlist & Retrieval (`GET /api/admin/applicants`, `PATCH /api/shortlist/*`)**: 60 requests / 60s.

When a client exceeds the threshold, the server immediately returns `429 Too Many Requests` along with a standard `Retry-After` header.

---

## 6. Email API Abuse Prevention

The bulk email API at [`app/api/send-email/route.js`](file:///D:/Archive/app/api/send-email/route.js) is protected against open relay abuse:
- Requires verified admin session (`requireAdmin`).
- Validates recipient list (non-empty array, max 100 recipients per batch).
- Validates each recipient's email address and name.
- Sanitizes email subject (max 200 chars) and HTML body (strips `<script>`, `<iframe>`, `object`, `embed`, `javascript:` URIs, and inline `onerror`/`onload` handlers).
- Includes resilient department name fallback mapping to prevent server crashes on legacy department titles.

---

## 7. Firestore Security Rules

### Server-Mediated Architecture
The application uses the Firebase Admin SDK (`firebase-admin`) on the server to execute all database queries and atomic transactions.

To ensure clients cannot bypass server-side validation and business rules using client SDKs, [`firestore.rules`](file:///D:/Archive/firestore.rules) strictly denies all direct client-side operations:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 8. Error Handling & Data Leakage Prevention

- Server exceptions are caught and sanitized via `createSafeErrorResponse()`.
- Internal stack traces, database query strings, and credential details are logged exclusively to controlled server stdout/stderr and are never exposed in JSON responses.
- Responses return semantic HTTP status codes:
  - `400`: Bad Request / Validation Failure
  - `401`: Unauthenticated
  - `403`: Unauthorized / Forbidden / Deadline Expired
  - `404`: Resource Not Found
  - `409`: Conflict / Duplicate Application
  - `429`: Rate Limit Exceeded
  - `500`: Internal Server Error

---

## 9. Known Limitations & Production Recommendations

1. **Distributed Rate Limiting**: The current sliding-window rate limiter runs in Node.js server memory. In multi-instance serverless deployments (e.g., Vercel / AWS Lambda with auto-scaling), rate-limiting buckets should be backed by a centralized Redis instance (e.g. Upstash Redis).
2. **Email Provider Setup**: Ensure production DNS records (SPF, DKIM, DMARC) are configured for the sending domain to prevent outgoing mail from being classified as spam.
3. **Audit Logging**: For compliance and forensics, consider recording all admin actions (shortlisting, bulk emailing, role modifications) in an immutable audit log collection.
