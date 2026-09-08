"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RECRUITMENT_PHASES, getPhaseDetails } from "@/lib/admin-auth";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  Mail,
  Phone,
  Hash,
  MessageSquare,
  Sparkles,
  Send,
  AlertTriangle,
  FileText,
  Layers,
  CheckSquare,
  Square,
  Lock,
  Award,
  ChevronRight,
  Sliders,
  Save,
  Activity,
} from "lucide-react";

export default function AdminReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPhase, setCurrentPhase] = useState(1);
  const [isUpdatingPhase, setIsUpdatingPhase] = useState(false);

  const [scores, setScores] = useState({
    technical: 8,
    problemSolving: 7,
    domainDepth: 8,
    cultureFit: 9,
  });
  const [isSavingScores, setIsSavingScores] = useState(false);

  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technical");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [checklist, setChecklist] = useState({
    identityVerified: true,
    technicalDepthChecked: false,
    experienceEvaluated: false,
    interviewTopicIdentified: false,
  });

  const toggleChecklistItem = (key) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    if (isPending) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/admin/applicants?full=true");
        if (!res.ok) throw new Error("Failed to load applicants");
        const json = await res.json();
        const found = (json.applicants || []).find(
          (a) => a.id === id || a._id === id || a.submissionId === id
        );

        if (!found) {
          throw new Error("Application with ID " + id + " was not found.");
        }
        setApplicant(found);
        setCurrentPhase(found.currentPhase || 1);

        if (found.scores && typeof found.scores === "object") {
          setScores((prev) => ({
            ...prev,
            ...found.scores,
          }));
        }

        const notesRes = await fetch("/api/admin/notes/" + id);
        if (notesRes.ok) {
          const notesJson = await notesRes.json();
          setNotes(notesJson.notes || []);
        }
      } catch (err) {
        console.error("Review workspace error:", err);
        setError(err.message || "Failed to load candidate review data.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id, isAdmin, isPending]);

  // Diagnostics: Compute response lengths & word counts
  const diagnostics = useMemo(() => {
    if (!applicant) return null;
    const answers = applicant.answers || [];
    const totalAnswers = answers.length;
    let totalWords = 0;
    const briefAnswers = [];

    answers.forEach((a) => {
      const text = String(a.value || "").trim();
      const words = text ? text.split(/\s+/).length : 0;
      totalWords += words;
      if (text.length > 0 && text.length < 20) {
        briefAnswers.push(a.questionText || a.questionId);
      }
    });

    const avgWords = totalAnswers > 0 ? Math.round(totalWords / totalAnswers) : 0;

    return {
      totalAnswers,
      totalWords,
      avgWords,
      briefAnswers,
    };
  }, [applicant]);

  const rubricStats = useMemo(() => {
    const tech = Number(scores.technical) || 0;
    const ps = Number(scores.problemSolving) || 0;
    const dd = Number(scores.domainDepth) || 0;
    const cf = Number(scores.cultureFit) || 0;
    const total = tech + ps + dd + cf;
    const max = 40;
    const percentage = Math.round((total / max) * 100);

    let grade = "C";
    let gradeColor = "text-amber-400 bg-amber-950/80 border-amber-800";
    if (percentage >= 90) {
      grade = "A+ (Elite)";
      gradeColor = "text-emerald-400 bg-emerald-950/80 border-emerald-700";
    } else if (percentage >= 80) {
      grade = "A (Strong)";
      gradeColor = "text-blue-400 bg-blue-950/80 border-blue-700";
    } else if (percentage >= 70) {
      grade = "B+ (Good)";
      gradeColor = "text-indigo-400 bg-indigo-950/80 border-indigo-700";
    } else if (percentage >= 60) {
      grade = "B (Pass)";
      gradeColor = "text-slate-300 bg-slate-900 border-slate-700";
    }

    return { total, max, percentage, grade, gradeColor };
  }, [scores]);

  const handleSaveScores = async () => {
    if (!applicant) return;
    const targetId = applicant._id || applicant.id || applicant.submissionId;

    try {
      setIsSavingScores(true);
      const res = await fetch("/api/shortlist/" + targetId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores,
          currentPhase,
          shortlisted: currentPhase >= 4,
        }),
      });

      if (!res.ok) throw new Error("Failed to save evaluation scores");
      toast.success("Evaluation rubric & scores saved successfully!");
    } catch (err) {
      toast.error(err.message || "Could not save scores");
    } finally {
      setIsSavingScores(false);
    }
  };

  const handleSetPhase = async (targetPhase) => {
    if (!applicant) return;
    const targetId = applicant._id || applicant.id || applicant.submissionId;

    try {
      setIsUpdatingPhase(true);
      const res = await fetch("/api/shortlist/" + targetId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPhase: targetPhase,
          shortlisted: targetPhase >= 4,
          scores,
        }),
      });

      if (!res.ok) throw new Error("Failed to update recruitment phase");

      setCurrentPhase(targetPhase);
      const phaseInfo = getPhaseDetails(targetPhase);
      setApplicant((prev) => ({
        ...prev,
        currentPhase: targetPhase,
        phaseName: phaseInfo.name,
        shortlisted: targetPhase >= 4,
      }));

      toast.success("Applicant moved to Phase " + targetPhase + ": " + phaseInfo.name);
    } catch (err) {
      toast.error(err.message || "Failed to update phase");
    } finally {
      setIsUpdatingPhase(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      setIsSubmittingNote(true);
      const res = await fetch("/api/admin/notes/" + id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNoteText.trim(),
          category: noteCategory,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || "Failed to post note");
      }

      const json = await res.json();
      if (json.note) {
        setNotes((prev) => [...prev, json.note]);
        setNewNoteText("");
        toast.success("Internal note added.");
      }
    } catch (err) {
      toast.error(err.message || "Could not save note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (isPending || loading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">Loading candidate evaluation workspace...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Staff Privilege Required</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The candidate review workspace requires verified recruiter or administrative privileges.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={`/admin/login?redirect=/admin/review/${id}`}>
            <Button className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
              Staff Portal Login &rarr;
            </Button>
          </Link>
          <Link href="/passport">
            <Button variant="outline" className="border-slate-700 text-slate-300 text-xs">
              Candidate Passport
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  if (error || !applicant) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h1 className="text-xl font-bold text-slate-100">Candidate Not Found</h1>
        <p className="text-xs text-slate-400">{error || "Could not retrieve the requested record."}</p>
        <Link href="/admin">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white">Back to Admin Panel</Button>
        </Link>
      </main>
    );
  }

  const applicantName = applicant.Name || applicant.applicant?.name || "Applicant";
  const applicantEmail = applicant.Email || applicant.applicant?.email || "";
  const regNo = applicant.RegistrationNumber || applicant.applicant?.registrationNumber || "—";
  const phone = applicant.Phone || applicant.applicant?.phone || "—";
  const deptName = applicant.Department || applicant.departmentName || "General";
  const answers = applicant.answers || [];

  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 gap-1.5 h-9 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Candidates</span>
              </Button>
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-slate-400 font-mono truncate max-w-[200px]">
              {id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={"px-3 py-1 rounded-full text-xs font-bold border " + rubricStats.gradeColor}>
              Rubric Score: {rubricStats.total}/40 ({rubricStats.percentage}%) · {rubricStats.grade}
            </span>
          </div>
        </div>

        {/* 1. 6-Phase Interactive Stepper Header */}
        <section className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold text-2xl shadow-inner">
                {applicantName.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
                    {applicantName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 border border-blue-800 text-blue-300">
                    {deptName}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {applicantEmail}
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-slate-500" />
                    {regNo}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    {phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage Selector Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {currentPhase < 6 && (
                <Button
                  size="sm"
                  disabled={isUpdatingPhase}
                  onClick={() => handleSetPhase(currentPhase + 1)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs gap-1.5 h-9 rounded-xl shadow-lg shadow-emerald-900/30"
                >
                  <span>Promote to Phase {currentPhase + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveScores}
                disabled={isSavingScores}
                className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs gap-1.5 h-9 rounded-xl"
              >
                <Save className="w-3.5 h-3.5 text-blue-400" />
                <span>Save Rubric Scores</span>
              </Button>
            </div>
          </div>

          {/* 6-Phase Pipeline Visual Stepper */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {RECRUITMENT_PHASES.map((p) => {
                const isCurrent = currentPhase === p.phase;
                const isPassed = currentPhase > p.phase;

                return (
                  <button
                    key={p.phase}
                    type="button"
                    onClick={() => handleSetPhase(p.phase)}
                    className={"p-3 rounded-2xl border text-left transition-all relative overflow-hidden " + (
                      isCurrent
                        ? "bg-blue-600/20 border-blue-500 shadow-md ring-1 ring-blue-500"
                        : isPassed
                        ? "bg-emerald-950/30 border-emerald-800/60 hover:border-emerald-700"
                        : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700 opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Phase {p.phase}
                      </span>
                      {isPassed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      ) : null}
                    </div>
                    <div className="text-xs font-bold text-slate-100 mt-1 truncate">
                      {p.shortName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* 2. Main Two-Column Review Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Full Technical Answers & Diagnostics (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Response Diagnostics Card */}
            {diagnostics && (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <span>Response Diagnostics</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {diagnostics.totalAnswers} Questions Answered
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div className="text-lg font-bold text-slate-200">{diagnostics.totalWords}</div>
                    <div className="text-[10px] text-slate-400">Total Words</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div className="text-lg font-bold text-blue-400">{diagnostics.avgWords}</div>
                    <div className="text-[10px] text-slate-400">Avg Words / Answer</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                    <div className={"text-lg font-bold " + (diagnostics.briefAnswers.length > 0 ? "text-amber-400" : "text-emerald-400")}>
                      {diagnostics.briefAnswers.length}
                    </div>
                    <div className="text-[10px] text-slate-400">Brief Responses (&lt;20c)</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Submitted Responses ({answers.length})</span>
              </h2>
              <span className="text-xs text-slate-500 font-mono">Immutable Schema v2</span>
            </div>

            {answers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-sm text-slate-400">
                No recorded questionnaire responses found.
              </div>
            ) : (
              <div className="space-y-4">
                {answers.map((ans, idx) => {
                  const valStr = String(ans.value || "");
                  const isCode = valStr.includes("{") || valStr.includes("function") || valStr.includes("=>") || valStr.includes("import");

                  return (
                    <div
                      key={ans.questionId || idx}
                      className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 shadow-sm hover:border-slate-700/80 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                            Question {idx + 1}
                          </span>
                          <h3 className="text-sm font-bold text-slate-200 leading-snug">
                            {ans.questionText || ans.questionId}
                          </h3>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 shrink-0">
                          {ans.type || "text"}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
                        {isCode ? (
                          <pre className="text-xs text-emerald-300 font-mono whitespace-pre-wrap break-words overflow-x-auto">
                            {valStr}
                          </pre>
                        ) : (
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                            {valStr || <span className="italic text-slate-500">No response provided</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Scoring Rubric, Checklist & Notes (1 col) */}
          <div className="space-y-6">
            {/* Numeric Scoring Rubric Card */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-100">Evaluation Rubric</h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {rubricStats.total} / 40
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Technical Proficiency</span>
                    <span className="font-mono text-blue-400">{scores.technical}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scores.technical}
                    onChange={(e) => setScores({ ...scores, technical: parseInt(e.target.value, 10) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Problem Solving & Logic</span>
                    <span className="font-mono text-blue-400">{scores.problemSolving}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scores.problemSolving}
                    onChange={(e) => setScores({ ...scores, problemSolving: parseInt(e.target.value, 10) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Domain Depth & Projects</span>
                    <span className="font-mono text-blue-400">{scores.domainDepth}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scores.domainDepth}
                    onChange={(e) => setScores({ ...scores, domainDepth: parseInt(e.target.value, 10) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-medium">
                    <span>Communication & Culture Fit</span>
                    <span className="font-mono text-blue-400">{scores.cultureFit}/10</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={scores.cultureFit}
                    onChange={(e) => setScores({ ...scores, cultureFit: parseInt(e.target.value, 10) })}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveScores}
                disabled={isSavingScores}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 rounded-xl gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Candidate Scorecard</span>
              </Button>
            </div>

            {/* Evaluation Checklist */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Evaluation Checklist</h3>
              </div>
              <div className="space-y-2 text-xs">
                {Object.entries({
                  identityVerified: "Identity & Email Verified",
                  technicalDepthChecked: "Technical Response Depth Verified",
                  experienceEvaluated: "Portfolio & GitHub Evaluated",
                  interviewTopicIdentified: "Interview Focus Areas Formulated",
                }).map(([key, label]) => (
                  <label
                    key={key}
                    onClick={() => toggleChecklistItem(key)}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors"
                  >
                    {checklist[key] ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={checklist[key] ? "text-slate-200" : "text-slate-400"}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Recruiter Internal Notes */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">Internal Notes</h3>
              </div>

              <form onSubmit={handleAddNote} className="space-y-2.5">
                <Textarea
                  placeholder="Add evaluation note (e.g. strong React experience, candidate cleared live coding)..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="bg-slate-950/80 border-slate-700 text-xs min-h-[70px] resize-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] rounded-lg px-2 py-1"
                  >
                    <option value="Technical">Technical</option>
                    <option value="Culture Fit">Culture Fit</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Interview Topic">Interview Topic</option>
                  </select>
                  <Button
                    type="submit"
                    disabled={isSubmittingNote || !newNoteText.trim()}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 h-7 rounded-lg"
                  >
                    <span>Post</span>
                  </Button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {notes.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No notes added yet.</p>
                ) : (
                  notes.map((n, i) => (
                    <div key={n.id || i} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-purple-400 uppercase">
                          {n.category || "Staff"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {n.authorName || "Reviewer"}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
