"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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

  // Notes state
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [noteCategory, setNoteCategory] = useState("Technical");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Review checklist state
  const [checklist, setChecklist] = useState({
    identityVerified: false,
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

  // Fetch applicant full data & notes
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

        // 1. Fetch full applicant record
        const res = await fetch(`/api/admin/applicants?full=true`);
        if (!res.ok) throw new Error("Failed to load applicants");
        const json = await res.json();
        const found = (json.applicants || []).find(
          (a) => a.id === id || a._id === id || a.submissionId === id
        );

        if (!found) {
          throw new Error(`Application with ID "${id}" was not found.`);
        }
        setApplicant(found);

        // 2. Fetch private recruiter notes
        const notesRes = await fetch(`/api/admin/notes/${id}`);
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

  // Handle Shortlist toggle
  const handleToggleShortlist = async () => {
    if (!applicant) return;
    const targetState = !applicant.shortlisted;
    const targetId = applicant._id || applicant.id || applicant.submissionId;

    try {
      const res = await fetch(`/api/shortlist/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: targetState }),
      });

      if (!res.ok) throw new Error("Failed to update shortlist status");

      setApplicant((prev) => ({
        ...prev,
        shortlisted: targetState,
        status: targetState ? "shortlisted" : "submitted",
      }));

      toast.success(
        targetState
          ? "Candidate shortlisted for interview!"
          : "Candidate status set to pending review."
      );
    } catch (err) {
      console.error("Shortlist update failed:", err);
      toast.error("Failed to update status");
    }
  };

  // Handle adding a recruiter note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    try {
      setIsSubmittingNote(true);
      const res = await fetch(`/api/admin/notes/${id}`, {
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
      console.error("Post note error:", err);
      toast.error(err.message || "Could not save note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Diagnostics: Compute response lengths & duplicate checks
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
        <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-100">Access Restricted</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The candidate review workspace requires verified recruiter or administrative privileges.
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

  const isShortlisted = Boolean(applicant.shortlisted);
  const applicantName = applicant.Name || applicant.applicant?.name || "Applicant";
  const applicantEmail = applicant.Email || applicant.applicant?.email || "";
  const regNo = applicant.RegistrationNumber || applicant.applicant?.registrationNumber || "—";
  const phone = applicant.Phone || applicant.applicant?.phone || "—";
  const deptName = applicant.Department || applicant.departmentName || "General";

  return (
    <div className="min-h-screen pb-20">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation & Status Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Candidates</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">{applicantName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 border border-blue-800 text-blue-300">
                {deptName}
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Submission ID: {applicant.submissionId || applicant.id}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleToggleShortlist}
              className={`font-semibold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all gap-2 ${
                isShortlisted
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-950/50"
                  : "bg-slate-800 hover:bg-emerald-950 text-slate-200 hover:text-emerald-300 border border-slate-700"
              }`}
            >
              {isShortlisted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Shortlisted for Interview</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Mark as Shortlisted</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Top Details & Diagnostics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidate Profile Info */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Applicant Profile</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Registration Number</span>
                <span className="font-mono font-bold text-slate-200">{regNo}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Email Address</span>
                <span className="font-mono text-slate-200 truncate max-w-[180px]">{applicantEmail}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Phone Number</span>
                <span className="text-slate-200">{phone}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Applied Date</span>
                <span className="text-slate-300 font-mono">
                  {applicant.createdAt
                    ? new Date(applicant.createdAt).toLocaleDateString()
                    : "Recorded"}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostics Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Response Diagnostics</span>
            </div>
            {diagnostics && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-slate-100">{diagnostics.totalAnswers}</div>
                  <div className="text-[10px] text-slate-400">Questions</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-blue-400">{diagnostics.totalWords}</div>
                  <div className="text-[10px] text-slate-400">Total Words</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-slate-100">{diagnostics.avgWords}</div>
                  <div className="text-[10px] text-slate-400">Avg Words/Q</div>
                </div>
              </div>
            )}
            <div className="text-[11px] text-slate-400">
              {diagnostics?.briefAnswers?.length === 0 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  All answers provide substantial depth
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {diagnostics.briefAnswers.length} response(s) are brief (&lt; 20 chars)
                </span>
              )}
            </div>
          </div>

          {/* Structured Review Checklist */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <span>Evaluation Checklist</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { key: "identityVerified", label: "Candidate identity verified" },
                { key: "technicalDepthChecked", label: "Technical depth evaluated" },
                { key: "experienceEvaluated", label: "Projects & experience assessed" },
                { key: "interviewTopicIdentified", label: "Interview talking points noted" },
              ].map(({ key, label }) => {
                const isChecked = checklist[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleChecklistItem(key)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 border border-slate-800/80 text-left transition-colors"
                  >
                    {isChecked ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className={isChecked ? "line-through text-slate-400" : "text-slate-200"}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Split: Questionnaire vs Private Recruiter Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Full Q&A Explorer */}
          <section className="lg:col-span-2 space-y-6" aria-label="Questionnaire Answers">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Submitted Questionnaire</span>
              </h2>
              <span className="text-xs text-slate-400">
                {applicant.answers?.length || 0} Questions Recorded
              </span>
            </div>

            <div className="space-y-4">
              {Array.isArray(applicant.answers) && applicant.answers.length > 0 ? (
                applicant.answers.map((ans, idx) => (
                  <div
                    key={ans.questionId || idx}
                    className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-blue-300">
                        Q{idx + 1}: {ans.questionText || ans.questionId}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {ans.type || "text"}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {ans.value || <span className="text-slate-600 italic">No answer provided</span>}
                    </div>
                  </div>
                ))
              ) : applicant.Questions && typeof applicant.Questions === "object" ? (
                Object.entries(applicant.Questions).map(([q, a], idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5 shadow-sm"
                  >
                    <div className="text-xs font-bold text-blue-300">{q}</div>
                    <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {String(a)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No answers available.</p>
              )}
            </div>
          </section>

          {/* Right Col: Private Recruiter Notes Thread */}
          <aside className="space-y-6" aria-label="Internal Recruiter Notes">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span>Internal Notes</span>
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800">
                Staff Only
              </span>
            </div>

            {/* Note Composer Form */}
            <form
              onSubmit={handleAddNote}
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Add Review Note</span>
                <select
                  value={noteCategory}
                  onChange={(e) => setNoteCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Technical">Technical</option>
                  <option value="Culture Fit">Culture Fit</option>
                  <option value="Portfolio">Portfolio</option>
                  <option value="Interview Topic">Interview Topic</option>
                  <option value="General">General</option>
                </select>
              </div>

              <Textarea
                rows={3}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Write private evaluation feedback, strengths, or questions for interview..."
                className="bg-slate-950 border-slate-800 text-xs focus-visible:ring-blue-500 resize-none"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingNote || !newNoteText.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3 gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>Post Note</span>
                </Button>
              </div>
            </form>

            {/* Existing Notes Feed */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950/40 border border-slate-800/60 text-center space-y-1">
                  <p className="text-xs text-slate-400">No internal notes yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Add observations to collaborate with fellow recruiters.
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300">{note.authorName}</span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-900 text-[10px]">
                        {note.category || "General"}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    <div className="text-[10px] text-slate-500 pt-1 font-mono">
                      {note.createdAt ? new Date(note.createdAt).toLocaleString() : "Just now"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
