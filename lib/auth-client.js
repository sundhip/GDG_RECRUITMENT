"use client";
import { useState, useEffect, useCallback } from "react";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

export const authClient = {
  useSession: () => {
    const [data, setData] = useState(null);
    const [isPending, setIsPending] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
      try {
        setIsPending(true);
        const res = await fetch("/api/auth/get-session", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const sessionData = await res.json();
          setData(sessionData);
        } else {
          setData(null);
        }
      } catch (err) {
        setError(err);
        setData(null);
      } finally {
        setIsPending(false);
      }
    }, []);

    useEffect(() => {
      refetch();
    }, [refetch]);

    return { data, isPending, error, refetch };
  },
  signIn: {
    social: async ({ provider = "google", callbackURL = "/" }) => {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const redirectUri = origin + "/api/auth/callback/google";
      const directGoogleUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" +
        encodeURIComponent(GOOGLE_CLIENT_ID) +
        "&redirect_uri=" +
        encodeURIComponent(redirectUri) +
        "&response_type=code&scope=" +
        encodeURIComponent("openid email profile") +
        "&state=" +
        encodeURIComponent(callbackURL) +
        "&access_type=offline&prompt=consent";

      try {
        const res = await fetch("/api/auth/sign-in/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, callbackURL }),
        });
        if (res.ok) {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            if (data?.url) {
              window.location.href = data.url;
              return { data };
            }
          } catch (e) {
            if (text && text.startsWith("http")) {
              window.location.href = text;
              return;
            }
          }
        }
        window.location.href = directGoogleUrl;
      } catch (err) {
        window.location.href = directGoogleUrl;
      }
    },
    email: async ({ email, password, callbackURL = "/" }) => {
      try {
        const res = await fetch("/api/auth/sign-in/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, callbackURL }),
        });
        const data = await res.json();
        return { data, error: res.ok ? null : { message: data?.message || "Sign in failed" } };
      } catch (err) {
        return { error: { message: err.message } };
      }
    },
  },
  signUp: {
    email: async ({ email, password, name, callbackURL = "/" }) => {
      try {
        const res = await fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name, callbackURL }),
        });
        const data = await res.json();
        return { data, error: res.ok ? null : { message: data?.message || "Sign up failed" } };
      } catch (err) {
        return { error: { message: err.message } };
      }
    },
  },
  signOut: async () => {
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.href = "/";
  },
};
