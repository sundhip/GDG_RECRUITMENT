"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, Compass, CheckCircle2, ShieldCheck, BellRing, Code2, Users, Rocket } from "lucide-react";
import { Button } from "./ui/button";
import { GDGEmblem } from "./GDGLogo";
import { authClient } from "@/lib/auth-client";

export default function Hero({ onOpenNotice }) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <section className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
      {/* Ambient background glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[320px] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Campus & Community Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
            <GDGEmblem className="w-5 h-3" />
            <span className="text-xs font-semibold text-slate-200">
              GDG on Campus · VIT Chennai
            </span>
            <span className="h-3 w-px bg-slate-700" />
            <span className="text-xs font-medium text-blue-400">
              Technical Recruitment 2026
            </span>
          </div>

          {typeof onOpenNotice === "function" && (
            <button
              type="button"
              onClick={onOpenNotice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 text-xs font-semibold transition-all hover:scale-105"
            >
              <BellRing className="w-3.5 h-3.5 text-blue-400" />
              <span>Recruitment Notice</span>
            </button>
          )}
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
          Build. Learn. Share. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#60A5FA] to-[#0F9D58]">
            GDG on Campus · VIT Chennai
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Join a student developer community at VIT Chennai where you can learn new technologies, build real projects, collaborate with fellow student builders, and contribute to technical initiatives across campus.
        </p>

        {/* Call to action buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/departments" className="w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-12 rounded-2xl shadow-lg shadow-blue-900/40 gap-2 transition-all active:scale-[0.98]"
            >
              <span>Explore Departments</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>

          {!user ? (
            <Link href="/auth/signin" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 h-12 px-7 rounded-2xl backdrop-blur-md transition-all gap-2"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Candidate Portal</span>
              </Button>
            </Link>
          ) : (
            <Link href="/passport" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-emerald-800/80 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 h-12 px-7 rounded-2xl backdrop-blur-md transition-all gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>My Application Passport</span>
              </Button>
            </Link>
          )}
        </div>

        {/* Community Pillars / Highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 text-left border-t border-slate-800/80 pt-10">
          <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/70 backdrop-blur-sm hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Learn by Building</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Work on real software, apps, and Web3 tools alongside passionate mentors and peers.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/70 backdrop-blur-sm hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Collaborate on Campus</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Connect with 8 distinct technical domains across the VIT Chennai developer ecosystem.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-5 rounded-2xl bg-slate-900/50 border border-slate-800/70 backdrop-blur-sm hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/25 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Ship & Grow</h2>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Contribute to workshops, hackathons, and open source initiatives that impact campus life.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
