import { connect } from "@/lib/db";
import { headers } from "next/headers";
import { resolveDepartment } from "@/lib/submissions";
import {
  requireAuth,
  enforceOwnershipOrAdmin,
  createSafeErrorResponse,
} from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce authentication
    const { user, response: authError } = await requireAuth(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Apply rate limiting
    const rateLimitResponse = rateLimitGuard(request, {
      prefix: "applicant:check-dept",
      limit: 30,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const requestedEmail = (searchParams.get("email") || user.email || "").toLowerCase().trim();
    const department = searchParams.get("department");

    if (!requestedEmail || !department) {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Missing email or department parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. IDOR / Object-Level Authorization Protection
    const { allowed, response: idorError } = enforceOwnershipOrAdmin(user, requestedEmail);
    if (!allowed) {
      return idorError;
    }

    const dept = resolveDepartment(department);
    const departmentId = dept?.id || department;
    const departmentName = dept?.name || department;

    const db = await connect();
    const snapshot = await db
      .collection("formData")
      .where("Email", "==", requestedEmail)
      .get();

    const submitted = snapshot.docs.some((doc) => {
      const d = doc.data();
      return (
        d.departmentId === departmentId ||
        d.Department === departmentName ||
        d.Department === department ||
        d.departmentName === departmentName
      );
    });

    return new Response(JSON.stringify({ submitted }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return createSafeErrorResponse(error, "Database query failed", 500);
  }
}
