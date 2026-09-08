import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/security";
import { createSessionToken } from "@/lib/session-helper";
import { verifyAdminPasskey, isWhitelistedAdminEmail } from "@/lib/admin-auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const user = await getSessionUser(reqHeaders);
    const isAdmin = Boolean(user && (user.role === "admin" || isWhitelistedAdminEmail(user.email)));

    return NextResponse.json({
      success: true,
      isAuthenticated: Boolean(user),
      isAdmin,
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: isAdmin ? "admin" : user.role || "user",
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const reqHeaders = await headers();
    const user = await getSessionUser(reqHeaders);

    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const { passkey } = body || {};

    const isPasskeyValid = passkey && verifyAdminPasskey(passkey);
    const isEmailWhitelisted = user?.email && isWhitelistedAdminEmail(user.email);

    if (!isPasskeyValid && !isEmailWhitelisted) {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
          message: "Invalid administrative passkey or unauthorized account.",
        },
        { status: 403 }
      );
    }

    const elevatedUser = {
      id: user?.id || "admin_" + Date.now(),
      name: user?.name || "GDG Recruitment Lead",
      email: user?.email || "admin@gdg.org",
      role: "admin",
      image: user?.image || null,
      adminElevatedAt: new Date().toISOString(),
    };

    const token = createSessionToken(elevatedUser);

    const response = NextResponse.json({
      success: true,
      message: "Administrative privileges granted successfully.",
      user: elevatedUser,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    response.cookies.set("session_token", token, cookieOptions);
    response.cookies.set("better-auth.session_token", token, cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Elevation failed" },
      { status: 500 }
    );
  }
}
