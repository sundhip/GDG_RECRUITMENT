import assert from "node:assert/strict";
import {
  RECRUITMENT_PHASES,
  getPhaseDetails,
  verifyAdminPasskey,
  isWhitelistedAdminEmail,
} from "../lib/admin-auth.js";
import { validateShortlistInput } from "../lib/security.js";
import { normalizeSubmission } from "../lib/submissions.js";

console.log("===============================================================");
console.log(" 6-PHASE RECRUITMENT PIPELINE & ADMIN PORTAL VERIFICATION");
console.log("===============================================================\n");

let passed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log("  [PASS] " + name);
    passed++;
  } catch (err) {
    console.error("  [FAIL] " + name + ": " + err.message);
    throw err;
  }
}

console.log("[SUITE 1] 6-Phase Pipeline Definitions & Metadata");

runTest("Exactly 6 distinct recruitment phases defined with unique sequence", () => {
  assert.equal(RECRUITMENT_PHASES.length, 6, "Must define exactly 6 recruitment phases");
  for (let i = 1; i <= 6; i++) {
    const p = getPhaseDetails(i);
    assert.equal(p.phase, i, "Phase sequence matches");
    assert.ok(p.name, "Phase must have a full name");
    assert.ok(p.shortName, "Phase must have a shortName");
    assert.ok(p.badgeColor, "Phase must have styling tokens");
  }
});

runTest("getPhaseDetails safely clamps boundary inputs (0 and >6)", () => {
  const p0 = getPhaseDetails(0);
  assert.equal(p0.phase, 1, "Phase 0 clamped to Phase 1");
  const p10 = getPhaseDetails(10);
  assert.equal(p10.phase, 6, "Phase 10 clamped to Phase 6");
});

console.log("\n[SUITE 2] Admin Authorization & Elevation");

runTest("Admin Passkey verification allows valid key and rejects invalid", () => {
  assert.equal(verifyAdminPasskey("gdg2026admin"), true, "Valid default passkey accepted");
  assert.equal(verifyAdminPasskey("wrongpass"), false, "Invalid passkey rejected");
  assert.equal(verifyAdminPasskey(""), false, "Empty passkey rejected");
  assert.equal(verifyAdminPasskey(null), false, "Null passkey rejected");
});

runTest("Admin Whitelist correctly identifies configured recruiter emails", () => {
  assert.equal(isWhitelistedAdminEmail("sundhipmanhooj@email.com"), true, "Owner email whitelisted");
  assert.equal(isWhitelistedAdminEmail("admin@gdg.org"), true, "GDG Admin whitelisted");
  assert.equal(isWhitelistedAdminEmail("applicant@student.org"), false, "Candidate email not whitelisted");
});

console.log("\n[SUITE 3] Phase & Shortlist Security Sanitization");

runTest("validateShortlistInput accepts phase advancement (Phase 1 to 6)", () => {
  const p1 = validateShortlistInput({ currentPhase: 1 });
  assert.equal(p1.valid, true);
  assert.equal(p1.currentPhase, 1);
  assert.equal(p1.shortlisted, false);

  const p4 = validateShortlistInput({ currentPhase: 4 });
  assert.equal(p4.valid, true);
  assert.equal(p4.currentPhase, 4);
  assert.equal(p4.shortlisted, true, "Phase 4 automatically sets shortlisted");

  const p6 = validateShortlistInput({ currentPhase: 6, scores: { technical: 10 } });
  assert.equal(p6.valid, true);
  assert.equal(p6.currentPhase, 6);
  assert.equal(p6.scores.technical, 10);
});

runTest("validateShortlistInput preserves backward compatibility for shortlisted boolean", () => {
  const resTrue = validateShortlistInput({ shortlisted: true });
  assert.equal(resTrue.valid, true);
  assert.equal(resTrue.shortlisted, true);

  const resFalse = validateShortlistInput({ shortlisted: false });
  assert.equal(resFalse.valid, true);
  assert.equal(resFalse.shortlisted, false);

  const resInvalid = validateShortlistInput({});
  assert.equal(resInvalid.valid, false);
});

console.log("\n[SUITE 4] Schema v2 & Legacy Normalization with Phase Metadata");

runTest("normalizeSubmission maps currentPhase and scores seamlessly", () => {
  const doc = {
    Name: "Charlie Brown",
    Email: "charlie@vit.edu",
    Department: "Web Dev",
    currentPhase: 3,
    scores: { technical: 9, problemSolving: 8 },
  };

  const normalized = normalizeSubmission(doc);
  assert.equal(normalized.currentPhase, 3);
  assert.equal(normalized.phaseName, "Domain Review");
  assert.equal(normalized.scores.technical, 9);
});

console.log("\n>> ALL 6-PHASE & ADMIN INVARIANT TESTS PASSED! <<\n");
