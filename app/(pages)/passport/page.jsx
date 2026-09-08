"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import VerifiedQR from "@/components/VerifiedQR";
import { RECRUITMENT_PHASES } from "@/lib/admin-auth";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  Sparkles,
  User,
  Mail,
  Phone,
  Hash,
  Compass,
  ArrowRight,
  ExternalLink,
  Award,
  AlertCircle,
  Calendar,
} from "lucide-react";

export default function PassportPage() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedReceipts, setExpandedReceipts] = useState({});

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchUserPassport() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/get-submissions?email=" + encodeURIComponent(user.email));
        if (!res.ok) {
          throw new Error("Failed to load your application passport.");
        }
        const data = await res.json();
        setSubmissions(data.data || []);
      } catch (err) {
        console.error("Passport fetch error:", err);
        setError(err.message || "Could not retrieve your applications.");
      } finally {
        setLoading(false);
      }
    }

    fetchUserPassport();
  }, [user, isPending]);

  const toggleExpand = (subId) => {
    setExpandedReceipts((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (isPending || loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Loading your Application Passport...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Sign in to Access Your Passport</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your Application Passport provides verified digital receipts, real-time 6-phase review updates, and interview status tracking.
          </p>
        </div>
        <Button
          onClick={() => router.push("/auth/signin")}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-900/30"
        >
          Sign In with Email or Google
        </Button>
      </main>
    );
  }

  const primaryApplicant = submissions[0]?.applicant || {
    name: user.name || "Applicant",
    email: user.email,
    registrationNumber: "—",
    phone: "—",
  };

  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 1. Header & Print Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-950/80 border border-blue-800 text-blue-300">
                Official Digital Hub
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-400">Canonical Identity v2</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Application Passport
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Verified record of your GDG technical recruitment submissions and live 6-phase recruitment pipeline status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {submissions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs gap-1.5 h-9 rounded-xl"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Passport</span>
              </Button>
            )}
            {submissions.length < 2 && (
              <Link href="/departments">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 h-9 rounded-xl shadow-md"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Apply ({submissions.length}/2)</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* 2. Applicant Profile Card */}
        <section
          aria-labelledby="applicant-profile-heading"
          className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800 shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-2xl shadow-inner">
                {primaryApplicant.name ? primaryApplicant.name.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 id="applicant-profile-heading" className="text-lg sm:text-xl font-bold text-slate-100">
                    {primaryApplicant.name}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Candidate
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {user.email}
                  </span>
                  {primaryApplicant.registrationNumber && primaryApplicant.registrationNumber !== "—" && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-slate-500" />
                      {primaryApplicant.registrationNumber}
                    </span>
                  )}
                  {primaryApplicant.phone && primaryApplicant.phone !== "—" && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {primaryApplicant.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-4 sm:pt-0">
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-100">{submissions.length} / 2</div>
                <div className="text-[11px] text-slate-400 font-medium">Departments Applied</div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Submissions / Passport Cards */}
        {submissions.length === 0 ? (
          <section className="p-12 rounded-3xl bg-slate-900/30 border border-slate-800/60 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto text-slate-400">
              <Compass className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-200">No Active Applications</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You have not submitted an application yet. Explore available technical departments to begin your recruitment journey.
              </p>
            </div>
            <Link href="/departments">
              <Button className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-6 py-2 rounded-xl gap-2 shadow-lg">
                <span>Browse Departments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-400" />
                <span>Submitted Applications ({submissions.length})</span>
              </h2>
              <span className="text-xs text-slate-500">Live 6-Phase Pipeline Feed</span>
            </div>

            <div className="space-y-6">
              {submissions.map((sub, index) => {
                const subId = sub.submissionId || sub.id || "sub_" + index;
                const isExpanded = Boolean(expandedReceipts[subId]);
                const currentPhase = sub.currentPhase || (sub.shortlisted ? 4 : 1);
                const isShortlisted = Boolean(sub.shortlisted || currentPhase >= 4);
                const deptName = sub.departmentName || sub.Department || "Technical Department";
                const createdDate = sub.createdAt
                  ? new Date(sub.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Recorded on system";

                return (
                  <article
                    key={subId}
                    className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl space-y-6"
                  >
                    {/* Top Row: Department info & Status pill */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-lg sm:text-xl font-bold text-slate-100">{deptName}</h3>
                          {currentPhase === 6 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm animate-pulse">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                              Selected for GDG Core Team
                            </span>
                          ) : currentPhase >= 4 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-700 shadow-sm animate-pulse">
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                              Shortlisted for Interview (Phase {currentPhase})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Under Technical Review (Phase {currentPhase})
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-400 font-mono">
                          <span>ID: {subId}</span>
                          <span>·</span>
                          <span>Submitted: {createdDate}</span>
                        </div>
                      </div>

                      {/* Safe Tokenized QR Code */}
                      <div className="flex items-center gap-4">
                        <div className="hidden sm:block text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Verification Token
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {subId.slice(0, 18)}...
                          </div>
                        </div>
                        <VerifiedQR
                          text={"passport:verify:" + subId}
                          size={70}
                          className="shrink-0"
                        />
                      </div>
                    </div>

                    {/* 6-Phase Stage Tracker */}
                    <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Recruitment Progress (Phase {currentPhase} of 6)
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-400">
                          {Math.round((currentPhase / 6) * 100)}% Complete
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 h-full transition-all duration-500"
                          style={{ width: (currentPhase / 6) * 100 + "%" }}
                        />
                      </div>

                      {/* 6-Phase Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2">
                        {RECRUITMENT_PHASES.map((p) => {
                          const isCompleted = currentPhase > p.phase;
                          const isCurrent = currentPhase === p.phase;

                          return (
                            <div
                              key={p.phase}
                              className={"p-2.5 rounded-xl border transition-all " + (
                                isCompleted
                                  ? "bg-emerald-950/30 border-emerald-800/40"
                                  : isCurrent
                                  ? "bg-blue-950/40 border-blue-600 shadow-md ring-1 ring-blue-500/50"
                                  : "bg-slate-900/30 border-slate-800/40 opacity-50"
                              )}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-400">
                                  {p.phase}.
                                </span>
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : isCurrent ? (
                                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                ) : null}
                              </div>
                              <div className={"text-[11px] font-bold truncate " + (
                                isCompleted
                                  ? "text-emerald-300"
                                  : isCurrent
                                  ? "text-blue-300"
                                  : "text-slate-400"
                              )}>
                                {p.shortName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggle Answers Drawer */}
                    <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(subId)}
                        className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 gap-1.5 h-8 px-2"
                      >
                        <span>{isExpanded ? "Hide Submitted Responses" : "View Submitted Responses"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </Button>

                      <span className="text-[11px] text-slate-500 font-mono">
                        {sub.answers?.length || 0} Questions Recorded
                      </span>
                    </div>

                    {/* Expanded Response Drawer */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-3">
                        {(sub.answers || []).map((ans, aIdx) => (
                          <div
                            key={ans.questionId || aIdx}
                            className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                          >
                            <div className="text-[11px] font-bold text-slate-300">
                              {ans.questionText || ans.questionId}
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                              {String(ans.value || "") || <span className="italic text-slate-600">No answer recorded</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
