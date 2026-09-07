import { connect, serializeFirestoreData } from "@/lib/db";
import { requireAdmin, createSafeErrorResponse, sanitizeString } from "@/lib/security";
import { rateLimitGuard } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notes/[id]
 * Fetch private recruiter review notes for a specific submission.
 * Strictly guarded by requireAdmin().
 */
export async function GET(req, { params }) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce Admin Authorization
    const { user, response: authError } = await requireAdmin(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Rate limiting
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "admin:notes:get",
      limit: 120,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });
    }

    const db = await connect();
    const notesSnapshot = await db
      .collection("reviewNotes")
      .where("submissionId", "==", id)
      .get();

    const notes = notesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeFirestoreData(doc.data()),
    }));

    // Ensure sorted chronologically in memory
    notes.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    return NextResponse.json({ submissionId: id, notes }, { status: 200 });
  } catch (error) {
    return createSafeErrorResponse(error, "Failed to retrieve recruiter notes", 500);
  }
}

/**
 * POST /api/admin/notes/[id]
 * Add a new private recruiter note.
 * Strictly guarded by requireAdmin() and input sanitization.
 */
export async function POST(req, { params }) {
  try {
    const reqHeaders = await headers();

    // 1. Enforce Admin Authorization
    const { user, response: authError } = await requireAdmin(reqHeaders);
    if (authError) {
      return authError;
    }

    // 2. Rate limiting
    const rateLimitResponse = rateLimitGuard(req, {
      prefix: "admin:notes:post",
      limit: 60,
      windowMs: 60000,
      identifier: user.email,
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const noteText = sanitizeString(body.text || body.note || "", 2000);
    if (!noteText || noteText.trim().length === 0) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 });
    }

    const category = sanitizeString(body.category || "General", 50);

    const db = await connect();
    const now = new Date();

    const noteDoc = {
      submissionId: id,
      text: noteText,
      category,
      authorName: user.name || "Reviewer",
      authorEmail: user.email,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("reviewNotes").add(noteDoc);

    return NextResponse.json(
      {
        success: true,
        note: {
          id: docRef.id,
          ...serializeFirestoreData(noteDoc),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return createSafeErrorResponse(error, "Failed to save recruiter note", 500);
  }
}
