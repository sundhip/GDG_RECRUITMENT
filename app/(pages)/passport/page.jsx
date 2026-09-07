"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import VerifiedQR from "@/components/VerifiedQR";
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
        const res = await fetch(`/api/get-submissions?email=${encodeURIComponent(user.email)}`);
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
            Your Application Passport provides verified digital receipts, real-time review updates, and interview status tracking.
          </p>
        </div>
        <Button
          onClick={() => router.push("/auth/signin")}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-900/30"
        >
          Sign In with Email
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              Verified record of your technical recruitment submissions and live evaluation status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {submissions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs gap-1.5 h-9"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Passport</span>
              </Button>
            )}
            {submissions.length < 2 && (
              <Link href="/departments">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5 h-9 shadow-md"
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
          className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800 shadow-xl relative overflow-hidden"
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
                    Verified
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-500" />
                    {user.email}
                  </span>
                  {primaryApplicant.registrationNumber && primaryApplicant.registrationNumber !== "—" && (
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-500" />
                      {primaryApplicant.registrationNumber}
                    </span>
                  )}
                  {primaryApplicant.phone && primaryApplicant.phone !== "—" && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
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
          <section className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center space-y-4">
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
              <span className="text-xs text-slate-500">Live Status Feed</span>
            </div>

            <div className="space-y-5">
              {submissions.map((sub, index) => {
                const subId = sub.submissionId || sub.id || `sub_${index}`;
                const isExpanded = Boolean(expandedReceipts[subId]);
                const isShortlisted = Boolean(sub.shortlisted);
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
                    className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all shadow-xl space-y-6"
                  >
                    {/* Top Row: Department info & Status pill */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-bold text-slate-100">{deptName}</h3>
                          {isShortlisted ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700 shadow-sm animate-pulse">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Shortlisted for Interview
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Under Technical Review
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
                          text={`passport:verify:${subId}`}
                          size={70}
                          className="shrink-0"
                        />
                      </div>
                    </div>

                    {/* Stage Tracker */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Review Lifecycle
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Step 1: Received */}
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-emerald-300">1. Received</div>
                            <div className="text-[10px] text-slate-400">Responses saved securely</div>
                          </div>
                        </div>

                        {/* Step 2: Evaluation */}
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-blue-300">2. Evaluation</div>
                            <div className="text-[10px] text-slate-400">Reviewers assessing fit</div>
                          </div>
                        </div>

                        {/* Step 3: Decision */}
                        <div
                          className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                            isShortlisted
                              ? "bg-emerald-950/40 border-emerald-800/40"
                              : "bg-slate-900/40 border-slate-800/40 opacity-70"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                              isShortlisted
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            {isShortlisted ? (
                              <Sparkles className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`text-xs font-bold ${
                                isShortlisted ? "text-emerald-300" : "text-slate-400"
                              }`}
                            >
                              3. {isShortlisted ? "Interview Invite" : "Final Decision"}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isShortlisted
                                ? "Check email for interview slots"
                                : "Pending review completion"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Answers Drawer */}
                    <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(subId)}
                        className="text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 gap-1.5 h-8 px-2.5"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5" />
                            <span>Hide Submitted Questionnaire Answers</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5" />
                            <span>View Submitted Questionnaire Answers ({sub.answers?.length || 0})</span>
                          </>
                        )}
                      </Button>

                      <span className="text-[11px] text-slate-500 font-mono">
                        Schema v{sub.schemaVersion || 2}
                      </span>
                    </div>

                    {/* Expanded Answers Inspector */}
                    {isExpanded && (
                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in duration-200">
                        <div className="text-xs font-bold text-slate-300 border-b border-slate-800/80 pb-2">
                          Your Recorded Answers
                        </div>
                        {Array.isArray(sub.answers) && sub.answers.length > 0 ? (
                          <div className="space-y-3">
                            {sub.answers.map((ans, aIdx) => (
                              <div
                                key={ans.questionId || aIdx}
                                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs space-y-1"
                              >
                                <div className="font-semibold text-slate-200">
                                  {ans.questionText || `Question ${aIdx + 1}`}
                                </div>
                                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                  {ans.value || <span className="text-slate-600 italic">No answer provided</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : sub.Questions && typeof sub.Questions === "object" ? (
                          <div className="space-y-3">
                            {Object.entries(sub.Questions).map(([q, a], qIdx) => (
                              <div
                                key={qIdx}
                                className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs space-y-1"
                              >
                                <div className="font-semibold text-slate-200">{q}</div>
                                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                  {String(a)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No answers recorded.</p>
                        )}
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
