"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        await authClient.signOut();
        toast.success("Signed out successfully");
        router.push("/");
      } catch (error) {
        console.error("Sign out error:", error);
        toast.error("Failed to sign out");
        router.push("/");
      }
    };

    performSignOut();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#07070b] text-slate-100 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/85 backdrop-blur-2xl shadow-2xl p-8 flex flex-col items-center text-center gap-4">
        {/* GDG Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-white tracking-tight">Signing Out...</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Safely clearing your candidate session and redirecting you to the home page.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-950/60 px-3 py-1 rounded-full border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Session securely cleared</span>
        </div>
      </div>
    </div>
  );
}
