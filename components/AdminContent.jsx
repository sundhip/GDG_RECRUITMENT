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
import { GDGEmblem } from "@/components/GDGLogo";
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
  Code2,
  PieChart,
  UserCheck,
  TrendingUp,
  SlidersHorizontal,
  X,
} from "lucide-react";

export default function AdminContent({
  applicants: initialApplicants = [],
  isAdmin: serverIsAdmin = false,
  user: serverUser = null,
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user || serverUser;
  const isAdmin = Boolean(serverIsAdmin || user?.role === "admin");

  const [applicants, setApplicants] = useState(initialApplicants);
  const [passkeyInput, setPasskeyInput] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [activeTab, setActiveTab] = useState("pipeline"); // "pipeline" | "table" | "analytics"
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Sync / refresh applicants from backend API
  const refreshApplicants = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch("/api/admin/applicants?full=false");
      const data = await res.json();
      if (data.applicants) {
        setApplicants(data.applicants);
        toast.success(`Refreshed ${data.applicants.length} candidate applications.`);
      }
    } catch (err) {
      console.error("Error refreshing applicants:", err);
      toast.error("Failed to refresh candidate data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin && applicants.length === 0) {
      refreshApplicants();
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
      const res = await fetch(`/api/shortlist/${id}`, {
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
      toast.success(
        `${applicant.Name || "Candidate"} advanced to Phase ${targetPhase}: ${phaseInfo.name}`
      );
    } catch (err) {
      toast.error(err.message || "Error updating candidate stage");
    } finally {
      setUpdatingId(null);
    }
  };

  // Operational KPI Statistics
  const stats = useMemo(() => {
    const total = applicants.length;
    const phaseCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const deptDistribution = {};

    applicants.forEach((app) => {
      const p = app.currentPhase || 1;
      if (phaseCounts[p] !== undefined) phaseCounts[p]++;

      const dept = app.Department || app.departmentName || "General";
      deptDistribution[dept] = (deptDistribution[dept] || 0) + 1;
    });

    const shortlisted = applicants.filter(
      (a) => Boolean(a.shortlisted) || (a.currentPhase || 1) >= 4
    ).length;
    const selected = phaseCounts[6];
    const departmentsCount = Object.keys(deptDistribution).length;
    const selectionRate = total > 0 ? ((selected / total) * 100).toFixed(1) : 0;

    return {
      total,
      phaseCounts,
      shortlisted,
      selected,
      departmentsCount,
      deptDistribution,
      selectionRate,
    };
  }, [applicants]);

  const departmentsList = useMemo(() => {
    const depts = new Set(
      applicants.map((a) => a.Department || a.departmentName).filter(Boolean)
    );
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
        return (
          name.includes(q) ||
          email.includes(q) ||
          reg.includes(q) ||
          dept.includes(q)
        );
      });
    }
    return result;
  }, [applicants, selectedDeptFilter, searchQuery]);

  // Phase color styling helper
  const getPhaseStyles = (phaseNumber) => {
    switch (phaseNumber) {
      case 1:
        return {
          badge: "bg-blue-950/80 text-blue-300 border-blue-800/80",
          accent: "from-blue-600 to-blue-400",
          border: "border-blue-500/30",
          bg: "bg-blue-950/20",
          text: "text-blue-400",
        };
      case 2:
        return {
          badge: "bg-amber-950/80 text-amber-300 border-amber-800/80",
          accent: "from-amber-600 to-amber-400",
          border: "border-amber-500/30",
          bg: "bg-amber-950/20",
          text: "text-amber-400",
        };
      case 3:
        return {
          badge: "bg-indigo-950/80 text-indigo-300 border-indigo-800/80",
          accent: "from-indigo-600 to-indigo-400",
          border: "border-indigo-500/30",
          bg: "bg-indigo-950/20",
          text: "text-indigo-400",
        };
      case 4:
        return {
          badge: "bg-purple-950/80 text-purple-300 border-purple-800/80",
          accent: "from-purple-600 to-purple-400",
          border: "border-purple-500/30",
          bg: "bg-purple-950/20",
          text: "text-purple-400",
        };
      case 5:
        return {
          badge: "bg-pink-950/80 text-pink-300 border-pink-800/80",
          accent: "from-pink-600 to-pink-400",
          border: "border-pink-500/30",
          bg: "bg-pink-950/20",
          text: "text-pink-400",
        };
      case 6:
        return {
          badge: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
          accent: "from-emerald-600 to-emerald-400",
          border: "border-emerald-500/30",
          bg: "bg-emerald-950/20",
          text: "text-emerald-400",
        };
      default:
        return {
          badge: "bg-slate-900 text-slate-300 border-slate-700",
          accent: "from-slate-600 to-slate-400",
          border: "border-slate-800",
          bg: "bg-slate-900/20",
          text: "text-slate-400",
        };
    }
  };

  // PASSKEY AUTHENTICATION MODAL (If Not Staff Admin)
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl p-6 sm:p-8 text-center space-y-6">
          {/* Top Google color bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

          <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Privilege Verification</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Unlock GDG Admin Console
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              Enter the GDG Recruitment Passkey to access candidate scorecards, the 6-phase review pipeline, and interviewer evaluation tools.
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
                className="bg-slate-950 border-slate-700 text-slate-100 focus:border-blue-500 h-11 rounded-xl text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={isUnlocking}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-11 rounded-xl shadow-lg shadow-blue-900/40 gap-2 transition-all"
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
              Default development passkey:{" "}
              <code className="text-blue-400 font-mono bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/50">
                gdg2026admin
              </code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Recruiter KPI Overview Dashboard */}
      <section aria-label="Recruitment KPIs" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {RECRUITMENT_PHASES.map((p) => {
          const count = stats.phaseCounts[p.phase] || 0;
          const styles = getPhaseStyles(p.phase);
          const percentOfTotal =
            stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

          return (
            <div
              key={p.phase}
              className={`p-4 rounded-2xl bg-slate-900/80 border ${styles.border} hover:border-slate-600 transition-all flex flex-col justify-between shadow-lg relative overflow-hidden group`}
            >
              {/* Subtle top indicator */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${styles.accent}`}
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Phase {p.phase}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${styles.badge}`}
                >
                  {p.shortName}
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {count}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {percentOfTotal}%
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium truncate mt-0.5">
                  {p.name}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 2. Operations Toolbar & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setActiveTab("pipeline")}
            className={`gap-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "pipeline"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>6-Phase Pipeline</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab("table")}
            className={`gap-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "table"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <TableIcon className="w-4 h-4" />
            <span>Master Data Table ({applicants.length})</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab("analytics")}
            className={`gap-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Domain Analytics</span>
          </Button>
        </div>

        {/* Filters & Tools */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
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
              placeholder="Search candidate name, reg, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-950 border-slate-700 text-slate-200 w-48 sm:w-60 rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Refresh Data */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshApplicants}
            disabled={isRefreshing}
            className="border-slate-700 bg-slate-950/80 hover:bg-slate-800 text-slate-200 text-xs h-8 px-2.5 rounded-xl gap-1"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {/* Side-by-Side Compare Link */}
          <Link href="/admin/compare">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-800/60 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 text-xs gap-1.5 h-8 rounded-xl shadow-sm"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Compare</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. VIEW 1: 6-PHASE KANBAN PIPELINE BOARD */}
      {activeTab === "pipeline" && (
        <section aria-label="Pipeline Board" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
            {RECRUITMENT_PHASES.map((phase) => {
              const phaseCandidates = filteredApplicants.filter(
                (app) => (app.currentPhase || 1) === phase.phase
              );
              const styles = getPhaseStyles(phase.phase);

              return (
                <div
                  key={phase.phase}
                  className={`rounded-2xl bg-slate-900/60 border ${styles.border} flex flex-col max-h-[850px] shadow-xl overflow-hidden`}
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Phase {phase.phase}: {phase.shortName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-200 border border-slate-700">
                          {phaseCandidates.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                        {phase.name}
                      </p>
                    </div>
                  </div>

                  {/* Candidate Cards List */}
                  <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 min-h-[160px] divide-y divide-transparent">
                    {phaseCandidates.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl my-2">
                        No candidates in this phase
                      </div>
                    ) : (
                      phaseCandidates.map((candidate) => {
                        const candId =
                          candidate._id ||
                          candidate.id ||
                          candidate.submissionId;
                        const isUpdating = updatingId === candId;
                        const deptName =
                          candidate.Department ||
                          candidate.departmentName ||
                          "General";

                        return (
                          <div
                            key={candId}
                            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-md group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                                  {candidate.Name || "Candidate"}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                                  {candidate.Email || "No email"}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/60 shrink-0 truncate max-w-[90px]">
                                {deptName}
                              </span>
                            </div>

                            {candidate.RegistrationNumber && (
                              <div className="text-[10px] font-mono text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800 inline-block">
                                {candidate.RegistrationNumber}
                              </div>
                            )}

                            {/* Actions: Review Workspace and Advance */}
                            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                              <Link
                                href={`/admin/review/${candId}`}
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
                                    onClick={() =>
                                      handleMovePhase(
                                        candidate,
                                        phase.phase + 1
                                      )
                                    }
                                    className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] px-2 py-0.5 rounded-lg border border-emerald-500/30 gap-1 h-6 transition-all"
                                  >
                                    <span>Advance →</span>
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

      {/* 4. VIEW 2: FULL DATA TABLE */}
      {activeTab === "table" && (
        <section aria-label="Master Table" className="space-y-4">
          <DataTable data={applicants} />
        </section>
      )}

      {/* 5. VIEW 3: DOMAIN ANALYTICS & DISTRIBUTION */}
      {activeTab === "analytics" && (
        <section aria-label="Domain Analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Total Applications
              </div>
              <div className="text-3xl font-black text-white">{stats.total}</div>
              <p className="text-[11px] text-slate-500">
                Verified across all 8 technical departments
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Shortlisted for Interview
              </div>
              <div className="text-3xl font-black text-purple-400">
                {stats.shortlisted}
              </div>
              <p className="text-[11px] text-slate-500">
                Phase 4 (Technical) and Phase 5 (Lead & HR)
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Core Team Selected
              </div>
              <div className="text-3xl font-black text-emerald-400">
                {stats.selected}
              </div>
              <p className="text-[11px] text-slate-500">
                Final Induction into GDG on Campus Core Team
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Active Selection Rate
              </div>
              <div className="text-3xl font-black text-blue-400">
                {stats.selectionRate}%
              </div>
              <p className="text-[11px] text-slate-500">
                Ratio of Phase 6 selected to total candidates
              </p>
            </div>
          </div>

          {/* Department Breakdown Grid */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Department Application Volume</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {Object.entries(stats.deptDistribution).map(([dept, count]) => {
                const percent =
                  stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;

                return (
                  <div
                    key={dept}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {dept}
                      </span>
                      <span className="text-xs font-bold text-blue-400 font-mono">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
