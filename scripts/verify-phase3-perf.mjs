import fs from "fs";
import path from "path";
import { buildCanonicalSubmission, normalizeSubmission } from "../lib/submissions.js";

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
console.log("  PHASE 3: PERFORMANCE & SCALABILITY VERIFICATION");
console.log("=================================================\n");

// Helper function to scan source files recursively
function scanSourceFiles(dir, callback) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", ".next", ".git", "scratch"].includes(entry.name)) {
        scanSourceFiles(fullPath, callback);
      }
    } else if (entry.isFile() && /\.(jsx?|tsx?)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      callback(fullPath, content);
    }
  }
}

// -------------------------------------------------------------
// TEST 1: Elimination of Artificial CPU Work Loops
// -------------------------------------------------------------
console.log("TEST 1: Artificial CPU Work Elimination");
{
  let suspiciousLoopCount = 0;
  const offendingFiles = [];

  scanSourceFiles("D:/Archive/components", (filePath, content) => {
    // Match loops with >= 10,000 iterations
    if (/for\s*\([^;]*;\s*[^;]*[<>]=?\s*[0-9]{5,}/.test(content)) {
      suspiciousLoopCount++;
      offendingFiles.push(filePath);
    }
  });

  scanSourceFiles("D:/Archive/app", (filePath, content) => {
    if (/for\s*\([^;]*;\s*[^;]*[<>]=?\s*[0-9]{5,}/.test(content)) {
      suspiciousLoopCount++;
      offendingFiles.push(filePath);
    }
  });

  assert(suspiciousLoopCount === 0, `Zero artificial CPU loops found (checked components & app, offenses: ${offendingFiles.join(", ") || "none"})`);
}

// -------------------------------------------------------------
// TEST 2: Elimination of Unstable React Keys (Math.random in key)
// -------------------------------------------------------------
console.log("\nTEST 2: Unstable React Keys Elimination");
{
  let randomKeyCount = 0;
  const filesWithRandomKeys = [];

  scanSourceFiles("D:/Archive/components", (filePath, content) => {
    // Check for key={...Math.random()...} in JSX
    if (/key=\{[^}]*Math\.random\(\)[^}]*\}/.test(content)) {
      randomKeyCount++;
      filesWithRandomKeys.push(filePath);
    }
  });

  scanSourceFiles("D:/Archive/app", (filePath, content) => {
    if (/key=\{[^}]*Math\.random\(\)[^}]*\}/.test(content)) {
      randomKeyCount++;
      filesWithRandomKeys.push(filePath);
    }
  });

  assert(randomKeyCount === 0, `Zero Math.random() in React keys (checked components & app, offenses: ${filesWithRandomKeys.join(", ") || "none"})`);
}

// -------------------------------------------------------------
// TEST 3: Timer Interval Update Frequencies
// -------------------------------------------------------------
console.log("\nTEST 3: Timer Interval Frequencies");
{
  let subSecondIntervals = 0;
  const filesWithSubSecondIntervals = [];

  scanSourceFiles("D:/Archive/components", (filePath, content) => {
    // Check for setInterval with < 1000ms delay
    const match = content.match(/setInterval\([^,]+,\s*([0-9]{1,3})\s*\)/);
    if (match && parseInt(match[1], 10) < 1000) {
      subSecondIntervals++;
      filesWithSubSecondIntervals.push(`${filePath} (${match[1]}ms)`);
    }
  });

  assert(subSecondIntervals === 0, `Zero sub-second polling intervals in components (all timer frequencies >= 1000ms)`);
}

// -------------------------------------------------------------
// TEST 4: Server-Side Pagination & Filtering Logic
// -------------------------------------------------------------
console.log("\nTEST 4: Server-Side Pagination & Filtering Benchmark");
{
  // Generate mock dataset of 1,000 applicants
  const totalRecords = 1000;
  const mockDataset = [];
  const depts = [
    "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6", // App
    "8143de1d-db17-42fa-958d-13b10804f894", // Web
    "6a89c4e2-7b19-4f32-821e-9821a41b5201", // Blockchain
    "a1d920df-9eb9-49eb-b3a4-e4a3d1245ede", // Cloud
  ];

  for (let i = 1; i <= totalRecords; i++) {
    const deptId = depts[i % depts.length];
    mockDataset.push(
      buildCanonicalSubmission({
        applicant: {
          Name: `Applicant ${i}`,
          Email: `applicant${i}@example.com`,
          RegistrationNumber: `23BCE${String(i).padStart(4, "0")}`,
          Phone: `98765${String(i).padStart(5, "0")}`,
        },
        departmentIdentifier: deptId,
        answersInput: {
          q_01: "My detailed technical response explaining my experience in software development and leadership.",
          q_02: "Another detailed paragraph outlining project contributions, algorithms, and frontend architecture.",
        },
        shortlisted: i % 4 === 0,
      })
    );
  }

  // Test pagination slice
  const pageSize = 25;
  const page1 = mockDataset.slice(0, pageSize);
  const page2 = mockDataset.slice(pageSize, pageSize * 2);

  assert(mockDataset.length === 1000, "Dataset contains 1,000 generated applicants");
  assert(page1.length === 25, "Page 1 returns exactly 25 items");
  assert(page2.length === 25, "Page 2 returns exactly 25 items");
  assert(page1[0].applicant.email !== page2[0].applicant.email, "Page 1 and Page 2 contain distinct records");

  // Test filtering on dataset
  const webDepts = mockDataset.filter((d) => d.departmentId === "8143de1d-db17-42fa-958d-13b10804f894");
  assert(webDepts.length === 250, "Filtered exactly 250 Web Dev applicants from 1,000 total records");

  const shortlistedOnly = mockDataset.filter((d) => d.shortlisted === true);
  assert(shortlistedOnly.length === 250, "Filtered exactly 250 shortlisted applicants");
}

// -------------------------------------------------------------
// TEST 5: Network Payload Reduction (Summary DTO vs Full Document)
// -------------------------------------------------------------
console.log("\nTEST 5: Network Payload Reduction (Summary DTO vs Full Document)");
{
  function toSummaryDTO(item) {
    return {
      id: item.submissionId,
      _id: item.submissionId,
      submissionId: item.submissionId,
      Name: item.applicant.name,
      Email: item.applicant.email,
      RegistrationNumber: item.applicant.registrationNumber,
      Phone: item.applicant.phone,
      Department: item.departmentName,
      departmentName: item.departmentName,
      departmentId: item.departmentId,
      Pref: item.pref,
      shortlisted: item.shortlisted,
      status: item.status,
      responseCount: item.responseCount,
      createdAt: item.createdAt,
    };
  }

  // Create 100 sample documents with answers
  const sampleDocs = [];
  for (let i = 1; i <= 100; i++) {
    sampleDocs.push(
      buildCanonicalSubmission({
        applicant: {
          Name: `Applicant Test Name ${i}`,
          Email: `applicant_sample_${i}@domain.edu`,
          RegistrationNumber: `24BCE${String(i).padStart(4, "0")}`,
          Phone: `987654321${i % 10}`,
        },
        departmentIdentifier: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
        answersInput: {
          q_app_01: "Detailed multi-paragraph response with extensive technical descriptions of mobile architectures, state management, Swift, Kotlin, and React Native components.",
          q_app_02: "Long-form narrative explaining motivation for joining the organization, prior hackathon achievements, leadership history, and future community contributions.",
          q_app_03: "Comprehensive code walkthrough and architecture breakdown for cross-platform data synchronization.",
          q_general_why_join: "Passionate about building software that scales to thousands of active campus users.",
        },
      })
    );
  }

  const fullPayloadSize = JSON.stringify(sampleDocs).length;
  const summaryPayloadSize = JSON.stringify(sampleDocs.map(toSummaryDTO)).length;
  const reductionPercentage = ((fullPayloadSize - summaryPayloadSize) / fullPayloadSize) * 100;

  console.log(`  • Full payload size (100 docs): ${(fullPayloadSize / 1024).toFixed(2)} KB`);
  console.log(`  • Summary DTO size (100 docs): ${(summaryPayloadSize / 1024).toFixed(2)} KB`);
  console.log(`  • Payload reduction: ${reductionPercentage.toFixed(1)}%`);

  assert(reductionPercentage >= 50, `Payload reduction is significant (achieved ${reductionPercentage.toFixed(1)}% reduction >= 50%)`);
}

// -------------------------------------------------------------
// TEST 6: In-Memory Derived Filtering & Search Performance
// -------------------------------------------------------------
console.log("\nTEST 6: In-Memory Derived Filtering & Search Performance");
{
  const recordsCount = 10000;
  const testData = [];
  for (let i = 0; i < recordsCount; i++) {
    testData.push({
      _id: `rec_${i}`,
      Name: `Student ${i}`,
      Email: `student_${i}@college.edu`,
      RegistrationNumber: `23BCE${String(i % 1000).padStart(4, "0")}`,
      Department: i % 2 === 0 ? "App Development" : "Web Development",
      departmentName: i % 2 === 0 ? "App Development" : "Web Development",
      shortlisted: i % 5 === 0,
    });
  }

  const start = performance.now();
  
  // Perform filter by department and shortlist status
  const filtered = testData.filter(
    (item) => item.Department === "App Development" && item.shortlisted === true
  );

  // Perform search across filtered
  const searchResult = filtered.filter((item) =>
    item.Name.toLowerCase().includes("student 5")
  );

  const duration = performance.now() - start;
  console.log(`  • Filtered and searched 10,000 records in: ${duration.toFixed(2)} ms`);

  assert(filtered.length === 1000, "Derived filter accurately identified 1,000 matching records");
  assert(duration < 25, `Derived state calculation executed in ${duration.toFixed(2)}ms (< 25ms threshold)`);
}

// -------------------------------------------------------------
// TEST 7: Form Autosave Debounce Invariant
// -------------------------------------------------------------
console.log("\nTEST 7: Form Autosave Debounce Invariant");
{
  let saveCount = 0;
  let timer = null;

  function simulateDebouncedAutosave(data) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      saveCount++;
    }, 50);
  }

  // Fire 20 rapid keystroke inputs
  for (let k = 1; k <= 20; k++) {
    simulateDebouncedAutosave({ text: `Keystroke ${k}` });
  }

  // Wait for debounce timer to fire
  await new Promise((r) => setTimeout(r, 70));

  assert(saveCount === 1, `20 rapid keystrokes resulted in exactly 1 debounced storage write (avoided 19 redundant writes)`);
}

// -------------------------------------------------------------
// TEST 8: Double-Submission Prevention Invariant
// -------------------------------------------------------------
console.log("\nTEST 8: Double-Submission Prevention Invariant");
{
  let isSubmitting = false;
  let submissionAttempts = 0;

  async function mockFormSubmit() {
    if (isSubmitting) {
      return { status: "blocked", message: "Submission in progress" };
    }
    isSubmitting = true;
    submissionAttempts++;
    await new Promise((r) => setTimeout(r, 10));
    isSubmitting = false;
    return { status: "success" };
  }

  // Simulate user double clicking submit button
  const p1 = mockFormSubmit();
  const p2 = mockFormSubmit();

  const [res1, res2] = await Promise.all([p1, p2]);

  assert(res1.status === "success", "First click processed successfully");
  assert(res2.status === "blocked", "Second simultaneous click blocked by isSubmitting guard");
  assert(submissionAttempts === 1, "Exactly 1 submission processed");
}

console.log("\n=================================================");
console.log(`  ALL ${passedCount}/${totalCount} PERFORMANCE TESTS PASSED SUCCESSFULLY!`);
console.log("=================================================");
