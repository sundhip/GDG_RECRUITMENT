"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { GDGEmblem } from "@/components/GDGLogo";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Users,
  Sparkles,
} from "lucide-react";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/admin";

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showPasskey, setShowPasskey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // If already authenticated as admin, redirect to target admin page
  useEffect(() => {
    if (isAdmin && !isPending) {
      router.push(redirectTarget);
    }
  }, [isAdmin, isPending, router, redirectTarget]);

  const handlePasskeyLogin = async (e) => {
    e.preventDefault();
    if (!passkey.trim()) {
      toast.error("Please enter the administrative passkey.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passkey: passkey.trim(),
          name: staffName.trim() || undefined,
          email: staffEmail.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid administrative credentials.");
      }

      toast.success("Staff privileges authorized. Welcome to Admin Console!");
      router.push(redirectTarget);
      router.refresh();
      window.location.href = redirectTarget;
    } catch (err) {
      console.error("Admin login error:", err);
      setErrorMessage(err.message || "Passkey authorization failed.");
      toast.error(err.message || "Invalid administrative passkey.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col justify-between selection:bg-purple-500/30 selection:text-purple-200">
      {/* Top Header */}
      <header className="w-full px-4 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* GDG Emblem */}
        <div className="flex items-center gap-2 bg-purple-950/40 border border-purple-800/60 px-3 py-1.5 rounded-full">
          <GDGEmblem className="w-6 h-3.5" />
          <span className="text-xs font-semibold text-purple-300">Staff Portal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md relative">
          {/* Ambient Glow */}
          <div className="absolute -top-16 -left-16 w-52 h-52 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-52 h-52 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

            {/* Header Badge & Title */}
            <div className="text-center flex flex-col items-center gap-2 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-inner mb-1">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-800/70 text-purple-300 text-xs font-semibold">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                <span>GDG Recruiter & Staff Console</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Admin Portal Login
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
                Dedicated gateway for GDG on Campus · VIT Chennai recruitment leads, reviewers, and core team coordinators.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 text-xs animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Google Sign In Option for Whitelisted Staff */}
            <div className="flex flex-col gap-2">
              <GoogleSignInButton
                text="Sign in with Staff Google Account"
                callbackURL={redirectTarget}
              />

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-slate-900 px-3 text-slate-400 font-medium tracking-wider">
                    or authenticate with staff passkey
                  </span>
                </div>
              </div>
            </div>

            {/* Passkey Authentication Form */}
            <form onSubmit={handlePasskeyLogin} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="staff-name" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reviewer / Lead Name <span className="text-slate-500 font-normal">(optional)</span></span>
                </Label>
                <Input
                  id="staff-name"
                  type="text"
                  placeholder="e.g. Lead Coordinator"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-11 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="staff-email" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Staff Email <span className="text-slate-500 font-normal">(optional)</span></span>
                </Label>
                <Input
                  id="staff-email"
                  type="email"
                  placeholder="recruiter@gdg.org"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-11 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-passkey" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Administrative Passkey <span className="text-red-400">*</span></span>
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="admin-passkey"
                    type={showPasskey ? "text" : "password"}
                    placeholder="Enter authorized passkey"
                    value={passkey}
                    onChange={(e) => setPasskey(e.target.value)}
                    required
                    className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-11 text-sm pr-10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasskey(!showPasskey)}
                    tabIndex={-1}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 h-11 rounded-xl shadow-lg shadow-purple-950 gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Access Admin Console</span>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </>
                )}
              </Button>
            </form>

            {/* Candidate Portal Redirection Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center space-y-1">
              <p className="text-xs text-slate-400">
                Are you a student applying to GDG?
              </p>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline"
              >
                <span>Go to Candidate Sign In Portal &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-slate-500 border-t border-slate-900">
        <p>© 2026 Google Developer Groups (GDG) · VIT Chennai Chapter Operations</p>
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07070b] flex items-center justify-center text-slate-400 text-xs">
          Loading Staff Authentication...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
