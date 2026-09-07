"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { FileEdit, ArrowRight, Trash2, Clock, Sparkles } from "lucide-react";

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

            // Extract department names from key
            const parts = key.split(":");
            const deptsString = parts.slice(2).join(":");
            const depts = deptsString ? deptsString.split("|") : [];

            // Check if any departments in this draft are still unsubmitted
            const pendingDepts = depts.filter((d) => !submittedDepts.includes(d));

            // Count answered fields
            let answeredCount = 0;
            let totalFields = 4; // Name, Reg, Phone, WhyJoin
            if (values.Name) answeredCount++;
            if (values.RegistrationNumber) answeredCount++;
            if (values.Phone) answeredCount++;
            if (values["Why do you want to join Organization Name?"]) answeredCount++;

            Object.keys(values).forEach((k) => {
              if (
                ![
                  "Name",
                  "RegistrationNumber",
                  "Email",
                  "Phone",
                  "Gender",
                  "Year of Study",
                  "Why do you want to join Organization Name?",
                ].includes(k) &&
                values[k]
              ) {
                answeredCount++;
                totalFields++;
              }
            });

            if (pendingDepts.length > 0 && answeredCount > 0) {
              const percent = Math.min(100, Math.round((answeredCount / totalFields) * 100));
              foundDraft = {
                key,
                departments: pendingDepts,
                percent,
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
    const depts = activeDraft.departments;
    const query = new URLSearchParams();
    if (depts[0]) query.set("dept1", depts[0]);
    if (depts[1]) query.set("dept2", depts[1]);
    router.push(`/join?${query.toString()}`);
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
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900/90 to-indigo-950/80 border border-blue-500/30 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Unsaved Application in Progress
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-900/60 text-blue-200 border border-blue-700">
                {activeDraft.percent}% Complete
              </span>
            </div>
            <p className="text-xs text-slate-300">
              You have an unfinished application for{" "}
              <span className="font-semibold text-blue-300">
                {activeDraft.departments.join(" & ")}
              </span>
              . Continue where you left off.
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
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-3 gap-1.5 shadow-md"
          >
            <span>Continue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
