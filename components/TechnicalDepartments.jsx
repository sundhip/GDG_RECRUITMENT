"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Sparkles, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { GDGEmblem } from "@/components/GDGLogo";
import { DEPARTMENTS } from "@/constants/recruitment/departments";

export const TECHNICAL_DEPARTMENTS = DEPARTMENTS;

export default function TechnicalDepartments({
  selectedDepartments = [],
  onToggleDepartment,
}) {
  const router = useRouter();
  const { submittedDepartments = [] } = useSubmissions();

  const selectedCount = selectedDepartments.length;
  const remainingSlots = Math.max(0, 2 - submittedDepartments.length);

  const selectedIds = useMemo(() => {
    return TECHNICAL_DEPARTMENTS.filter(
      (d) =>
        selectedDepartments.includes(d.name) ||
        (d.aliases && d.aliases.some((a) => selectedDepartments.includes(a))) ||
        selectedDepartments.includes(d.id)
    ).map((d) => d.id);
  }, [selectedDepartments]);

  const handleToggle = (dept) => {
    if (typeof onToggleDepartment === "function") {
      onToggleDepartment(dept);
      return;
    }

    if (
      submittedDepartments.includes(dept.name) ||
      (dept.aliases && dept.aliases.some((a) => submittedDepartments.includes(a)))
    ) {
      toast.error("You have already submitted an application for " + dept.name + ".");
      return;
    }

    router.push("/join/" + dept.id);
  };

  const handleProceed = () => {
    if (!selectedIds.length) {
      toast.error("Please select at least 1 department to proceed.");
      return;
    }
    router.push("/join/" + selectedIds.join("/"));
  };

  return (
    <section className="w-full py-8 sm:py-12" aria-label="Technical Departments">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-3">
              <GDGEmblem className="w-4 h-2.5" />
              <span>GDG on Campus · VIT Chennai · Technical Recruitment 2026</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Find Your Technical Community
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-2xl leading-relaxed">
              Choose up to <span className="text-slate-200 font-semibold">two departments</span> where you want to learn, build and contribute. Select your domains below to begin your guided GDG application.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-xl self-start md:self-auto">
            <div className="px-3 py-1 text-xs sm:text-sm font-semibold text-slate-200">
              <span className={selectedCount > 0 ? "text-blue-400 font-bold" : "text-slate-400"}>
                {selectedCount}
              </span>{" "}
              / 2 Selected
            </div>

            <Button
              onClick={handleProceed}
              disabled={selectedCount === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm px-5 h-9 sm:h-10 rounded-xl shadow-lg shadow-blue-900/40 gap-1.5 transition-all disabled:opacity-40"
            >
              <span>Continue Application</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {TECHNICAL_DEPARTMENTS.map((dept) => {
            const isSelected =
              selectedDepartments.includes(dept.name) ||
              (dept.aliases && dept.aliases.some((a) => selectedDepartments.includes(a))) ||
              selectedDepartments.includes(dept.id);

            const isSubmitted =
              submittedDepartments.includes(dept.name) ||
              (dept.aliases && dept.aliases.some((a) => submittedDepartments.includes(a)));

            return (
              <div
                key={dept.id}
                onClick={() => !isSubmitted && handleToggle(dept)}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={isSubmitted ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    if (!isSubmitted) handleToggle(dept);
                  }
                }}
                className={"group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between min-h-[250px] sm:min-h-[270px] text-white " + dept.bgColor + " " + dept.bgHover + " " + (
                  isSubmitted
                    ? "opacity-50 grayscale cursor-not-allowed"
                    : isSelected
                    ? "ring-4 ring-white shadow-2xl scale-[1.02] z-10"
                    : "hover:-translate-y-1.5 hover:shadow-2xl hover:brightness-105 active:scale-[0.98]"
                )}
              >
                {/* Vector SVG Watermark Icon */}
                <div className="absolute -top-3 -right-3 w-32 h-32 sm:w-36 sm:h-36 pointer-events-none opacity-25 group-hover:opacity-40 transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dept.iconSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-contain filter brightness-0 invert"
                  />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">
                      {dept.name}
                    </h3>
                  </div>

                  {isSubmitted ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white/90">
                      Applied
                    </span>
                  ) : (
                    <div
                      className={"w-6 h-6 rounded-full flex items-center justify-center transition-all " + (
                        isSelected
                          ? "bg-white text-slate-900 shadow-md scale-110"
                          : "border-2 border-white/50 bg-black/15 group-hover:border-white/90"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  )}
                </div>

                <div className="relative z-10 mt-3 flex flex-col gap-2">
                  <p className="text-xs sm:text-[13px] text-white/95 leading-relaxed font-normal">
                    {dept.description}
                  </p>
                  {dept.beginnerNote && (
                    <p className="text-[11px] text-white/80 italic border-t border-white/20 pt-2 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 shrink-0 text-white/90" />
                      <span>{dept.beginnerNote}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
