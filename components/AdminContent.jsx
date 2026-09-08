"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import DataTable from "./DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RECRUITMENT_PHASES, getPhaseDetails } from "@/lib/admin-auth";
import {
  ShieldCheck,
  KeyRound,
  LayoutDashboard,
  Kanban,
  Table as TableIcon,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Award,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Columns,
} from "lucide-react";

export default function AdminContent({ applicants: initialApplicants = [], isAdmin: serverIsAdmin = false, user: serverUser = null }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || serverUser;
  const isAdmin = Boolean(serverIsAdmin || user?.role === "admin");

  const [applicants, setApplicants] = useState(initialApplicants);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (isAdmin && applicants.length === 0) {
      fetch("/api/admin/applicants?full=false")
        .then((res) => res.json())
        .then((data) => {
          if (data.applicants) setApplicants(data.applicants);
        })
        .catch((err) => console.error("Error loading applicants:", err));
    }
  }, [isAdmin, applicants.length]);

  const handleUnlockAdmin = async (e) => {
    if (e) e.preventDefault();
    if (!passkeyInput.trim()) {
      toast.error("Please enter the administrative passkey.");
      return;
    }

    try {
      setIsUnlocking(true);
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey: passkeyInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Invalid administrative passkey.");
      }

      toast.success("Administrative privileges unlocked!");
      router.refresh();
      window.location.reload();
    } catch (err) {
      toast.error(err.message || "Passkey verification failed.");
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleMovePhase = async (applicant, targetPhase) => {
    const id = applicant._id || applicant.id || applicant.submissionId;
    if (!id) return;

    try {
      setUpdatingId(id);
      const res = await fetch("/api/shortlist/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPhase: targetPhase,
          shortlisted: targetPhase >= 4,
        }),
      });

      if (!res.ok) throw new Error("Failed to update candidate phase");

      const phaseInfo = getPhaseDetails(targetPhase);
      setApplicants((prev) =>
        prev.map((app) => {
          const appId = app._id || app.id || app.submissionId;
          if (appId === id) {
            return {
              ...app,
              currentPhase: targetPhase,
              phaseName: phaseInfo.name,
              shortlisted: targetPhase >= 4,
            };
          }
          return app;
        })
      );
      toast.success((applicant.Name || "Candidate") + " moved to Phase " + targetPhase + ": " + phaseInfo.name);
    } catch (err) {
      toast.error(err.message || "Error updating stage");
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = applicants.length;
    const phaseCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    applicants.forEach((app) => {
      const p = app.currentPhase || 1;
      if (phaseCounts[p] !== undefined) phaseCounts[p]++;
    });

    const shortlisted = applicants.filter((a) => Boolean(a.shortlisted) || (a.currentPhase || 1) >= 4).length;
    const selected = phaseCounts[6];
    const departments = new Set(applicants.map((a) => a.Department || a.departmentName).filter(Boolean)).size;

    return { total, phaseCounts, shortlisted, selected, departments };
  }, [applicants]);

  const departmentsList = useMemo(() => {
    const depts = new Set(applicants.map((a) => a.Department || a.departmentName).filter(Boolean));
    return Array.from(depts);
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    let result = applicants;
    if (selectedDeptFilter !== "all") {
      result = result.filter(
        (a) => (a.Department || a.departmentName) === selectedDeptFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => {
        const name = (a.Name || "").toLowerCase();
        const email = (a.Email || "").toLowerCase();
        const reg = (a.RegistrationNumber || "").toLowerCase();
        const dept = (a.Department || a.departmentName || "").toLowerCase();
        return name.includes(q) || email.includes(q) || reg.includes(q) || dept.includes(q);
      });
    }
    return result;
  }, [applicants, selectedDeptFilter, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Verification Required</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Unlock GDG Admin Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              Enter the GDG Recruitment Passkey to access candidate scorecards, the 6-phase review pipeline, and interviewer tools.
            </p>
          </div>

          <form onSubmit={handleUnlockAdmin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Administrative Passkey
              </label>
              <Input
                type="password"
                placeholder="Enter passkey (e.g. gdg2026admin)"
                value={passkeyInput}
                onChange={(e) => setPasskeyInput(e.target.value)}
                className="bg-slate-950/80 border-slate-700 text-slate-100 focus:border-blue-500 h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isUnlocking}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-900/30 gap-2"
            >
              {isUnlocking ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Verifying Passkey...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate as Admin</span>
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 border-t border-slate-800/80">
            <p className="text-[11px] text-slate-500">
              Default development passkey: <code className="text-blue-400 font-mono bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/50">gdg2026admin</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Recruiter KPI Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {RECRUITMENT_PHASES.map((p) => {
          const count = stats.phaseCounts[p.phase] || 0;
          return (
            <div
              key={p.phase}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Phase {p.phase}
                </span>
                <span className={"text-[10px] px-2 py-0.5 rounded-full font-bold " + p.badgeColor}>
                  {p.shortName}
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-100">{count}</div>
                <div className="text-[11px] text-slate-400 truncate">{p.name}</div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 2. Controls & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setActiveTab("pipeline")}
            className={"gap-2 rounded-xl text-xs font-semibold transition-all " + (
              activeTab === "pipeline"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            )}
          >
            <Kanban className="w-4 h-4" />
            <span>6-Phase Pipeline View</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("table")}
            className={"gap-2 rounded-xl text-xs font-semibold transition-all " + (
              activeTab === "table"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-800"
            )}
          >
            <TableIcon className="w-4 h-4" />
            <span>Data Table View ({applicants.length})</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Departments ({departmentsList.length})</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Instant Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-900 border-slate-700 text-slate-200 w-44 sm:w-56 rounded-xl"
            />
          </div>

          <Link href="/admin/compare">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-800/60 bg-purple-950/30 hover:bg-purple-900/40 text-purple-300 text-xs gap-1.5 h-8 rounded-xl"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare Candidates</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. View: 6-Phase Pipeline Kanban Board */}
      {activeTab === "pipeline" && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
            {RECRUITMENT_PHASES.map((phase) => {
              const phaseCandidates = filteredApplicants.filter(
                (app) => (app.currentPhase || 1) === phase.phase
              );

              return (
                <div
                  key={phase.phase}
                  className="rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col max-h-[800px] overflow-hidden"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {phase.shortName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-300">
                          {phaseCandidates.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[170px]">
                        {phase.name}
                      </p>
                    </div>
                  </div>

                  {/* Candidate Cards List */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 min-h-[140px]">
                    {phaseCandidates.length === 0 ? (
                      <div className="p-6 text-center text-[11px] text-slate-400 border border-dashed border-slate-800/60 rounded-xl">
                        No candidates in this phase
                      </div>
                    ) : (
                      phaseCandidates.map((candidate) => {
                        const candId = candidate._id || candidate.id || candidate.submissionId;
                        const isUpdating = updatingId === candId;

                        return (
                          <div
                            key={candId}
                            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-sm group"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div>
                                <h4 className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                                  {candidate.Name || "Candidate"}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                                  {candidate.Email || "No email"}
                                </p>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60 shrink-0 truncate max-w-[80px]">
                                {candidate.Department || candidate.departmentName || "General"}
                              </span>
                            </div>

                            {candidate.RegistrationNumber && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Reg: {candidate.RegistrationNumber}
                              </div>
                            )}

                            {/* Actions: Review Workspace and Advance */}
                            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                              <Link
                                href={"/admin/review/" + candId}
                                className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1"
                              >
                                <span>Review</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>

                              <div className="flex items-center gap-1">
                                {phase.phase < 6 && (
                                  <Button
                                    size="xs"
                                    disabled={isUpdating}
                                    onClick={() => handleMovePhase(candidate, phase.phase + 1)}
                                    className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/30 gap-1 h-6 transition-all"
                                  >
                                    <span>Advance</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. View: Full Operations Data Table */}
      {activeTab === "table" && (
        <section className="space-y-4">
          <DataTable data={applicants} />
        </section>
      )}
    </div>
  );
}
