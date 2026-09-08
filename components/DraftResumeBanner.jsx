"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { FileEdit, ArrowRight, Trash2, Clock, Sparkles } from "lucide-react";
import { findDepartment } from "@/constants/recruitment/departments";

export default function DraftResumeBanner() {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const router = useRouter();

  const [activeDraft, setActiveDraft] = useState(null);

  useEffect(() => {
    if (isPending || !user || typeof window === "undefined") {
      setActiveDraft(null);
      return;
    }

    try {
      const email = user.email;
      let foundDraft = null;

      // Scan localStorage for keys matching recruitment-draft:email:...
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`recruitment-draft:${email}:`)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const values = parsed?.values || {};
            const submittedDepts = parsed?.submittedDepartments || [];
            const updatedAt = parsed?.updatedAt || parsed?.timestamp;

            // Extract department identifiers from key
            const parts = key.split(":");
            const deptsString = parts.slice(2).join(":");
            const rawDepts = deptsString ? deptsString.split("|") : [];

            // Resolve clean department names and canonical IDs
            const resolvedDepts = rawDepts.map((d) => {
              const deptObj = findDepartment(d);
              return {
                id: deptObj?.id || d,
                name: deptObj?.name || d,
              };
            });

            // Check if any departments in this draft are still unsubmitted
            const pendingDepts = resolvedDepts.filter(
              (d) => !submittedDepts.includes(d.name) && !submittedDepts.includes(d.id)
            );

            // Calculate answered fields count
            const totalTracked = Object.keys(values).length;
            const answeredCount = Object.values(values).filter(
              (v) => v !== null && v !== undefined && String(v).trim().length > 0
            ).length;

            if (pendingDepts.length > 0 && answeredCount > 0) {
              const percent = Math.min(100, Math.max(10, Math.round((answeredCount / Math.max(6, totalTracked)) * 100)));
              
              let timeAgo = "recently";
              if (updatedAt) {
                const diffMins = Math.round((Date.now() - new Date(updatedAt).getTime()) / 60000);
                if (diffMins < 1) timeAgo = "just now";
                else if (diffMins === 1) timeAgo = "1 minute ago";
                else if (diffMins < 60) timeAgo = `${diffMins} minutes ago`;
              }

              foundDraft = {
                key,
                departments: pendingDepts,
                deptNames: pendingDepts.map((d) => d.name),
                deptIds: pendingDepts.map((d) => d.id),
                percent,
                timeAgo,
                name: values.Name || "Applicant",
              };
              break;
            }
          }
        }
      }

      setActiveDraft(foundDraft);
    } catch (err) {
      console.error("Draft inspection error:", err);
      setActiveDraft(null);
    }
  }, [user, isPending]);

  const handleContinue = () => {
    if (!activeDraft) return;
    const ids = activeDraft.deptIds;
    if (ids.length) {
      router.push(`/join/${ids.join("/")}`);
    } else {
      router.push("/departments");
    }
  };

  const handleDiscard = () => {
    if (!activeDraft) return;
    try {
      localStorage.removeItem(activeDraft.key);
      setActiveDraft(null);
      toast.info("Draft application discarded.");
    } catch (err) {
      console.error("Failed to discard draft:", err);
    }
  };

  if (!activeDraft) return null;

  return (
    <aside
      aria-label="Resume Draft Notice"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 my-4"
    >
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-blue-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Application in Progress
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-900/60 text-blue-200 border border-blue-700">
                {activeDraft.percent}% Complete
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline flex items-center gap-1">
                · Last saved {activeDraft.timeAgo}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Continue your{" "}
              <span className="font-semibold text-blue-300">
                {activeDraft.deptNames.join(" + ")}
              </span>{" "}
              application for GDG on Campus · VIT Chennai.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            className="text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/30 h-8 px-2.5 gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard</span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleContinue}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3.5 gap-1.5 shadow-md shadow-blue-900/30"
          >
            <span>Continue Application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
