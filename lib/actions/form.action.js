import { connect } from "@/lib/db";
import {
  buildCanonicalSubmission,
  generateSubmissionId,
  normalizeSubmission,
} from "@/lib/submissions";
import { getSessionUser, validateSubmissionInput } from "@/lib/security";
import { headers } from "next/headers";

export const submitFormAction = async (formData) => {
  try {
    const reqHeaders = await headers();
    const user = await getSessionUser(reqHeaders);

    if (!user) {
      return { success: false, status: 401, message: "Authentication required" };
    }

    const verifiedEmail = (user.email || "").toLowerCase().trim();
    const { valid, errors, sanitizedData } = validateSubmissionInput(formData, verifiedEmail);

    if (!valid) {
      return { success: false, status: 400, message: errors[0] || "Validation failed" };
    }

    const {
      Name,
      Email,
      RegistrationNumber,
      Phone,
      Department,
      Pref,
      Answers,
    } = sanitizedData;

    const canonicalSubmission = buildCanonicalSubmission({
      applicant: {
        Name,
        Email,
        RegistrationNumber,
        Phone,
      },
      departmentIdentifier: Department,
      answersInput: Answers,
      pref: Pref,
    });

    const docId = generateSubmissionId(Email, canonicalSubmission.departmentId);
    const db = await connect();
    await db.collection("formData").doc(docId).set(canonicalSubmission);

    return {
      success: true,
      status: 200,
      message: "Form submitted successfully!",
      submissionId: canonicalSubmission.submissionId,
      data: normalizeSubmission(canonicalSubmission),
    };
  } catch (error) {
    return { success: false, status: 500, message: error.message };
  }
};
