import { reviews, QuestionnaireData, GENERAL_QUESTIONS } from "../constants/index.js";

export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Generate a deterministic, database-safe submission ID.
 * Identifies a specific application (Applicant + Department), not merely the person.
 */
export function generateSubmissionId(applicantEmail, departmentIdentifier) {
  const cleanEmail = (applicantEmail || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");

  // Canonicalize department to stable departmentId if recognized (resolves name <-> uuid discrepancy)
  const dept = resolveDepartment(departmentIdentifier);
  const stableDeptId = dept?.id || departmentIdentifier || "unknown_dept";

  const cleanDeptId = (stableDeptId || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_");
  return `sub_${cleanEmail}_${cleanDeptId}`;
}

/**
 * Generate a stable applicant ID.
 */
export function generateApplicantId(applicantEmail, registrationNumber) {
  if (applicantEmail) {
    return (applicantEmail || "").toLowerCase().trim();
  }
  if (registrationNumber) {
    return (registrationNumber || "").toUpperCase().trim();
  }
  return "unknown_applicant";
}

/**
 * Resolve department details from either name or ID.
 */
export function resolveDepartment(departmentIdentifier) {
  if (!departmentIdentifier) return null;
  const match = reviews.find(
    (dept) =>
      dept.id === departmentIdentifier ||
      dept.name.trim().toLowerCase() === departmentIdentifier.trim().toLowerCase()
  );
  return match || null;
}

/**
 * Lookup question definition by ID or Question text.
 */
export function resolveQuestion(deptIdOrName, questionKey) {
  if (!questionKey) return null;
  const keyStr = String(questionKey).trim();
  const keyLower = keyStr.toLowerCase();

  // Check general questions first
  const generalQ = GENERAL_QUESTIONS.find(
    (q) =>
      q.id === keyStr ||
      q.questionId === keyStr ||
      q.name === keyStr ||
      q.questionText === keyStr ||
      q.name.trim().toLowerCase() === keyLower ||
      (q.questionText && q.questionText.trim().toLowerCase() === keyLower)
  );
  if (generalQ) return generalQ;

  // Resolve department ID
  const dept = resolveDepartment(deptIdOrName);
  const targetDeptId = dept?.id || deptIdOrName;

  // Search across QuestionnaireData
  const deptQuestionnaire = QuestionnaireData.find(
    (qd) =>
      qd.departmentId === targetDeptId ||
      qd.departmentId === deptIdOrName ||
      (qd.department && qd.department.trim().toLowerCase() === (deptIdOrName || "").trim().toLowerCase())
  );

  if (deptQuestionnaire?.questions) {
    const found = deptQuestionnaire.questions.find(
      (q) =>
        q.id === keyStr ||
        q.questionId === keyStr ||
        q.name === keyStr ||
        q.questionText === keyStr ||
        q.name.trim().toLowerCase() === keyLower ||
        (q.questionText && q.questionText.trim().toLowerCase() === keyLower)
    );
    if (found) return found;
  }

  // Fallback search in all questions
  for (const qd of QuestionnaireData) {
    const found = qd.questions.find(
      (q) =>
        q.id === keyStr ||
        q.questionId === keyStr ||
        q.name === keyStr ||
        q.questionText === keyStr ||
        q.name.trim().toLowerCase() === keyLower ||
        (q.questionText && q.questionText.trim().toLowerCase() === keyLower)
    );
    if (found) return found;
  }

  return null;
}

/**
 * Build a canonical schema v2 submission object for storage.
 */
export function buildCanonicalSubmission({
  applicant,
  departmentIdentifier,
  answersInput,
  existingStatus = "submitted",
  shortlisted = false,
  pref = "",
}) {
  const dept = resolveDepartment(departmentIdentifier);
  const departmentId = dept?.id || departmentIdentifier || "unknown_dept";
  const departmentName = dept?.name || departmentIdentifier || "Unknown Department";

  const applicantEmail = (applicant.email || applicant.Email || "").toLowerCase().trim();
  const applicantName = (applicant.name || applicant.Name || "").trim();
  const registrationNumber = (applicant.registrationNumber || applicant.RegistrationNumber || "").toUpperCase().trim();
  const phone = (applicant.phone || applicant.Phone || "").trim();
  const gender = applicant.gender || applicant.Gender || "";
  const yearOfStudy = applicant.yearOfStudy || applicant["Year of Study"] || "";

  const applicantId = generateApplicantId(applicantEmail, registrationNumber);
  const submissionId = generateSubmissionId(applicantEmail, departmentId);

  // Normalize answers input into canonical array of answers
  const canonicalAnswers = [];
  const questionIds = [];
  const legacyQuestionsMap = {};

  if (Array.isArray(answersInput)) {
    for (const item of answersInput) {
      if (!item) continue;
      const qId = item.questionId || item.id || `q_${canonicalAnswers.length + 1}`;
      const qDef = resolveQuestion(departmentId, qId) || resolveQuestion(departmentId, item.questionText || item.name);
      const questionText = item.questionText || item.name || qDef?.questionText || qDef?.name || qId;
      const value = item.value !== undefined ? String(item.value) : (item.answer !== undefined ? String(item.answer) : "");
      const questionVersion = item.questionVersion || qDef?.version || 1;
      const type = item.type || qDef?.type || "generic";

      canonicalAnswers.push({
        questionId: qId,
        questionText,
        questionVersion,
        type,
        value,
      });
      questionIds.push(qId);
      legacyQuestionsMap[questionText] = value;
    }
  } else if (typeof answersInput === "object" && answersInput !== null) {
    for (const [key, val] of Object.entries(answersInput)) {
      const qDef = resolveQuestion(departmentId, key);
      const qId = qDef?.id || qDef?.questionId || key;
      const questionText = qDef?.questionText || qDef?.name || key;
      const value = val !== undefined && val !== null ? String(val) : "";
      const questionVersion = qDef?.version || 1;
      const type = qDef?.type || "generic";

      canonicalAnswers.push({
        questionId: qId,
        questionText,
        questionVersion,
        type,
        value,
      });
      questionIds.push(qId);
      legacyQuestionsMap[questionText] = value;
    }
  }

  const now = new Date();

  return {
    submissionId,
    applicantId,
    departmentId,
    departmentName,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    applicant: {
      name: applicantName,
      email: applicantEmail,
      registrationNumber,
      phone,
      gender,
      yearOfStudy,
    },
    answers: canonicalAnswers,
    responseCount: canonicalAnswers.length,
    questionIds,
    status: existingStatus,
    shortlisted: Boolean(shortlisted),
    createdAt: now,
    updatedAt: now,

    // Backward-compatibility fields for legacy queries, CSV exports, and direct UI access:
    Name: applicantName,
    Email: applicantEmail,
    RegistrationNumber: registrationNumber,
    Phone: phone,
    Department: departmentName,
    Pref: pref,
    Questions: legacyQuestionsMap,
    "Why do you want to join Organization Name?":
      canonicalAnswers.find((a) => a.questionId === "q_general_why_join")?.value ||
      legacyQuestionsMap["Why do you want to join Organization Name?"] ||
      "",
  };
}

/**
 * Normalizes any submission document (legacy schema v1 / unversioned or modern schema v2)
 * into a guaranteed Canonical Submission structure.
 */
export function normalizeSubmission(rawDoc) {
  if (!rawDoc) return null;

  const docId = rawDoc.id || rawDoc._id || "";
  const rawData = rawDoc.data && typeof rawDoc.data === "function" ? rawDoc.data() : rawDoc;

  const schemaVersion = rawData.schemaVersion || 1;

  // If already Schema Version 2
  if (schemaVersion >= 2 && rawData.submissionId && Array.isArray(rawData.answers)) {
    const dept = resolveDepartment(rawData.departmentId || rawData.Department || rawData.departmentName);
    const departmentName = rawData.departmentName || rawData.Department || dept?.name || "Unknown Department";
    const departmentId = rawData.departmentId || dept?.id || "unknown_dept";

    const applicant = rawData.applicant || {
      name: rawData.Name || "",
      email: rawData.Email || "",
      registrationNumber: rawData.RegistrationNumber || "",
      phone: rawData.Phone || "",
      gender: rawData.Gender || "",
      yearOfStudy: rawData["Year of Study"] || "",
    };

    const legacyQuestionsMap = {};
    for (const ans of rawData.answers) {
      if (ans?.questionText) {
        legacyQuestionsMap[ans.questionText] = ans.value ?? "";
      }
    }

    return {
      id: docId || rawData.submissionId,
      _id: docId || rawData.submissionId,
      submissionId: rawData.submissionId,
      applicantId: rawData.applicantId || generateApplicantId(applicant.email, applicant.registrationNumber),
      departmentId,
      departmentName,
      schemaVersion: 2,
      applicant: {
        name: applicant.name || rawData.Name || "",
        email: (applicant.email || rawData.Email || "").toLowerCase().trim(),
        registrationNumber: applicant.registrationNumber || rawData.RegistrationNumber || "",
        phone: applicant.phone || rawData.Phone || "",
        gender: applicant.gender || "",
        yearOfStudy: applicant.yearOfStudy || "",
      },
      answers: rawData.answers.map((a) => ({
        questionId: a.questionId || "",
        questionText: a.questionText || a.name || "",
        questionVersion: a.questionVersion || 1,
        type: a.type || "generic",
        value: a.value ?? a.answer ?? "",
      })),
      responseCount: rawData.responseCount ?? rawData.answers.length,
      questionIds: rawData.questionIds || rawData.answers.map((a) => a.questionId).filter(Boolean),
      status: rawData.status || (rawData.shortlisted ? "shortlisted" : "submitted"),
      shortlisted: Boolean(rawData.shortlisted),
      createdAt: rawData.createdAt || null,
      updatedAt: rawData.updatedAt || rawData.createdAt || null,

      // Top-level legacy accessors
      Name: applicant.name || rawData.Name || "",
      Email: (applicant.email || rawData.Email || "").toLowerCase().trim(),
      RegistrationNumber: applicant.registrationNumber || rawData.RegistrationNumber || "",
      Phone: applicant.phone || rawData.Phone || "",
      Department: departmentName,
      Pref: rawData.Pref || "",
      Questions: Object.keys(legacyQuestionsMap).length ? legacyQuestionsMap : (rawData.Questions || {}),
    };
  }

  // Handle Legacy Document (Schema v1 or unversioned)
  const dept = resolveDepartment(rawData.Department || rawData.departmentId || rawData.departmentName);
  const departmentName = rawData.Department || dept?.name || "Unknown Department";
  const departmentId = dept?.id || rawData.departmentId || "unknown_dept";

  const email = (rawData.Email || rawData.email || "").toLowerCase().trim();
  const name = rawData.Name || rawData.name || "";
  const regNo = rawData.RegistrationNumber || rawData.registrationNumber || "";
  const phone = rawData.Phone || rawData.phone || "";

  const applicantId = generateApplicantId(email, regNo);
  const submissionId = rawData.submissionId || (docId && docId.startsWith("sub_") ? docId : generateSubmissionId(email, departmentId));

  // Extract answers from legacy Questions formats (object, array of entries, array of objects, etc.)
  const canonicalAnswers = [];
  const questionIds = [];
  const legacyQuestionsMap = {};

  const rawQuestions = rawData.Questions || {};

  if (Array.isArray(rawQuestions)) {
    rawQuestions.forEach((entry, idx) => {
      if (Array.isArray(entry)) {
        const [qText, aVal] = entry;
        const qDef = resolveQuestion(departmentId, qText);
        const qId = qDef?.id || `q_legacy_${idx + 1}`;
        canonicalAnswers.push({
          questionId: qId,
          questionText: qText,
          questionVersion: 1,
          type: qDef?.type || "generic",
          value: String(aVal ?? ""),
        });
        questionIds.push(qId);
        legacyQuestionsMap[qText] = String(aVal ?? "");
      } else if (entry && typeof entry === "object") {
        Object.entries(entry).forEach(([qText, aVal]) => {
          const qDef = resolveQuestion(departmentId, qText);
          const qId = qDef?.id || `q_legacy_${idx + 1}`;
          canonicalAnswers.push({
            questionId: qId,
            questionText: qText,
            questionVersion: 1,
            type: qDef?.type || "generic",
            value: String(aVal ?? ""),
          });
          questionIds.push(qId);
          legacyQuestionsMap[qText] = String(aVal ?? "");
        });
      } else if (typeof entry === "string") {
        const qId = `q_legacy_${idx + 1}`;
        canonicalAnswers.push({
          questionId: qId,
          questionText: `Question ${idx + 1}`,
          questionVersion: 1,
          type: "generic",
          value: entry,
        });
        questionIds.push(qId);
        legacyQuestionsMap[`Question ${idx + 1}`] = entry;
      }
    });
  } else if (typeof rawQuestions === "object" && rawQuestions !== null) {
    Object.entries(rawQuestions).forEach(([qText, aVal], idx) => {
      const qDef = resolveQuestion(departmentId, qText);
      const qId = qDef?.id || `q_legacy_${idx + 1}`;
      canonicalAnswers.push({
        questionId: qId,
        questionText: qText,
        questionVersion: 1,
        type: qDef?.type || "generic",
        value: String(aVal ?? ""),
      });
      questionIds.push(qId);
      legacyQuestionsMap[qText] = String(aVal ?? "");
    });
  }

  // If top-level "Why do you want to join" exists and wasn't in questions
  const whyJoin = rawData["Why do you want to join Organization Name?"] || rawData["Why do you want to join DWASFW?"];
  if (whyJoin && !legacyQuestionsMap["Why do you want to join Organization Name?"]) {
    canonicalAnswers.unshift({
      questionId: "q_general_why_join",
      questionText: "Why do you want to join Organization Name?",
      questionVersion: 1,
      type: "long-text",
      value: String(whyJoin),
    });
    questionIds.unshift("q_general_why_join");
    legacyQuestionsMap["Why do you want to join Organization Name?"] = String(whyJoin);
  }

  return {
    id: docId || submissionId,
    _id: docId || submissionId,
    submissionId,
    applicantId,
    departmentId,
    departmentName,
    schemaVersion: 1, // Marked as normalized legacy
    applicant: {
      name,
      email,
      registrationNumber: regNo,
      phone,
      gender: rawData.Gender || "",
      yearOfStudy: rawData["Year of Study"] || "",
    },
    answers: canonicalAnswers,
    responseCount: canonicalAnswers.length,
    questionIds,
    status: rawData.status || (rawData.shortlisted ? "shortlisted" : "submitted"),
    shortlisted: Boolean(rawData.shortlisted),
    createdAt: rawData.createdAt || null,
    updatedAt: rawData.updatedAt || rawData.createdAt || null,

    // Legacy fields
    Name: name,
    Email: email,
    RegistrationNumber: regNo,
    Phone: phone,
    Department: departmentName,
    Pref: rawData.Pref || "",
    Questions: legacyQuestionsMap,
  };
}
