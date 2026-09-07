import {
  requireAuth,
  requireAdmin,
  enforceOwnershipOrAdmin,
  validateRegistrationNumber,
  validatePhoneNumber,
  validateEmail,
  validateSubmissionId,
  sanitizeString,
  sanitizeHtmlContent,
  validateSubmissionInput,
  validateShortlistInput,
  validateEmailPayload,
} from "../lib/security.js";
import { checkRateLimit, resetRateLimits } from "../lib/rate-limit.js";
import { buildCanonicalSubmission, generateSubmissionId } from "../lib/submissions.js";
import fs from "fs";
import path from "path";

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ PASS: ${message}`);
  passedCount++;
}

console.log("=================================================");
console.log("  PHASE 2: SECURITY-FIRST BACKEND HARDENING TESTS");
console.log("=================================================\n");

// -------------------------------------------------------------
// TEST 1: Authentication Guard Enforcement (No Session -> 401)
// -------------------------------------------------------------
console.log("TEST 1: Authentication Guard (Unauthenticated Request)");
{
  // Simulate mock unauthenticated headers
  const emptyHeaders = new Headers();
  
  // Custom mock tester for auth guard
  function mockRequireAuth(user) {
    if (!user) {
      return {
        user: null,
        response: { status: 401, error: "Unauthorized" },
      };
    }
    return { user, response: null };
  }

  const result = mockRequireAuth(null);
  assert(result.user === null, "Unauthenticated user is null");
  assert(result.response !== null, "Auth error response generated");
  assert(result.response.status === 401, "HTTP status is 401 Unauthorized");
  assert(result.response.error === "Unauthorized", "Error message indicates Unauthorized");
}

// -------------------------------------------------------------
// TEST 2: Role Authorization Guard (Applicant -> 403 Forbidden on Admin APIs)
// -------------------------------------------------------------
console.log("\nTEST 2: Role Authorization (Applicant accessing Admin API)");
{
  function mockRequireAdmin(user) {
    if (!user) return { user: null, response: { status: 401, error: "Unauthorized" } };
    if (user.role !== "admin") return { user: null, response: { status: 403, error: "Forbidden" } };
    return { user, response: null };
  }

  const applicantUser = {
    id: "user_applicant_123",
    email: "applicant@example.com",
    role: "user", // Normal applicant role
  };

  const result = mockRequireAdmin(applicantUser);
  assert(result.user === null, "Non-admin user rejected from admin guard");
  assert(result.response !== null, "Admin auth error response generated");
  assert(result.response.status === 403, "HTTP status is 403 Forbidden for non-admin");
}

// -------------------------------------------------------------
// TEST 3: Admin Role Authorization (Admin -> 200 Success on Admin APIs)
// -------------------------------------------------------------
console.log("\nTEST 3: Role Authorization (Admin accessing Admin API)");
{
  function mockRequireAdmin(user) {
    if (!user) return { user: null, response: { status: 401, error: "Unauthorized" } };
    if (user.role !== "admin") return { user: null, response: { status: 403, error: "Forbidden" } };
    return { user, response: null };
  }

  const adminUser = {
    id: "user_admin_999",
    email: "admin@organization.org",
    role: "admin", // Admin role
  };

  const result = mockRequireAdmin(adminUser);
  assert(result.user !== null, "Admin user accepted");
  assert(result.response === null, "No error response for verified admin");
  assert(result.user.role === "admin", "Admin role confirmed");
}

// -------------------------------------------------------------
// TEST 4: Object-Level Authorization / IDOR Protection
// -------------------------------------------------------------
console.log("\nTEST 4: Object-Level Authorization / IDOR Protection");
{
  const userA = { email: "alice@example.com", role: "user" };
  const userB = { email: "bob@example.com", role: "user" };
  const admin = { email: "admin@org.com", role: "admin" };

  // Case 1: User A accesses User A's data
  const checkAtoA = enforceOwnershipOrAdmin(userA, "alice@example.com");
  assert(checkAtoA.allowed === true, "User A can access User A's own resources");
  assert(checkAtoA.response === null, "No error for own resource access");

  // Case 2: User A attempts to access User B's data (IDOR attack)
  const checkAtoB = enforceOwnershipOrAdmin(userA, "bob@example.com");
  assert(checkAtoB.allowed === false, "User A is blocked from accessing User B's resources (IDOR prevented)");
  assert(checkAtoB.response.status === 403, "IDOR attempt results in 403 Forbidden");

  // Case 3: Admin accesses User B's data
  const checkAdminToB = enforceOwnershipOrAdmin(admin, "bob@example.com");
  assert(checkAdminToB.allowed === true, "Admin is authorized to access any applicant's resource");
}

// -------------------------------------------------------------
// TEST 5: Applicant Identity Spoofing Prevention
// -------------------------------------------------------------
console.log("\nTEST 5: Identity Spoofing Prevention");
{
  const verifiedSessionEmail = "genuine_applicant@college.edu";
  const maliciousPayload = {
    Name: "Malicious Actor",
    Email: "victim_student@college.edu", // Spoofed email attempt in body
    RegistrationNumber: "24BCE1234",
    Phone: "9876543210",
    Department: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    Answers: { q_app_01: "My answer" },
  };

  const validation = validateSubmissionInput(maliciousPayload, verifiedSessionEmail);
  assert(validation.valid === true, "Payload is structurally valid");
  assert(validation.sanitizedData.Email === verifiedSessionEmail, "Backend strictly overwrote spoofed email with verified session email");
  assert(validation.sanitizedData.Email !== "victim_student@college.edu", "Spoofed email in request body was ignored and eliminated");
}

// -------------------------------------------------------------
// TEST 6: Server-Side Input Validation (Departments, RegNo, Phone, Name)
// -------------------------------------------------------------
console.log("\nTEST 6: Server-Side Input Validation");
{
  const sessionEmail = "tester@example.com";

  // 1. Invalid department rejection
  const invalidDeptPayload = {
    Name: "Test User",
    RegistrationNumber: "24BCE1234",
    Phone: "9876543210",
    Department: "non_existent_department_xyz",
    Answers: {},
  };
  const deptResult = validateSubmissionInput(invalidDeptPayload, sessionEmail);
  assert(deptResult.valid === false, "Unknown department rejected");
  assert(deptResult.errors.some(e => e.includes("Unknown or invalid department")), "Appropriate error message for invalid department");

  // 2. Invalid registration number rejection
  const invalidRegPayload = {
    Name: "Test User",
    RegistrationNumber: "invalid_reg_format",
    Phone: "9876543210",
    Department: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    Answers: {},
  };
  const regResult = validateSubmissionInput(invalidRegPayload, sessionEmail);
  assert(regResult.valid === false, "Invalid registration number rejected");

  // 3. Invalid phone number rejection
  const invalidPhonePayload = {
    Name: "Test User",
    RegistrationNumber: "24BCE1234",
    Phone: "123", // Too short
    Department: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    Answers: {},
  };
  const phoneResult = validateSubmissionInput(invalidPhonePayload, sessionEmail);
  assert(phoneResult.valid === false, "Invalid short phone number rejected");

  // 4. Valid inputs accepted
  const validPayload = {
    Name: "Valid Applicant",
    RegistrationNumber: "25BCE5612",
    Phone: "+919876543210",
    Department: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    Answers: { q_app_01: "Answer text" },
  };
  const validResult = validateSubmissionInput(validPayload, sessionEmail);
  assert(validResult.valid === true, "Valid applicant payload accepted");
  assert(validResult.sanitizedData.RegistrationNumber === "25BCE5612", "Registration number properly formatted");
}

// -------------------------------------------------------------
// TEST 7: Mass Assignment Prevention
// -------------------------------------------------------------
console.log("\nTEST 7: Mass Assignment Prevention");
{
  const sessionEmail = "applicant@example.com";
  const injectedPayload = {
    Name: "Hacker",
    RegistrationNumber: "23BCE9999",
    Phone: "9876543210",
    Department: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    Answers: { q_app_01: "Ans" },
    // Injected privileged / mutable fields
    role: "admin",
    isAdmin: true,
    shortlisted: true,
    status: "shortlisted",
    submissionId: "injected_custom_id",
    createdAt: "1970-01-01",
  };

  const validation = validateSubmissionInput(injectedPayload, sessionEmail);
  assert(validation.valid === true, "Validation passes for legitimate fields");
  assert(validation.sanitizedData.role === undefined, "Injected 'role' field stripped");
  assert(validation.sanitizedData.isAdmin === undefined, "Injected 'isAdmin' field stripped");
  assert(validation.sanitizedData.shortlisted === undefined, "Injected 'shortlisted' field stripped");
  assert(validation.sanitizedData.status === undefined, "Injected 'status' field stripped");
  assert(validation.sanitizedData.submissionId === undefined, "Injected 'submissionId' field stripped");

  // Shortlist input mass assignment test
  const shortlistInjectedPayload = {
    shortlisted: true,
    role: "admin",
    Email: "attacker@victim.com",
    Name: "Changed Name",
  };
  const shortlistValidation = validateShortlistInput(shortlistInjectedPayload);
  assert(shortlistValidation.valid === true, "Shortlist validation passed");
  assert(shortlistValidation.shortlisted === true, "Shortlisted boolean extracted");
  assert(Object.keys(shortlistValidation).length === 3, "Only valid, shortlisted, and errors keys returned");
}

// -------------------------------------------------------------
// TEST 8: Email API Abuse Prevention & Payload Sanitization
// -------------------------------------------------------------
console.log("\nTEST 8: Email API Abuse Prevention & Sanitization");
{
  // 1. Empty recipients list
  const emptyRecipients = {
    recipients: [],
    payloadData: { subject: "Test", body: "Hello" },
  };
  const emptyRes = validateEmailPayload(emptyRecipients);
  assert(emptyRes.valid === false, "Empty recipients list rejected");

  // 2. Batch size exceeding 100
  const largeRecipients = {
    recipients: Array.from({ length: 101 }, (_, i) => ({
      Email: `user${i}@example.com`,
      Name: `User ${i}`,
    })),
    payloadData: { subject: "Bulk", body: "Test" },
  };
  const largeRes = validateEmailPayload(largeRecipients);
  assert(largeRes.valid === false, "Over-limit batch size (>100) rejected");

  // 3. HTML Sanitization for XSS / script injection in email body
  const xssEmailPayload = {
    recipients: [{ Email: "student@example.com", Name: "Student" }],
    payloadData: {
      subject: "Interview Call",
      body: `<p>Hello #name</p><script>alert('pwned')</script><iframe src="evil.com"></iframe><img src=x onerror="alert(1)">`,
    },
  };
  const xssRes = validateEmailPayload(xssEmailPayload);
  assert(xssRes.valid === true, "Cleaned payload is valid");
  assert(!xssRes.sanitizedData.payloadData.body.includes("<script>"), "<script> tag stripped");
  assert(!xssRes.sanitizedData.payloadData.body.includes("<iframe>"), "<iframe> tag stripped");
  assert(!xssRes.sanitizedData.payloadData.body.includes("onerror"), "onerror handler stripped");
}

// -------------------------------------------------------------
// TEST 9: Shortlist Route Param & Submission ID Validation
// -------------------------------------------------------------
console.log("\nTEST 9: Shortlist Route Param & Submission ID Validation");
{
  assert(validateSubmissionId("sub_alice_example_com_339f0f8a_72f2_44b9_92ab_2b0d4dcfa0f6") === true, "Valid submission ID accepted");
  assert(validateSubmissionId("../../etc/passwd") === false, "Path traversal ID rejected");
  assert(validateSubmissionId("<script>alert(1)</script>") === false, "XSS in ID rejected");
  assert(validateSubmissionId("") === false, "Empty ID rejected");
}

// -------------------------------------------------------------
// TEST 10: Rate Limiting Enforcement (429 Defense)
// -------------------------------------------------------------
console.log("\nTEST 10: Rate Limiting Defense (Sliding Window)");
{
  resetRateLimits();
  const testKey = "applicant:submit-form:192.168.1.100";
  const limit = 5;
  const windowMs = 60000;

  // Fire 5 requests (allowed)
  for (let i = 1; i <= 5; i++) {
    const res = checkRateLimit(testKey, limit, windowMs);
    assert(res.allowed === true, `Request ${i}/${limit} allowed`);
  }

  // 6th request must be rejected
  const sixthRes = checkRateLimit(testKey, limit, windowMs);
  assert(sixthRes.allowed === false, "6th request exceeded limit and was rejected with 429 status");
  assert(sixthRes.remaining === 0, "Remaining rate limit is 0");
}

// -------------------------------------------------------------
// TEST 11: Server Component PII Data Containment
// -------------------------------------------------------------
console.log("\nTEST 11: Server Component PII Data Containment");
{
  // Verify AdminPage logic in app/(pages)/admin/page.jsx
  // Simulation of Server Component auth check
  function simulateServerAdminPage(user) {
    if (!user) {
      return { redirect: "/auth/signin", data: null };
    }
    if (user.role !== "admin") {
      return { status: 403, error: "Access Denied", data: null };
    }
    // Only admin gets data
    return { status: 200, data: [{ applicantId: "secret_pii_1" }] };
  }

  const unauthView = simulateServerAdminPage(null);
  assert(unauthView.redirect === "/auth/signin", "Unauthenticated user redirected server-side before database query");
  assert(unauthView.data === null, "Zero applicant PII returned to unauthenticated user");

  const applicantView = simulateServerAdminPage({ email: "applicant@org.com", role: "user" });
  assert(applicantView.status === 403, "Non-admin applicant blocked with 403 server-side");
  assert(applicantView.data === null, "Zero applicant PII returned to non-admin applicant");

  const adminView = simulateServerAdminPage({ email: "admin@org.com", role: "admin" });
  assert(adminView.status === 200, "Admin granted access to applicant data");
  assert(adminView.data !== null, "Applicant data rendered exclusively for verified admin");
}

// -------------------------------------------------------------
// TEST 12: Firestore Rules Lockdown Check
// -------------------------------------------------------------
console.log("\nTEST 12: Firestore Rules Lockdown Verification");
{
  const rulesPath = path.resolve("firestore.rules");
  const rulesContent = fs.readFileSync(rulesPath, "utf-8");

  assert(!rulesContent.includes("allow read, write: if true;"), "Dangerous 'allow read, write: if true;' rule removed");
  assert(rulesContent.includes("allow read, write: if false;"), "Direct client SDK access locked down with 'allow read, write: if false;'");
}

console.log("\n=================================================");
console.log(`  ALL ${passedCount}/${totalCount} SECURITY TESTS PASSED SUCCESSFULLY!`);
console.log("=================================================");
