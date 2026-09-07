"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import DWASFWLoader from "@/components/GDGLoader";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { GDGEmblem } from "@/components/GDGLogo";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user && !isPending) {
      router.push("/");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <DWASFWLoader />;
  }

  if (session?.user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="text-center text-white flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-zinc-400 font-medium">Redirecting to candidate portal...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      toast.error("Please enter your full name.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          callbackURL: "/",
        });
        if (res?.error) {
          toast.error(res.error.message || "Failed to create account.");
        } else {
          toast.success("Account created successfully! Welcome to GDG Recruitments.");
          router.push("/");
        }
      } else {
        const res = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
          callbackURL: "/",
        });
        if (res?.error) {
          toast.error(res.error.message || "Invalid credentials. Please verify your email and password.");
        } else {
          toast.success("Signed in successfully!");
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Authentication failed. Please check your network and credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex flex-col justify-between selection:bg-blue-500/30 selection:text-blue-200">
      {/* Top Bar Navigation */}
      <header className="w-full px-4 sm:px-8 py-5 flex items-center justify-between border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Recruitment Home</span>
        </Link>

        {/* GDG Emblem */}
        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full">
          <GDGEmblem className="w-6 h-3.5" />
          <span className="text-xs font-semibold text-slate-300">GDG Recruitments</span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-md relative">
          {/* Ambient Background Glow */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

            {/* Header / Title */}
            <div className="text-center flex flex-col items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Recruitment Portal 2026</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Candidate Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs">
                {mode === "signin"
                  ? "Sign in with Google or student credentials to continue your application."
                  : "Create your candidate profile to apply for technical departments."}
              </p>
            </div>

            {/* Google Sign In Button */}
            <div className="flex flex-col gap-2">
              <GoogleSignInButton
                text={mode === "signin" ? "Sign in with Google" : "Sign up with Google"}
                callbackURL="/"
              />

              {/* Clean Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-slate-900 px-3 text-slate-400 font-medium tracking-wider">
                    or continue with email
                  </span>
                </div>
              </div>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === "signin"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-200 ${
                  mode === "signup"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="candidate-name" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Full Name</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="candidate-name"
                      type="text"
                      placeholder="e.g. Alex Johnson"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={mode === "signup"}
                      className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-11 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="candidate-email" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Student Email Address</span>
                </Label>
                <div className="relative">
                  <Input
                    id="candidate-email"
                    type="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-11 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="candidate-password" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </Label>
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="candidate-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl h-11 text-sm pr-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 h-11 rounded-xl shadow-lg shadow-blue-900/40 gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{mode === "signin" ? "Signing In..." : "Creating Account..."}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In with Email" : "Complete Registration"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Mode Switch Helper */}
            <div className="text-center pt-2 border-t border-slate-800/80">
              <p className="text-xs text-slate-400">
                {mode === "signin" ? (
                  <>
                    Don&apos;t have an account yet?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <>
                    Already registered?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 bg-slate-950/40 py-2 rounded-xl border border-slate-800/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-bit encrypted authentication gateway</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-slate-500 border-t border-slate-900">
        <p>© 2026 Google Developer Groups (GDG) · Recruitment Portal System</p>
      </footer>
    </div>
  );
}
