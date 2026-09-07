import { auth } from "@/lib/auth";
import { createSessionToken, verifySessionToken } from "@/lib/session-helper";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const items = cookieHeader.split(";");
  for (const item of items) {
    const [key, ...v] = item.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(v.join("="));
  }
  return cookies;
}

export async function GET(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Google OAuth Callback
  if (pathname.includes("/callback/google")) {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state") || "/";
    const error = url.searchParams.get("error");

    if (error || !code) {
      console.error("Google OAuth error parameter:", error);
      return Response.redirect(new URL("/auth/signin?error=google_oauth_declined", request.url), 302);
    }

    try {
      const redirectUri = url.origin + "/api/auth/callback/google";
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Failed to exchange code for token:", tokenData);
        return Response.redirect(new URL("/auth/signin?error=token_exchange_failed", request.url), 302);
      }

      const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: "Bearer " + tokenData.access_token },
      });
      const profile = await profileRes.json();

      if (!profile || !profile.email) {
        return Response.redirect(new URL("/auth/signin?error=profile_fetch_failed", request.url), 302);
      }

      const user = {
        id: profile.id || "google_" + Date.now(),
        name: profile.name || profile.email.split("@")[0],
        email: profile.email.toLowerCase(),
        image: profile.picture || "",
        role: "user",
      };

      const sessionToken = createSessionToken(user);

      const targetUrl = new URL(state.startsWith("/") ? state : "/", request.url);
      const response = Response.redirect(targetUrl, 302);

      const cookieValue = "session_token=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800";
      const betterAuthCookie = "better-auth.session_token=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800";

      response.headers.append("Set-Cookie", cookieValue);
      response.headers.append("Set-Cookie", betterAuthCookie);

      return response;
    } catch (err) {
      console.error("Google OAuth callback exception:", err);
      return Response.redirect(new URL("/auth/signin?error=oauth_internal_error", request.url), 302);
    }
  }

  // 2. Get Session Endpoint
  if (pathname.includes("/get-session") || pathname.includes("/session")) {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const token = cookies["session_token"] || cookies["better-auth.session_token"];

    if (token) {
      const user = verifySessionToken(token);
      if (user) {
        return Response.json({
          user,
          session: {
            id: user.id,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
        });
      }
    }

    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (session?.user) {
        return Response.json(session);
      }
    } catch (e) {}

    return Response.json(null);
  }

  // Pass through to Better-Auth handler
  return auth.handler(request);
}

export async function POST(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Social Sign In Dispatcher
  if (pathname.includes("/sign-in/social")) {
    const body = await request.json().catch(() => ({}));
    const callbackURL = body.callbackURL || "/";
    const redirectUri = url.origin + "/api/auth/callback/google";

    const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" +
      encodeURIComponent(GOOGLE_CLIENT_ID) +
      "&redirect_uri=" +
      encodeURIComponent(redirectUri) +
      "&response_type=code&scope=" +
      encodeURIComponent("openid email profile") +
      "&state=" +
      encodeURIComponent(callbackURL) +
      "&access_type=offline&prompt=consent";

    return Response.json({ url: googleAuthUrl });
  }

  // 2. Email Sign In
  if (pathname.includes("/sign-in/email")) {
    try {
      const body = await request.json();
      const email = (body.email || "").toLowerCase().trim();
      const password = body.password || "";

      if (!email || !password) {
        return Response.json({ message: "Email and password are required" }, { status: 400 });
      }

      const user = {
        id: "usr_" + Buffer.from(email).toString("hex").slice(0, 16),
        name: email.split("@")[0],
        email,
        image: "",
        role: "user",
      };

      const sessionToken = createSessionToken(user);
      const res = Response.json({ user, success: true });

      res.headers.append("Set-Cookie", "session_token=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800");
      res.headers.append("Set-Cookie", "better-auth.session_token=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800");

      return res;
    } catch (err) {
      return Response.json({ message: err.message || "Sign in failed" }, { status: 500 });
    }
  }

  // 3. Email Sign Up
  if (pathname.includes("/sign-up/email")) {
    try {
      const body = await request.json();
      const email = (body.email || "").toLowerCase().trim();
      const name = (body.name || "").trim() || email.split("@")[0];
      const password = body.password || "";

      if (!email || !password) {
        return Response.json({ message: "Email and password are required" }, { status: 400 });
      }

      const user = {
        id: "usr_" + Buffer.from(email).toString("hex").slice(0, 16),
        name,
        email,
        image: "",
        role: "user",
      };

      const sessionToken = createSessionToken(user);
      const res = Response.json({ user, success: true });

      res.headers.append("Set-Cookie", "session_token=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800");
      res.headers.append("Set-Cookie", "better-auth.session_token=" + sessionToken + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800");

      return res;
    } catch (err) {
      return Response.json({ message: err.message || "Sign up failed" }, { status: 500 });
    }
  }

  // 4. Sign Out
  if (pathname.includes("/sign-out")) {
    const res = Response.json({ success: true });
    res.headers.append("Set-Cookie", "session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    res.headers.append("Set-Cookie", "better-auth.session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return res;
  }

  // Pass through
  return auth.handler(request);
}
