import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateSubmissionId,
  generateApplicantId,
  resolveDepartment,
  resolveQuestion,
  buildCanonicalSubmission,
  normalizeSubmission,
} from "../lib/submissions.js";
import {
  validateSubmissionInput,
  sanitizeString,
  enforceOwnershipOrAdmin,
} from "../lib/security.js";
import { reviews, QuestionnaireData, GENERAL_QUESTIONS } from "../constants/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("===============================================================");
console.log(" PHASE 6: DEEP BACKEND AUDIT & HIDDEN STORAGE BUG VERIFICATION");
console.log("===============================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         Error: ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. REPRODUCED & FIXED BUG 1: Question Metadata & Custom Question Preservation
// -----------------------------------------------------------------------------
console.log("[AUDIT 1] Dynamic Question Identity & Metadata Preservation");

test("Structured Answers array preserves questionText, version, and type through validation and storage", () => {
  const verifiedEmail = "tester@example.com";
  const rawPayload = {
    Name: "Alice Tester",
    RegistrationNumber: "25BCE1122",
    Phone: "9876543210",
    Department: "∑_ApZ3V_gh",
    Answers: [
      {
        questionId: "q_app_01",
        questionText: "What mobile frameworks have you used?",
        questionVersion: 2,
        type: "long-text",
        value: "React Native and Flutter with native Swift bridges",
      },
      {
        questionId: "q_custom_new_01",
        questionText: "Please describe your distributed consensus experience.",
        questionVersion: 3,
        type: "code",
        value: "Implemented Raft in Rust",
      },
    ],
  };

  const { valid, sanitizedData } = validateSubmissionInput(rawPayload, verifiedEmail);
  assert.ok(valid, "Validation should pass");
  assert.ok(sanitizedData.Answers, "Sanitized data must contain Answers array");

  const canonical = buildCanonicalSubmission({
    applicant: sanitizedData,
    departmentIdentifier: sanitizedData.Department,
    answersInput: sanitizedData.Answers,
  });

  const customAns = canonical.answers.find((a) => a.questionId === "q_custom_new_01");
  assert.ok(customAns, "Custom question must be stored in canonical answers");
  assert.equal(
    customAns.questionText,
    "Please describe your distributed consensus experience.",
    "Custom question text must NOT be overwritten with questionId"
  );
  assert.equal(customAns.questionVersion, 3, "Question version must be preserved as 3");
  assert.equal(customAns.type, "code", "Question type must be preserved as code");
  assert.equal(customAns.value, "Implemented Raft in Rust");
});

// -----------------------------------------------------------------------------
// 2. REPRODUCED & FIXED BUG 2: Submission ID Determinism Across Name and UUID
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 2] Submission ID Determinism Across Name and UUID");

test("generateSubmissionId produces identical ID whether given Department Name or Department UUID", () => {
  const email = "bob@example.com";
  const deptName = "∑_ApZ3V_gh";
  const deptId = "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6";

  const idFromName = generateSubmissionId(email, deptName);
  const idFromUUID = generateSubmissionId(email, deptId);

  assert.equal(
    idFromName,
    idFromUUID,
    `Submission IDs must match. Got fromName: "${idFromName}", fromUUID: "${idFromUUID}"`
  );
  assert.ok(idFromName.includes("339f0f8a_72f2_44b9_92ab_2b0d4dcfa0f6"), "Should use stable canonical UUID");
});

// -----------------------------------------------------------------------------
// 3. AUDIT 3: Question Reordering Invariance
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 3] Question Reordering Invariance");

test("Answers maintain correct question mapping when array order is permuted", () => {
  const email = "reorder@example.com";
  const dept = "∑_ApZ3V_gh";

  const order1 = [
    { questionId: "q_app_01", questionText: "Q1", value: "Answer 1" },
    { questionId: "q_app_02", questionText: "Q2", value: "Answer 2" },
    { questionId: "q_app_03", questionText: "Q3", value: "Answer 3" },
  ];

  const order2 = [
    { questionId: "q_app_03", questionText: "Q3", value: "Answer 3" },
    { questionId: "q_app_01", questionText: "Q1", value: "Answer 1" },
    { questionId: "q_app_02", questionText: "Q2", value: "Answer 2" },
  ];

  const sub1 = buildCanonicalSubmission({
    applicant: { Name: "Test", Email: email, RegistrationNumber: "25BCE1111", Phone: "9876543210" },
    departmentIdentifier: dept,
    answersInput: order1,
  });

  const sub2 = buildCanonicalSubmission({
    applicant: { Name: "Test", Email: email, RegistrationNumber: "25BCE1111", Phone: "9876543210" },
    departmentIdentifier: dept,
    answersInput: order2,
  });

  assert.equal(sub1.answers.find((a) => a.questionId === "q_app_01").value, "Answer 1");
  assert.equal(sub2.answers.find((a) => a.questionId === "q_app_01").value, "Answer 1");
  assert.equal(sub1.answers.find((a) => a.questionId === "q_app_03").value, "Answer 3");
  assert.equal(sub2.answers.find((a) => a.questionId === "q_app_03").value, "Answer 3");
});

// -----------------------------------------------------------------------------
// 4. AUDIT 4: Question Addition & Backward Compatibility
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 4] Question Addition & Backward Compatibility");

test("Adding new questions to questionnaire does not corrupt legacy or existing submissions", () => {
  const legacyDoc = {
    _id: "legacy_001",
    Name: "Legacy User",
    Email: "legacy@example.com",
    RegistrationNumber: "23BCE9999",
    Department: "∑_ApZ3V_gh",
    Questions: {
      "poAx ZQPF iL0C *$ Peq# 2qu43N8V0TC8 c3^ pKl1ypL *D@DRew tB Dm2 pwS#kXdV5XM?": "Legacy Mobile Answer",
    },
  };

  const normalized = normalizeSubmission(legacyDoc);
  assert.equal(normalized.schemaVersion, 1);
  assert.equal(normalized.applicant.name, "Legacy User");
  assert.equal(normalized.answers.length, 1);
  assert.equal(normalized.answers[0].questionId, "q_app_01");
  assert.equal(normalized.answers[0].value, "Legacy Mobile Answer");
});

// -----------------------------------------------------------------------------
// 5. AUDIT 5: Multi-User Response Isolation
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 5] Multi-User Response Isolation");

test("Multiple users answering the exact same question ID do not collide or leak answers", () => {
  const userA = buildCanonicalSubmission({
    applicant: { Name: "Alice", Email: "alice@example.com", RegistrationNumber: "25BCE1001", Phone: "9876543210" },
    departmentIdentifier: "∑_ApZ3V_gh",
    answersInput: [{ questionId: "q_app_01", value: "Alice's Mobile Experience" }],
  });

  const userB = buildCanonicalSubmission({
    applicant: { Name: "Bob", Email: "bob@example.com", RegistrationNumber: "25BCE1002", Phone: "9876543211" },
    departmentIdentifier: "∑_ApZ3V_gh",
    answersInput: [{ questionId: "q_app_01", value: "Bob's Mobile Experience" }],
  });

  const userC = buildCanonicalSubmission({
    applicant: { Name: "Carol", Email: "carol@example.com", RegistrationNumber: "25BCE1003", Phone: "9876543212" },
    departmentIdentifier: "∑_ApZ3V_gh",
    answersInput: [{ questionId: "q_app_01", value: "Carol's Mobile Experience" }],
  });

  assert.notEqual(userA.submissionId, userB.submissionId);
  assert.notEqual(userB.submissionId, userC.submissionId);
  assert.equal(userA.answers[0].value, "Alice's Mobile Experience");
  assert.equal(userB.answers[0].value, "Bob's Mobile Experience");
  assert.equal(userC.answers[0].value, "Carol's Mobile Experience");
});

// -----------------------------------------------------------------------------
// 6. AUDIT 6: Multi-Application Cross-Pollination Isolation
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 6] Multi-Application Cross-Pollination Isolation");

test("Same user submitting 2 departments retains isolated answers per submission", () => {
  const email = "multiapp@example.com";

  const subDept1 = buildCanonicalSubmission({
    applicant: { Name: "Multi User", Email: email, RegistrationNumber: "25BCE7777", Phone: "9876543210" },
    departmentIdentifier: "∑_ApZ3V_gh",
    answersInput: [{ questionId: "q_app_01", value: "Mobile Native Answer" }],
  });

  const subDept2 = buildCanonicalSubmission({
    applicant: { Name: "Multi User", Email: email, RegistrationNumber: "25BCE7777", Phone: "9876543210" },
    departmentIdentifier: "∫_BkY2C_xu",
    answersInput: [{ questionId: "q_block_01", value: "Blockchain Solidity Answer" }],
  });

  assert.notEqual(subDept1.submissionId, subDept2.submissionId);
  assert.equal(subDept1.applicantId, subDept2.applicantId);
  assert.equal(subDept1.departmentId, "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6");
  assert.equal(subDept2.departmentId, "6a89c4e2-7b19-4f32-821e-9821a41b5201");
  assert.equal(subDept1.answers[0].value, "Mobile Native Answer");
  assert.equal(subDept2.answers[0].value, "Blockchain Solidity Answer");
});

// -----------------------------------------------------------------------------
// 7. AUDIT 7: Response Editing & Update Invariance
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 7] Response Editing & Update Invariance");

test("Updating an answer replaces value for matching questionId without duplicate entries", () => {
  const email = "updater@example.com";
  const dept = "∑_ApZ3V_gh";

  const originalSub = buildCanonicalSubmission({
    applicant: { Name: "Update Tester", Email: email, RegistrationNumber: "25BCE5555", Phone: "9876543210" },
    departmentIdentifier: dept,
    answersInput: [
      { questionId: "q_app_01", questionText: "Q1", value: "Initial Draft" },
      { questionId: "q_app_02", questionText: "Q2", value: "Initial Q2" },
    ],
  });

  assert.equal(originalSub.answers.length, 2);
  assert.equal(originalSub.answers[0].value, "Initial Draft");

  // Simulate updating Q1 answer
  const updatedAnswers = originalSub.answers.map((a) =>
    a.questionId === "q_app_01" ? { ...a, value: "Final Refined Answer" } : a
  );

  const updatedSub = buildCanonicalSubmission({
    applicant: { Name: "Update Tester", Email: email, RegistrationNumber: "25BCE5555", Phone: "9876543210" },
    departmentIdentifier: dept,
    answersInput: updatedAnswers,
    existingStatus: originalSub.status,
  });

  assert.equal(updatedSub.answers.length, 2, "Must not create duplicate response objects");
  assert.equal(updatedSub.answers.find((a) => a.questionId === "q_app_01").value, "Final Refined Answer");
  assert.equal(updatedSub.answers.find((a) => a.questionId === "q_app_02").value, "Initial Q2");
});

// -----------------------------------------------------------------------------
// 8. AUDIT 8: Security, Ownership & IDOR Protection
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 8] Security, Ownership & IDOR Protection");

test("enforceOwnershipOrAdmin allows owner and admin, strictly forbids cross-applicant access", () => {
  const applicantUser = { email: "student@example.com", role: "user" };
  const adminUser = { email: "admin@example.com", role: "admin" };

  // Owner accessing own submission
  const ownerCheck = enforceOwnershipOrAdmin(applicantUser, "student@example.com");
  assert.equal(ownerCheck.allowed, true);

  // Cross-applicant access attempt
  const idorCheck = enforceOwnershipOrAdmin(applicantUser, "victim@example.com");
  assert.equal(idorCheck.allowed, false);
  assert.equal(idorCheck.response.status, 403);

  // Admin accessing any applicant's submission
  const adminCheck = enforceOwnershipOrAdmin(adminUser, "victim@example.com");
  assert.equal(adminCheck.allowed, true);
});

// -----------------------------------------------------------------------------
// 9. AUDIT 9: Normalization Idempotency & Roundtrip Completeness
// -----------------------------------------------------------------------------
console.log("\n[AUDIT 9] Normalization Idempotency & Roundtrip Completeness");

test("normalizeSubmission is idempotent on modern Schema v2 documents", () => {
  const original = buildCanonicalSubmission({
    applicant: {
      Name: "Carol King",
      Email: "carol@example.com",
      RegistrationNumber: "25BCE8888",
      Phone: "9876543210",
    },
    departmentIdentifier: "∑_ApZ3V_gh",
    answersInput: [
      { questionId: "q_general_why_join", value: "Great community" },
      { questionId: "q_app_01", value: "React Native expert" },
    ],
  });

  const normalized1 = normalizeSubmission(original);
  const normalized2 = normalizeSubmission(normalized1);

  assert.equal(normalized1.submissionId, normalized2.submissionId);
  assert.equal(normalized1.answers.length, normalized2.answers.length);
  assert.equal(normalized1.answers[0].value, normalized2.answers[0].value);
  assert.equal(normalized1.answers[1].value, normalized2.answers[1].value);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n===============================================================");
console.log(` AUDIT RESULTS: ${passed} passed, ${failed} failed`);
console.log("===============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n>> ALL PHASE 6 AUDIT & INVARIANT CHECKS PASSED WITH 100% SUCCESS! <<\n");
}
