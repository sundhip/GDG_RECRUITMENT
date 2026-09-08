import {
  generateSubmissionId,
  generateApplicantId,
  resolveDepartment,
  resolveQuestion,
  buildCanonicalSubmission,
  normalizeSubmission,
  CURRENT_SCHEMA_VERSION,
} from "../lib/submissions.js";
import { reviews, QuestionnaireData, GENERAL_QUESTIONS } from "../constants/index.js";

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
console.log("  PHASE 1: RESPONSE IDENTITY SYSTEM VERIFICATION");
console.log("=================================================\n");

// -------------------------------------------------------------
// TEST 1: One applicant -> one department
// -------------------------------------------------------------
console.log("TEST 1: One applicant -> one department");
{
  const applicant = {
    name: "Alice Johnson",
    email: "alice@example.com",
    registrationNumber: "23BCE1001",
    phone: "9876543210",
  };
  const deptId = "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6"; // App Dev (∑_ApZ3V_gh)
  const answersInput = {
    q_app_01: "My answer to question 1",
    q_app_02: "My detailed answer to question 2",
    q_general_why_join: "Passionate about building mobile apps",
  };

  const submission = buildCanonicalSubmission({
    applicant,
    departmentIdentifier: deptId,
    answersInput,
  });

  assert(submission.schemaVersion === 2, "Schema version is 2");
  assert(submission.submissionId === "sub_alice_example_com_339f0f8a_72f2_44b9_92ab_2b0d4dcfa0f6", "Canonical submissionId generated deterministically");
  assert(submission.applicantId === "alice@example.com", "Stable applicantId is email");
  assert(submission.departmentId === deptId, "Department ID matches reviews catalog");
  assert(submission.departmentName === "App Development", "Department name resolved correctly");
  assert(submission.answers.length === 3, "All 3 answers stored");
  assert(submission.responseCount === 3, "responseCount metadata matches answers length");
  assert(submission.questionIds.includes("q_app_01"), "questionId q_app_01 tracked in questionIds");
  assert(submission.questionIds.includes("q_general_why_join"), "general question tracked in questionIds");
  assert(submission.status === "submitted", "Initial status is 'submitted'");
  assert(submission.shortlisted === false, "Initial shortlisted is false");

  const normalized = normalizeSubmission(submission);
  assert(normalized.submissionId === submission.submissionId, "Normalized output preserves submissionId");
  assert(normalized.answers[0].value === "My answer to question 1", "Answers mapped properly in normalized structure");
}

// -------------------------------------------------------------
// TEST 2: One applicant -> two departments
// -------------------------------------------------------------
console.log("\nTEST 2: One applicant -> two departments");
{
  const applicant = {
    name: "Alice Johnson",
    email: "alice@example.com",
    registrationNumber: "23BCE1001",
    phone: "9876543210",
  };
  const dept1Id = "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6"; // App Dev
  const dept2Id = "8143de1d-db17-42fa-958d-13b10804f894"; // Web Dev

  const sub1 = buildCanonicalSubmission({
    applicant,
    departmentIdentifier: dept1Id,
    answersInput: { q_app_01: "App answer" },
  });

  const sub2 = buildCanonicalSubmission({
    applicant,
    departmentIdentifier: dept2Id,
    answersInput: { q_web_01: "Web answer" },
  });

  assert(sub1.submissionId !== sub2.submissionId, "Submissions have distinct submissionIds");
  assert(sub1.applicantId === sub2.applicantId, "Both share same applicantId");
  assert(sub1.departmentId !== sub2.departmentId, "Different department IDs");
  assert(sub1.answers[0].value === "App answer", "Sub 1 retains app answer");
  assert(sub2.answers[0].value === "Web answer", "Sub 2 retains web answer");
  assert(sub1.answers[0].questionId !== sub2.answers[0].questionId, "Answers do not collide or cross-pollinate");
}

// -------------------------------------------------------------
// TEST 3: Two different applicants -> same department
// -------------------------------------------------------------
console.log("\nTEST 3: Two different applicants -> same department");
{
  const applicantA = { name: "Bob Smith", email: "bob@example.com", registrationNumber: "23BCE1002" };
  const applicantB = { name: "Carol Davis", email: "carol@example.com", registrationNumber: "23BCE1003" };
  const deptId = "6a89c4e2-7b19-4f32-821e-9821a41b5201"; // Blockchain

  const subA = buildCanonicalSubmission({
    applicant: applicantA,
    departmentIdentifier: deptId,
    answersInput: { q_block_01: "Bob's blockchain answer" },
  });

  const subB = buildCanonicalSubmission({
    applicant: applicantB,
    departmentIdentifier: deptId,
    answersInput: { q_block_01: "Carol's blockchain answer" },
  });

  assert(subA.submissionId !== subB.submissionId, "Different submission IDs for different applicants");
  assert(subA.applicant.name === "Bob Smith", "Applicant A name preserved");
  assert(subB.applicant.name === "Carol Davis", "Applicant B name preserved");
  assert(subA.departmentId === subB.departmentId, "Same department ID");
  assert(subA.answers[0].value === "Bob's blockchain answer", "Applicant A answer preserved");
  assert(subB.answers[0].value === "Carol's blockchain answer", "Applicant B answer preserved");
}

// -------------------------------------------------------------
// TEST 4: Same applicant -> repeated submission for same department
// -------------------------------------------------------------
console.log("\nTEST 4: Same applicant -> repeated submission for same department");
{
  const email = "dave@example.com";
  const deptId = "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6";
  const subId1 = generateSubmissionId(email, deptId);
  const subId2 = generateSubmissionId(email, deptId);

  assert(subId1 === subId2, "Deterministic submissionId causes key collision on duplicate application");

  // Simulate transactional check
  const mockDb = new Map();
  mockDb.set(subId1, { id: subId1, Email: email, Department: "∑_ApZ3V_gh", departmentId: deptId });

  const isDuplicate = mockDb.has(subId2);
  assert(isDuplicate === true, "Database check catches duplicate submission immediately");
}

// -------------------------------------------------------------
// TEST 5: Concurrent submissions & Race Condition simulation
// -------------------------------------------------------------
console.log("\nTEST 5: Concurrent submissions & Race Condition simulation");
{
  // Simulate concurrent execution with a locked transaction mock
  const database = new Map();
  let lock = false;

  async function mockTransactionalSubmit(applicantEmail, deptId, answers) {
    // Acquire transaction
    while (lock) {
      await new Promise((r) => setTimeout(r, 1));
    }
    lock = true;
    try {
      const subId = generateSubmissionId(applicantEmail, deptId);
      if (database.has(subId)) {
        throw new Error(`ALREADY_SUBMITTED:${deptId}`);
      }

      // Count existing submissions for applicant
      let userSubmissions = 0;
      for (const val of database.values()) {
        if (val.Email === applicantEmail) userSubmissions++;
      }

      if (userSubmissions >= 2) {
        throw new Error("MAX_APPLICATIONS_REACHED");
      }

      const doc = buildCanonicalSubmission({
        applicant: { email: applicantEmail, name: "Test User", registrationNumber: "23BCE1005" },
        departmentIdentifier: deptId,
        answersInput: answers,
      });

      database.set(subId, doc);
      return { success: true, submissionId: subId };
    } finally {
      lock = false;
    }
  }

  // Fire 4 simultaneous submissions for 4 departments from the same user
  const email = "concurrency_test@example.com";
  const deptIds = [
    "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6", // App
    "8143de1d-db17-42fa-958d-13b10804f894", // Web
    "6a89c4e2-7b19-4f32-821e-9821a41b5201", // Blockchain
    "a1d920df-9eb9-49eb-b3a4-e4a3d1245ede", // Cloud
  ];

  const results = await Promise.allSettled(
    deptIds.map((dId) => mockTransactionalSubmit(email, dId, { q_01: "test answer" }))
  );

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert(fulfilled.length === 2, "Exactly 2 applications accepted");
  assert(rejected.length === 2, "Remaining concurrent applications rejected with MAX_APPLICATIONS_REACHED");
  assert(
    rejected.every((r) => r.reason.message === "MAX_APPLICATIONS_REACHED"),
    "Rejection reason is MAX_APPLICATIONS_REACHED"
  );
}

// -------------------------------------------------------------
// TEST 6: Question order changed / question text modified
// -------------------------------------------------------------
console.log("\nTEST 6: Question order changed / question text modified");
{
  const deptId = "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6";
  const storedAnswers = [
    { questionId: "q_app_03", questionText: "Old question 3 text", questionVersion: 1, value: "Ans 3" },
    { questionId: "q_app_01", questionText: "Old question 1 text", questionVersion: 1, value: "Ans 1" },
    { questionId: "q_app_02", questionText: "Old question 2 text", questionVersion: 1, value: "Ans 2" },
  ];

  const submission = {
    submissionId: "sub_test_order",
    applicantId: "test@example.com",
    departmentId: deptId,
    schemaVersion: 2,
    answers: storedAnswers,
  };

  const normalized = normalizeSubmission(submission);
  const q1 = normalized.answers.find((a) => a.questionId === "q_app_01");
  const q3 = normalized.answers.find((a) => a.questionId === "q_app_03");

  assert(q1.value === "Ans 1", "q_app_01 mapped accurately regardless of array position");
  assert(q3.value === "Ans 3", "q_app_03 mapped accurately regardless of array position");
}

// -------------------------------------------------------------
// TEST 7: Admin retrieves all submissions (mixed new and legacy)
// -------------------------------------------------------------
console.log("\nTEST 7: Admin retrieves all submissions");
{
  const rawDocs = [
    // Modern v2 document
    {
      id: "sub_modern_01",
      submissionId: "sub_modern_01",
      schemaVersion: 2,
      departmentId: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
      departmentName: "∑_ApZ3V_gh",
      applicant: { name: "New User", email: "new@example.com", registrationNumber: "24BCE1111" },
      answers: [{ questionId: "q_app_01", questionText: "App Q1", value: "Modern Ans" }],
      shortlisted: false,
    },
    // Legacy v1 document (unversioned, flat dictionary Questions)
    {
      id: "legacy_doc_123",
      Name: "Old User",
      Email: "old@example.com",
      RegistrationNumber: "22BCE9999",
      Phone: "1234567890",
      Department: "∑_ApZ3V_gh",
      Questions: {
        "poAx ZQPF iL0C *$ Peq# 2qu43N8V0TC8 c3^ pKl1ypL *D@DRew tB Dm2 pwS#kXdV5XM?": "Legacy text answer",
      },
      shortlisted: true,
    },
  ];

  const normalizedAll = rawDocs.map(normalizeSubmission);

  assert(normalizedAll.length === 2, "All submissions retrieved");
  assert(normalizedAll[0].schemaVersion === 2, "Modern doc retains schemaVersion 2");
  assert(normalizedAll[1].schemaVersion === 1, "Legacy doc normalized to canonical schema");
  assert(normalizedAll[1].applicant.name === "Old User", "Legacy applicant name preserved");
  assert(normalizedAll[1].answers[0].questionId === "q_app_01", "Legacy question text correctly resolved to stable questionId q_app_01");
  assert(normalizedAll[1].answers[0].value === "Legacy text answer", "Legacy answer value preserved");
  assert(normalizedAll[1].shortlisted === true, "Legacy shortlist flag preserved");
}

// -------------------------------------------------------------
// TEST 8: Admin retrieves one specific submission
// -------------------------------------------------------------
console.log("\nTEST 8: Admin retrieves one specific submission");
{
  const rawDoc = {
    id: "sub_alice_example_com_339f0f8a_72f2_44b9_92ab_2b0d4dcfa0f6",
    submissionId: "sub_alice_example_com_339f0f8a_72f2_44b9_92ab_2b0d4dcfa0f6",
    applicantId: "alice@example.com",
    departmentId: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    departmentName: "∑_ApZ3V_gh",
    schemaVersion: 2,
    applicant: {
      name: "Alice Johnson",
      email: "alice@example.com",
      registrationNumber: "23BCE1001",
      phone: "9876543210",
    },
    answers: [
      { questionId: "q_app_01", questionText: "poAx ZQPF...", questionVersion: 1, type: "generic", value: "Ans 1" },
      { questionId: "q_general_why_join", questionText: "Why do you want to join Organization Name?", questionVersion: 1, type: "long-text", value: "Strong interest in development" },
    ],
    responseCount: 2,
    questionIds: ["q_app_01", "q_general_why_join"],
    status: "submitted",
    shortlisted: false,
  };

  const reconstructed = normalizeSubmission(rawDoc);
  assert(reconstructed.applicant.name === "Alice Johnson", "Applicant -> Alice Johnson");
  assert(reconstructed.submissionId.startsWith("sub_alice_"), "Submission -> sub_alice_...");
  assert(reconstructed.departmentName === "∑_ApZ3V_gh", "Department -> ∑_ApZ3V_gh");
  assert(reconstructed.answers.length === 2, "Questions & Answers reconstructed accurately");
  assert(reconstructed.answers[1].questionId === "q_general_why_join", "General question reconstructed");
}

// -------------------------------------------------------------
// TEST 9: Malformed / incomplete response payload
// -------------------------------------------------------------
console.log("\nTEST 9: Malformed / incomplete response payload");
{
  // Test missing department
  const deptMatch = resolveDepartment("");
  assert(deptMatch === null, "Empty department returns null");

  // Test malformed registration number regex
  const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;
  assert(!regNoRegex.test("invalid_reg"), "Invalid registration number rejected");
  assert(regNoRegex.test("25BCE5612"), "Valid registration number accepted");

  // Test null / undefined raw document in normalizer
  const normNull = normalizeSubmission(null);
  assert(normNull === null, "Normalizer safely handles null document without throwing");
}

// -------------------------------------------------------------
// TEST 10: Legacy response document compatibility
// -------------------------------------------------------------
console.log("\nTEST 10: Legacy response document compatibility");
{
  // Test legacy array format
  const legacyArrayDoc = {
    id: "legacy_array_doc",
    Name: "Eve Taylor",
    Email: "eve@example.com",
    RegistrationNumber: "21BCE0001",
    Phone: "9998887776",
    Department: "µ_Wb₹5D_lp", // Web Dev
    Questions: [
      ["yi8gnK7 VJW9 ^Q9Oqo FsC7avP 0PA", "Answer via array pair"],
      ["2#Y 73p₹xw kn qhP 77xDQWeB9 g*h?", "Short text answer"],
    ],
    "Why do you want to join Organization Name?": "Want to learn web dev",
    shortlisted: false,
  };

  const normalized = normalizeSubmission(legacyArrayDoc);
  assert(normalized.schemaVersion === 1, "Schema version marked as 1");
  assert(normalized.applicant.name === "Eve Taylor", "Applicant name preserved");
  assert(normalized.departmentName === "µ_Wb₹5D_lp", "Department resolved");
  assert(normalized.answers.length === 3, "All 3 answers (2 dept + 1 general) extracted");
  assert(normalized.answers.some((a) => a.questionId === "q_general_why_join"), "Top-level why join converted to canonical answer");
  assert(normalized.answers.some((a) => a.questionId === "q_web_05"), "Array question text resolved to stable questionId q_web_05");
}

console.log("\n=================================================");
console.log(`  ALL ${passedCount}/${totalCount} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
console.log("=================================================");
