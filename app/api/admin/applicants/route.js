import { connect, serializeFirestoreData } from "@/lib/db";
import { normalizeSubmission } from "@/lib/submissions";
import { requireAdmin, createSafeErrorResponse } from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Format lightweight applicant summary DTO for table views.
 * Omits heavy answer payloads to reduce JSON transfer size by 80-90%.
 */
function toApplicantSummary(applicant) {
  return {
    id: applicant.id,
    _id: applicant._id || applicant.id,
    submissionId: applicant.submissionId,
    applicantId: applicant.applicantId,
    schemaVersion: applicant.schemaVersion,
    Name: applicant.Name || applicant.applicant?.name || "",
    Email: applicant.Email || applicant.applicant?.email || "",
    RegistrationNumber: applicant.RegistrationNumber || applicant.applicant?.registrationNumber || "",
    Phone: applicant.Phone || applicant.applicant?.phone || "",
    Department: applicant.Department || applicant.departmentName || "",
    departmentName: applicant.departmentName || applicant.Department || "",
    departmentId: applicant.departmentId || "",
    Pref: applicant.Pref || applicant.pref || "",
    shortlisted: Boolean(applicant.shortlisted),
    status: applicant.status || (applicant.shortlisted ? "shortlisted" : "submitted"),
    responseCount: applicant.responseCount || (Array.isArray(applicant.answers) ? applicant.answers.length : 0),
    createdAt: applicant.createdAt,
    updatedAt: applicant.updatedAt,
  };
}

export async function GET(req) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce admin authentication & authorization
    const { user, response: authError } = await requireAdmin(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Apply rate limiting
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "admin:applicants",
      limit: 60,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const department = searchParams.get("department") || "";
    const shortlistedParam = searchParams.get("shortlisted");
    const searchQuery = (searchParams.get("search") || "").toLowerCase().trim();
    const isFullRequested = searchParams.get("full") === "true";
    const isPaginated = searchParams.has("page") || searchParams.has("limit");

    const db = await connect();
    let query = db.collection("formData");

    // Server-side filtering by department if specified
    if (department) {
      query = query.where("Department", "==", department);
    }

    // Server-side filtering by shortlist status if specified
    if (shortlistedParam !== null && shortlistedParam !== undefined && shortlistedParam !== "") {
      const isShortlisted = shortlistedParam === "true" || shortlistedParam === "1";
      query = query.where("shortlisted", "==", isShortlisted);
    }

    const snapshot = await query.get();
    let allDocs = snapshot.docs.map((doc) => {
      const serialized = serializeFirestoreData(doc.data());
      return normalizeSubmission({ id: doc.id, _id: doc.id, ...serialized });
    });

    // Server-side search filter across Name, Email, RegNo
    if (searchQuery) {
      allDocs = allDocs.filter((app) => {
        const name = (app.Name || app.applicant?.name || "").toLowerCase();
        const email = (app.Email || app.applicant?.email || "").toLowerCase();
        const regNo = (app.RegistrationNumber || app.applicant?.registrationNumber || "").toLowerCase();
        return name.includes(searchQuery) || email.includes(searchQuery) || regNo.includes(searchQuery);
      });
    }

    const total = allDocs.length;
    const totalPages = Math.ceil(total / limit) || 1;

    // Apply pagination slice if pagination requested
    const pagedDocs = isPaginated
      ? allDocs.slice((page - 1) * limit, page * limit)
      : allDocs;

    // Convert to lightweight DTO unless full details were explicitly requested
    const applicants = isFullRequested
      ? pagedDocs
      : pagedDocs.map(toApplicantSummary);

    return NextResponse.json(
      {
        applicants,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return createSafeErrorResponse(error, "Failed to fetch applicants", 500);
  }
}
