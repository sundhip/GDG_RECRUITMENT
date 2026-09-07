import { connect } from "@/lib/db";
import { headers } from "next/headers";
import {
  buildCanonicalSubmission,
  generateSubmissionId,
  resolveDepartment,
  normalizeSubmission,
} from "@/lib/submissions";
import {
  requireAuth,
  validateSubmissionInput,
  createSafeErrorResponse,
} from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce applicant authentication
    const { user, response: authError } = await requireAuth(reqHeaders);
    if (authError) {
      return authError;
    }

    const verifiedUserEmail = (user.email || "").toLowerCase().trim();

    // 2. Apply rate limiting per user / IP
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "applicant:submit-form",
      limit: 5,
      windowMs: 60000,
      identifier: verifiedUserEmail,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 3. Verify recruitment deadline
    if (process.env.RECRUITMENT_DEADLINE) {
      const deadline = new Date(process.env.RECRUITMENT_DEADLINE);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: "The submission deadline has passed",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Parse JSON payload
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid JSON payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 5. Server-side Input Validation & Anti-Spoofing
    // Enforces verified email from session, rejecting client-side identity spoofing
    const { valid, errors, sanitizedData } = validateSubmissionInput(rawBody, verifiedUserEmail);
    if (!valid) {
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: errors[0] || "Validation failed",
          errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const {
      Name,
      Email, // Verified session email
      RegistrationNumber,
      Phone,
      Department,
      Pref,
      Answers,
    } = sanitizedData;

    const dept = resolveDepartment(Department);
    const departmentId = dept?.id || Department;
    const departmentName = dept?.name || Department;

    const submissionDocId = generateSubmissionId(Email, departmentId);
    const db = await connect();
    const collection = db.collection("formData");
    const docRef = collection.doc(submissionDocId);

    // Build the canonical submission payload (schemaVersion: 2)
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

    // 6. Execute atomic transaction to prevent race conditions & duplicate applications
    const result = await db.runTransaction(async (transaction) => {
      // Check if this exact submission document already exists
      const existingDoc = await transaction.get(docRef);
      if (existingDoc.exists) {
        throw new Error(`ALREADY_SUBMITTED:${departmentName}`);
      }

      // Query all existing submissions for this user
      const emailQuery = collection.where("Email", "==", Email);
      const existingEmailSubmissions = await transaction.get(emailQuery);
      const existingDocs = existingEmailSubmissions.docs;

      // Check if any existing submission matches this department
      const alreadySubmittedDept = existingDocs.some((doc) => {
        const docData = doc.data();
        return (
          docData?.departmentId === departmentId ||
          docData?.Department === departmentName ||
          docData?.Department === Department
        );
      });

      if (alreadySubmittedDept) {
        throw new Error(`ALREADY_SUBMITTED:${departmentName}`);
      }

      // Check maximum application limit (max 2 applications per applicant)
      if (existingDocs.length >= 2) {
        throw new Error("MAX_APPLICATIONS_REACHED");
      }

      // Atomic write of canonical submission
      transaction.set(docRef, canonicalSubmission);

      return canonicalSubmission;
    });

    return new Response(
      JSON.stringify({
        message: "Form submitted successfully!",
        submissionId: result.submissionId,
        data: normalizeSubmission(result),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error.message?.startsWith("ALREADY_SUBMITTED:")) {
      const deptName = error.message.replace("ALREADY_SUBMITTED:", "");
      return new Response(
        JSON.stringify({
          error: "Conflict",
          message: `You have already submitted an application for ${deptName}`,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    if (error.message === "MAX_APPLICATIONS_REACHED") {
      return new Response(
        JSON.stringify({
          error: "Forbidden",
          message: "Remember that you can only submit upto 2 unique applications",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return createSafeErrorResponse(error, "Error processing application submission", 500);
  }
}
