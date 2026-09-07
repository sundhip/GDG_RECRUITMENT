"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Columns,
  CheckCircle2,
  Clock,
  User,
  Layers,
  Sparkles,
  Lock,
  AlertTriangle,
  ArrowRightLeft,
  FileText,
} from "lucide-react";

export default function CandidateComparisonPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const initialId1 = searchParams.get("id1") || "";
  const initialId2 = searchParams.get("id2") || "";

  const [id1, setId1] = useState(initialId1);
  const [id2, setId2] = useState(initialId2);
  const [allApplicants, setAllApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPending) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function loadApplicants() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/admin/applicants?full=true`);
        if (!res.ok) throw new Error("Failed to load applicants for comparison");
        const json = await res.json();
        const list = json.applicants || [];
        setAllApplicants(list);

        // Auto-select first two if not specified
        if (!id1 && list.length > 0) setId1(list[0].id || list[0]._id || list[0].submissionId);
        if (!id2 && list.length > 1) setId2(list[1].id || list[1]._id || list[1].submissionId);
      } catch (err) {
        console.error("Comparison load error:", err);
        setError(err.message || "Failed to load candidate data.");
      } finally {
        setLoading(false);
      }
    }

    loadApplicants();
  }, [isAdmin, isPending]);

  const candidate1 = useMemo(
    () => allApplicants.find((a) => (a.id || a._id || a.submissionId) === id1),
    [allApplicants, id1]
  );

  const candidate2 = useMemo(
    () => allApplicants.find((a) => (a.id || a._id || a.submissionId) === id2),
    [allApplicants, id2]
  );

  // Extract aligned questions between candidate 1 and candidate 2
  const alignedQuestions = useMemo(() => {
    if (!candidate1 && !candidate2) return [];

    const questionsMap = new Map();

    const addAnswers = (candidate, candidateKey) => {
      if (!candidate) return;
      if (Array.isArray(candidate.answers)) {
        candidate.answers.forEach((ans) => {
          const qText = ans.questionText || ans.questionId || "Question";
          const current = questionsMap.get(qText) || { questionText: qText, answer1: "", answer2: "" };
          current[candidateKey] = ans.value || "";
          questionsMap.set(qText, current);
        });
      } else if (candidate.Questions && typeof candidate.Questions === "object") {
        Object.entries(candidate.Questions).forEach(([q, a]) => {
          const current = questionsMap.get(q) || { questionText: q, answer1: "", answer2: "" };
          current[candidateKey] = String(a || "");
          questionsMap.set(q, current);
        });
      }
    };

    addAnswers(candidate1, "answer1");
    addAnswers(candidate2, "answer2");

    return Array.from(questionsMap.values());
  }, [candidate1, candidate2]);

  // Compute word counts
  const getWordCount = (candidate) => {
    if (!candidate) return 0;
    let count = 0;
    if (Array.isArray(candidate.answers)) {
      candidate.answers.forEach((a) => {
        const text = String(a.value || "").trim();
        if (text) count += text.split(/\s+/).length;
      });
    }
    return count;
  };

  const handleToggleShortlist = async (candidate, candidateNum) => {
    if (!candidate) return;
    const targetState = !candidate.shortlisted;
    const targetId = candidate._id || candidate.id || candidate.submissionId;

    try {
      const res = await fetch(`/api/shortlist/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: targetState }),
      });

      if (!res.ok) throw new Error("Status update failed");

      setAllApplicants((prev) =>
        prev.map((item) => {
          const itemId = item._id || item.id || item.submissionId;
          if (itemId === targetId) {
            return {
              ...item,
              shortlisted: targetState,
              status: targetState ? "shortlisted" : "submitted",
            };
          }
          return item;
        })
      );

      toast.success(
        `Candidate ${candidate.Name || ""} ${
          targetState ? "shortlisted" : "reverted to pending"
        }!`
      );
    } catch (err) {
      console.error("Shortlist error:", err);
      toast.error("Failed to update status");
    }
  };

  if (isPending || loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Loading candidate comparison workspace...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Staff Access Only</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Candidate comparison is restricted to verified administrative staff.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="outline" className="border-slate-700 text-slate-300">
            Return to Admin Panel
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Candidates</span>
            </Link>
            <div className="flex items-center gap-2">
              <Columns className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                Side-by-Side Candidate Evaluation
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Comparative review workspace with aligned question responses and recruiter autonomy (zero automated scoring).
            </p>
          </div>
        </div>

        {/* Candidate Selector Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate 1 Selector */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider block">
              Candidate A
            </label>
            <select
              value={id1}
              onChange={(e) => setId1(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {allApplicants.map((app) => (
                <option key={app.id || app.submissionId} value={app.id || app.submissionId}>
                  {app.Name} — {app.Department} ({app.RegistrationNumber || "No Reg"})
                </option>
              ))}
            </select>
          </div>

          {/* Candidate 2 Selector */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
              Candidate B
            </label>
            <select
              value={id2}
              onChange={(e) => setId2(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {allApplicants.map((app) => (
                <option key={app.id || app.submissionId} value={app.id || app.submissionId}>
                  {app.Name} — {app.Department} ({app.RegistrationNumber || "No Reg"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Profile Comparison Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Candidate 1 Summary Card */}
          {candidate1 ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-blue-500/30 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800">
                    Candidate A
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 mt-2">{candidate1.Name}</h2>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {candidate1.RegistrationNumber || "—"} · {candidate1.Email}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleToggleShortlist(candidate1, 1)}
                  className={`text-xs h-8 gap-1.5 ${
                    candidate1.shortlisted
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  }`}
                >
                  {candidate1.shortlisted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{candidate1.shortlisted ? "Shortlisted" : "Pending"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Department</div>
                  <div className="font-semibold text-slate-200 mt-0.5 truncate">{candidate1.Department}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Total Words</div>
                  <div className="font-bold text-blue-400 mt-0.5">{getWordCount(candidate1)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Questions</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{candidate1.answers?.length || 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
              Select Candidate A
            </div>
          )}

          {/* Candidate 2 Summary Card */}
          {candidate2 ? (
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-indigo-500/30 space-y-4 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                    Candidate B
                  </span>
                  <h2 className="text-xl font-bold text-slate-100 mt-2">{candidate2.Name}</h2>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {candidate2.RegistrationNumber || "—"} · {candidate2.Email}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleToggleShortlist(candidate2, 2)}
                  className={`text-xs h-8 gap-1.5 ${
                    candidate2.shortlisted
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  }`}
                >
                  {candidate2.shortlisted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  <span>{candidate2.shortlisted ? "Shortlisted" : "Pending"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Department</div>
                  <div className="font-semibold text-slate-200 mt-0.5 truncate">{candidate2.Department}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Total Words</div>
                  <div className="font-bold text-indigo-400 mt-0.5">{getWordCount(candidate2)}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Questions</div>
                  <div className="font-semibold text-slate-200 mt-0.5">{candidate2.answers?.length || 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800 text-center text-slate-500 text-xs">
              Select Candidate B
            </div>
          )}
        </div>

        {/* Question-by-Question Aligned Comparison */}
        <section className="space-y-6" aria-label="Aligned Responses">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Aligned Responses ({alignedQuestions.length} Questions)</span>
            </h2>
            <span className="text-[11px] text-slate-500 italic">
              Human Evaluation View · Zero Algorithmic Bias
            </span>
          </div>

          <div className="space-y-6">
            {alignedQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                  <span className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-200">{q.questionText}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Candidate 1 Answer */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-2">
                    <div className="text-[11px] font-bold text-blue-400">
                      {candidate1?.Name || "Candidate A"}
                    </div>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {q.answer1 || <span className="text-slate-600 italic">No answer provided</span>}
                    </div>
                  </div>

                  {/* Candidate 2 Answer */}
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-2">
                    <div className="text-[11px] font-bold text-indigo-400">
                      {candidate2?.Name || "Candidate B"}
                    </div>
                    <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {q.answer2 || <span className="text-slate-600 italic">No answer provided</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
