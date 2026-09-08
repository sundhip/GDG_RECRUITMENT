import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { normalizeSubmission } from "@/lib/submissions";
import {
  requireAdmin,
  validateShortlistInput,
  validateSubmissionId,
  createSafeErrorResponse,
} from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce admin authentication & authorization
    const { user, response: authError } = await requireAdmin(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Apply rate limiting
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "admin:shortlist",
      limit: 60,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 3. Validate route parameters
    const { id } = params || {};
    if (!validateSubmissionId(id)) {
      return NextResponse.json(
        { success: false, error: "Bad Request", message: "Invalid submission ID format" },
        { status: 400 }
      );
    }

    // 4. Parse and validate payload
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Bad Request", message: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const { valid, shortlisted, currentPhase, status, scores, rubric, interviewSlot, errors } = validateShortlistInput(rawBody);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "Bad Request", message: errors.join(", ") },
        { status: 400 }
      );
    }

    const db = await connect();
    const docRef = db.collection("formData").doc(id);
    const existingSnapshot = await docRef.get();

    if (!existingSnapshot.exists) {
      return NextResponse.json(
        { success: false, error: "Not Found", message: "Applicant submission not found" },
        { status: 404 }
      );
    }

    // 5. Explicit whitelist update payload (Mass Assignment Prevention)
    const updatePayload = {
      shortlisted,
      status: status || (shortlisted ? "shortlisted" : (currentPhase ? `phase_${currentPhase}` : "submitted")),
      updatedAt: new Date(),
    };

    if (currentPhase !== undefined) {
      updatePayload.currentPhase = currentPhase;
      updatePayload.phase = currentPhase;
      updatePayload.phaseName =
        currentPhase === 6
          ? "Final Selection"
          : currentPhase === 5
          ? "Lead & Culture Fit (R2)"
          : currentPhase === 4
          ? "Technical Interview (R1)"
          : currentPhase === 3
          ? "Domain Review"
          : currentPhase === 2
          ? "Screening"
          : "Application Received";
    }

    if (scores !== undefined) {
      updatePayload.scores = scores;
    }

    if (rubric !== undefined) {
      updatePayload.rubric = rubric;
    }

    if (interviewSlot !== undefined) {
      updatePayload.interviewSlot = interviewSlot;
    }

    await docRef.update(updatePayload);
    const updatedSnapshot = await docRef.get();

    const serialized = serializeFirestoreData(updatedSnapshot.data());
    const applicant = normalizeSubmission({
      id: updatedSnapshot.id,
      _id: updatedSnapshot.id,
      ...serialized,
    });

    return NextResponse.json({ success: true, data: applicant }, { status: 200 });
  } catch (error) {
    return createSafeErrorResponse(error, "Failed to update shortlist status", 500);
  }
}
