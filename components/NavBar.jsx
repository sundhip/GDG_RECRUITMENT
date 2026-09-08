"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import UserButton from "./UserButton";
import GDGLogo from "./GDGLogo";
import { authClient } from "@/lib/auth-client";
import { Clock, ShieldCheck, Compass, LayoutDashboard, Sparkles } from "lucide-react";

const NavBar = () => {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const user = session?.user;
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === "admin";

  const [formattedTimeDisplay, setFormattedTimeDisplay] = useState("");

  // Live time synchronized once per second (1000ms)
  useEffect(() => {
    setFormattedTimeDisplay(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setFormattedTimeDisplay(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-background/85 backdrop-blur-xl transition-all">
      {/* Top 4-Color Google Accent Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-5 sm:gap-6">
          <GDGLogo subtitle="VIT Chennai · Recruitments 2026" size="md" />

          {formattedTimeDisplay && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/80 border border-slate-800/80 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="font-mono">{formattedTimeDisplay}</span>
            </div>
          )}
        </div>

        <nav aria-label="Main Navigation" className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/departments"
            className={"flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none " + (
              pathname === "/departments"
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            )}
          >
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Departments</span>
          </Link>

          {isAuthenticated && (
            <Link
              href="/passport"
              className={"flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none " + (
                pathname === "/passport"
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Passport</span>
            </Link>
          )}

          {isAuthenticated && (
            <Link
              href="/admin"
              className={"flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none " + (
                pathname.startsWith("/admin")
                  ? "bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              )}
            >
              <LayoutDashboard className="w-4 h-4 text-purple-400" />
              <span>Admin Portal</span>
              {isAdmin && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-purple-600/30 text-purple-300 border border-purple-500/30">
                  Staff
                </span>
              )}
            </Link>
          )}

          <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

          {isPending ? (
            <div className="h-9 w-24 bg-slate-800/60 animate-pulse rounded-xl" />
          ) : !isAuthenticated ? (
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-900/30 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          ) : (
            <UserButton user={user} />
          )}
        </nav>
      </div>
    </header>
  );
};

export default NavBar;
