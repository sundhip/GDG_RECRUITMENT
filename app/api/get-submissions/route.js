import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { headers } from "next/headers";
import { normalizeSubmission } from "@/lib/submissions";
import {
  requireAuth,
  enforceOwnershipOrAdmin,
  createSafeErrorResponse,
} from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce authentication
    const { user, response: authError } = await requireAuth(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Apply rate limiting
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "applicant:get-submissions",
      limit: 30,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(req.url);
    const requestedEmail = (searchParams.get("email") || user.email || "").toLowerCase().trim();

    if (!requestedEmail) {
      return NextResponse.json(
        { error: "Bad Request", message: "Email parameter is required" },
        { status: 400 }
      );
    }

    // 3. IDOR / Object-Level Authorization Protection
    const { allowed, response: idorError } = enforceOwnershipOrAdmin(user, requestedEmail);
    if (!allowed) {
      return idorError;
    }

    const db = await connect();
    const snapshot = await db.collection("formData").where("Email", "==", requestedEmail).get();
    const data = snapshot.docs.map((doc) => {
      const serialized = serializeFirestoreData(doc.data());
      return normalizeSubmission({ id: doc.id, _id: doc.id, ...serialized });
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return createSafeErrorResponse(error, "Failed to retrieve submissions", 500);
  }
}
