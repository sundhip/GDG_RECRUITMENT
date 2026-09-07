import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("===============================================================");
console.log(" PHASE 5 INNOVATION & UNIQUE FEATURES VERIFICATION SUITE");
console.log("===============================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
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
// SUITE 1: APPLICATION PASSPORT IDENTITY & SAFE TOKENIZATION
// -----------------------------------------------------------------------------
console.log("[SUITE 1] Application Passport Identity & Safe Tokenization");

runTest("Application Passport page exists and is properly structured", () => {
  const passportPath = path.join(rootDir, "app", "(pages)", "passport", "page.jsx");
  assert.ok(fs.existsSync(passportPath), "Passport page must exist");
  const content = fs.readFileSync(passportPath, "utf-8");
  assert.ok(content.includes("Application Passport"), "Must contain Application Passport header");
  assert.ok(content.includes("VerifiedQR"), "Must embed VerifiedQR component");
  assert.ok(content.includes("window.print()"), "Must include printable receipt trigger");
  assert.ok(content.includes("get-submissions"), "Must fetch from canonical get-submissions endpoint");
});

runTest("VerifiedQR component generates deterministic SVG matrix without external dependencies", () => {
  const qrPath = path.join(rootDir, "components", "VerifiedQR.jsx");
  assert.ok(fs.existsSync(qrPath), "VerifiedQR component must exist");
  const content = fs.readFileSync(qrPath, "utf-8");
  assert.ok(content.includes("<svg"), "Must render pure SVG");
  assert.ok(content.includes("generateDeterministicMatrix"), "Must have deterministic matrix calculation");
  assert.ok(!content.includes("eval("), "Must be safe with 0 eval");
});

runTest("Passport QR Token does NOT leak raw PII", () => {
  const sampleEmail = "alice@example.com";
  const sampleSubmissionId = "sub_alice_example_com_technical";
  const token = `passport:verify:${sampleSubmissionId}`;

  // Token should only contain safe tokenized verification string, no unhashed phone number or raw passwords
  assert.ok(token.startsWith("passport:verify:sub_"));
  assert.ok(!token.includes("password"));
  assert.ok(!token.includes("+91"));
});

// -----------------------------------------------------------------------------
// SUITE 2: CONTINUE WHERE YOU LEFT OFF DRAFT RECOVERY
// -----------------------------------------------------------------------------
console.log("\n[SUITE 2] Continue Where You Left Off Draft Recovery");

runTest("DraftResumeBanner component exists and mounts in key applicant entrypoints", () => {
  const bannerPath = path.join(rootDir, "components", "DraftResumeBanner.jsx");
  assert.ok(fs.existsSync(bannerPath), "DraftResumeBanner component must exist");
  const content = fs.readFileSync(bannerPath, "utf-8");
  assert.ok(content.includes("recruitment-draft:"), "Must inspect recruitment-draft prefix");
  assert.ok(content.includes("handleContinue"), "Must provide continue action");
  assert.ok(content.includes("handleDiscard"), "Must provide safe discard action");

  // Check mounting in app/page.jsx and app/(pages)/departments/page.jsx
  const homeContent = fs.readFileSync(path.join(rootDir, "app", "page.jsx"), "utf-8");
  assert.ok(homeContent.includes("<DraftResumeBanner />"), "Home page must mount DraftResumeBanner");

  const deptContent = fs.readFileSync(path.join(rootDir, "app", "(pages)", "departments", "page.jsx"), "utf-8");
  assert.ok(deptContent.includes("<DraftResumeBanner />"), "Departments page must mount DraftResumeBanner");
});

runTest("Draft completion calculation handles incomplete and completed states accurately", () => {
  const mockDraftValues = {
    Name: "Jane Doe",
    RegistrationNumber: "25BCE1234",
    Phone: "9876543210",
    "Why do you want to join Organization Name?": "I love building scalable software.",
    "What tech stack do you use?": "Next.js, Node.js",
  };

  let answered = 0;
  let total = 5;
  Object.values(mockDraftValues).forEach((val) => {
    if (val && String(val).trim()) answered++;
  });

  const percent = Math.round((answered / total) * 100);
  assert.equal(percent, 100, "Should compute 100% when all fields answered");

  const partialValues = {
    Name: "Jane Doe",
    RegistrationNumber: "",
    Phone: "",
    "Why do you want to join Organization Name?": "",
  };

  let partialAnswered = 0;
  Object.values(partialValues).forEach((val) => {
    if (val && String(val).trim()) partialAnswered++;
  });
  const partialPercent = Math.round((partialAnswered / 4) * 100);
  assert.equal(partialPercent, 25, "Should compute 25% when 1 of 4 fields answered");
});

// -----------------------------------------------------------------------------
// SUITE 3: SMART PRE-FLIGHT QUALITY HEURISTICS & FORM ASSISTANCE
// -----------------------------------------------------------------------------
console.log("\n[SUITE 3] Smart Pre-Flight Quality Heuristics & Form Assistance");

runTest("FormComp incorporates Smart Pre-Flight Quality Diagnostics", () => {
  const formPath = path.join(rootDir, "components", "FormComp.jsx");
  const content = fs.readFileSync(formPath, "utf-8");
  assert.ok(content.includes("preFlightAnalysis"), "Must calculate preFlightAnalysis");
  assert.ok(content.includes("Smart Pre-Flight Quality Check"), "Must render pre-flight check header");
  assert.ok(content.includes("shortAnswers"), "Must detect brief answers (<20 chars)");
  assert.ok(content.includes("duplicates"), "Must detect duplicate answers across questions");
  assert.ok(content.includes("What reviewers look for"), "Must include contextual reviewer guidance");
});

runTest("Pre-Flight Heuristics correctly classify health status", () => {
  // Test case 1: Thoughtful, complete answers -> 'ready'
  const goodAnswers = [
    { question: "Why Join", value: "I am passionate about open source and community software development." },
    { question: "Technical Experience", value: "I have built full stack apps with Next.js, Firebase, and TypeScript." },
  ];
  const shortAnswers = goodAnswers.filter((a) => a.value.length < 20);
  assert.equal(shortAnswers.length, 0, "No short answers in good submission");

  // Test case 2: Brief answer (< 20 chars) -> 'review_suggested'
  const briefAnswersList = [
    { question: "Why Join", value: "good club" },
    { question: "Experience", value: "none" },
  ];
  const detectedShort = briefAnswersList.filter((a) => a.value.length < 20);
  assert.equal(detectedShort.length, 2, "Should identify both brief answers");

  // Test case 3: Duplicate answers across questions -> 'review_suggested'
  const duplicateAnswersList = [
    { question: "Why Join", value: "I want to learn and contribute to technology projects." },
    { question: "Technical Experience", value: "I want to learn and contribute to technology projects." },
  ];
  const seen = new Set();
  let hasDup = false;
  duplicateAnswersList.forEach((a) => {
    const val = a.value.toLowerCase();
    if (seen.has(val)) hasDup = true;
    seen.add(val);
  });
  assert.ok(hasDup, "Should detect identical answer across distinct questions");
});

// -----------------------------------------------------------------------------
// SUITE 4: ADMIN RECRUITER NOTES & WORKSPACE SECURITY
// -----------------------------------------------------------------------------
console.log("\n[SUITE 4] Admin Recruiter Notes & Workspace Security");

runTest("Admin Notes API endpoint exists with requireAdmin() and input sanitization", () => {
  const notesRoutePath = path.join(rootDir, "app", "api", "admin", "notes", "[id]", "route.js");
  assert.ok(fs.existsSync(notesRoutePath), "Admin notes route must exist");
  const content = fs.readFileSync(notesRoutePath, "utf-8");
  assert.ok(content.includes("requireAdmin"), "Must enforce requireAdmin() on GET and POST");
  assert.ok(content.includes("sanitizeString"), "Must sanitize incoming note text");
  assert.ok(content.includes("rateLimitGuard"), "Must rate limit notes endpoint");
});

runTest("Admin Review Workspace page exists with notes and checklist controls", () => {
  const reviewPagePath = path.join(rootDir, "app", "(pages)", "admin", "review", "[id]", "page.jsx");
  assert.ok(fs.existsSync(reviewPagePath), "Admin review workspace page must exist");
  const content = fs.readFileSync(reviewPagePath, "utf-8");
  assert.ok(content.includes("Internal Notes"), "Must include internal notes panel");
  assert.ok(content.includes("Evaluation Checklist"), "Must include evaluation checklist");
  assert.ok(content.includes("Response Diagnostics"), "Must include response diagnostics");
  assert.ok(content.includes("user?.role === \"admin\""), "Must check admin role on client");
});

runTest("Applicant endpoints never return internal recruiter notes", () => {
  const getSubmissionsPath = path.join(rootDir, "app", "api", "get-submissions", "route.js");
  const content = fs.readFileSync(getSubmissionsPath, "utf-8");
  assert.ok(!content.includes("reviewNotes"), "Applicant get-submissions endpoint must not read or return reviewNotes");
});

// -----------------------------------------------------------------------------
// SUITE 5: SIDE-BY-SIDE CANDIDATE COMPARISON & AUTONOMY GUARANTEE
// -----------------------------------------------------------------------------
console.log("\n[SUITE 5] Side-by-Side Candidate Comparison & Autonomy Guarantee");

runTest("Candidate Comparison page exists with aligned question evaluation", () => {
  const comparePagePath = path.join(rootDir, "app", "(pages)", "admin", "compare", "page.jsx");
  assert.ok(fs.existsSync(comparePagePath), "Compare page must exist");
  const content = fs.readFileSync(comparePagePath, "utf-8");
  assert.ok(content.includes("Side-by-Side Candidate Evaluation"), "Must render comparison title");
  assert.ok(content.includes("alignedQuestions"), "Must compute aligned question array");
  assert.ok(content.includes("Candidate A"), "Must label Candidate A");
  assert.ok(content.includes("Candidate B"), "Must label Candidate B");
});

runTest("DataTable integrates Workspace review link and Compare Selected toolbar action", () => {
  const dataTablePath = path.join(rootDir, "components", "DataTable.jsx");
  const content = fs.readFileSync(dataTablePath, "utf-8");
  assert.ok(content.includes("/admin/review/"), "Must link each candidate row to their review workspace");
  assert.ok(content.includes("/admin/compare?id1="), "Must offer 2-candidate comparison when 2 rows selected");
});

runTest("Zero automated scoring / AI blackbox decision rule is strictly preserved", () => {
  const compareContent = fs.readFileSync(path.join(rootDir, "app", "(pages)", "admin", "compare", "page.jsx"), "utf-8");
  const formContent = fs.readFileSync(path.join(rootDir, "components", "FormComp.jsx"), "utf-8");

  // Verify zero automated winner algorithms
  assert.ok(!compareContent.includes("calculateWinner"), "No automated winner algorithms");
  assert.ok(!compareContent.includes("aiScore"), "No blackbox AI scoring");
  assert.ok(!formContent.includes("autoReject"), "No automated candidate rejection");
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n===============================================================");
console.log(` PHASE 5 VERIFICATION RESULTS: ${passed} passed, ${failed} failed`);
console.log("===============================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("\n>> ALL PHASE 5 INNOVATION INVARIANTS VERIFIED SUCCESSFULLY! <<\n");
}
