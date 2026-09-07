"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";
import { GDGEmblem } from "@/components/GDGLogo";

export const TECHNICAL_DEPARTMENTS = [
  {
    id: "6a89c4e2-7b19-4f32-821e-9821a41b5201",
    name: "Blockchain",
    alias: "∫_BkY2C_xu",
    bgColor: "bg-[#F4B400]",
    bgHover: "hover:bg-[#E5A800]",
    accentColor: "#F4B400",
    iconSrc: "/assets/images/icons/blockchain.svg",
    description:
      "Explores decentralized technologies by building blockchain-based applications, hosting workshops, and educating members about cryptocurrency, smart contracts, and the future of Web3 innovations.",
  },
  {
    id: "9055864f-c7dc-44cd-91d5-8759d32a496a",
    name: "Game Dev",
    alias: "Ω_GmF6X_ny",
    bgColor: "bg-[#4285F4]",
    bgHover: "hover:bg-[#3367D6]",
    accentColor: "#4285F4",
    iconSrc: "/assets/images/icons/game-dev.svg",
    description:
      "Combines creativity and technical skills to design engaging, entertaining games, giving members hands-on experience with real-world game development tools, engines, and production workflows.",
  },
  {
    id: "339f0f8a-72f2-44b9-92ab-2b0d4dcfa0f6",
    name: "App Dev",
    alias: "∑_ApZ3V_gh",
    bgColor: "bg-[#EA4335]",
    bgHover: "hover:bg-[#D93025]",
    accentColor: "#EA4335",
    iconSrc: "/assets/images/icons/app-dev.svg",
    description:
      "Builds intuitive, impactful mobile applications that bring GDG's ideas to life, improving accessibility, interaction, and convenience for members and event participants through functional, user-focused design.",
  },
  {
    id: "e2ed9c2c-c36c-457f-a8bb-cf2e8bc7c2e1",
    name: "UI/UX",
    alias: "ø_UxK2_mj",
    bgColor: "bg-[#0F9D58]",
    bgHover: "hover:bg-[#0B8043]",
    accentColor: "#0F9D58",
    iconSrc: "/assets/images/icons/ui-ux.svg",
    description:
      "Designs visually appealing, user-friendly digital interfaces with a focus on accessibility, usability, and aesthetics, ensuring GDG's products provide enjoyable, intuitive, and meaningful user experiences.",
  },
  {
    id: "c0f3b1d1-ce05-45f6-9e34-ac9443fc5fcb",
    name: "Data Science",
    alias: "≈_DtB1S_zk",
    bgColor: "bg-[#EA4335]",
    bgHover: "hover:bg-[#D93025]",
    accentColor: "#EA4335",
    iconSrc: "/assets/images/icons/data-science.svg",
    description:
      "Applies AI, machine learning, and analytics to transform data into actionable insights, helping solve problems, build predictive models, and inspire innovation across projects.",
  },
  {
    id: "3e9ac635-01d4-495e-aa87-a7335a2403c2",
    name: "Competitive Programming",
    alias: "≤_CpM8P_rw",
    bgColor: "bg-[#0F9D58]",
    bgHover: "hover:bg-[#0B8043]",
    accentColor: "#0F9D58",
    iconSrc: "/assets/images/icons/cp.svg",
    description:
      "Promotes problem-solving skills through coding contests, hackathons, and peer learning, helping members sharpen algorithms, logic, and efficiency while preparing for real-world tech challenges.",
  },
  {
    id: "8143de1d-db17-42fa-958d-13b10804f894",
    name: "Web Dev",
    alias: "µ_Wb₹5D_lp",
    bgColor: "bg-[#F4B400]",
    bgHover: "hover:bg-[#E5A800]",
    accentColor: "#F4B400",
    iconSrc: "/assets/images/icons/web-dev.svg",
    description:
      "Designs, develops, and maintains responsive, high-performance websites for GDG projects and events, using modern web technologies to enhance accessibility, user experience, and community engagement online.",
  },
  {
    id: "a1d920df-9eb9-49eb-b3a4-e4a3d1245ede",
    name: "Open Source",
    alias: "∂_CdH4D_bv",
    bgColor: "bg-[#4285F4]",
    bgHover: "hover:bg-[#3367D6]",
    accentColor: "#4285F4",
    iconSrc: "/assets/images/icons/open-source.svg",
    description:
      "Encourages members to contribute to open-source projects, building collaboration skills, real-world coding experience, and a culture of transparency, learning, and global tech impact.",
  },
];

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
        selectedDepartments.includes(d.alias) ||
        selectedDepartments.includes(d.id)
    ).map((d) => d.id);
  }, [selectedDepartments]);

  const handleToggle = (dept) => {
    if (typeof onToggleDepartment === "function") {
      onToggleDepartment(dept);
      return;
    }

    if (submittedDepartments.includes(dept.name) || submittedDepartments.includes(dept.alias)) {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-200 text-xs font-semibold mb-3">
              <GDGEmblem className="w-5 h-3" />
              <span>Technical Departments · Recruitments 2026</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Technical Departments
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-2xl">
              Choose up to <span className="text-slate-200 font-semibold">two departments</span>. Click any card to select your domain and begin the guided recruitment application.
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
              selectedDepartments.includes(dept.alias) ||
              selectedDepartments.includes(dept.id);

            const isSubmitted =
              submittedDepartments.includes(dept.name) ||
              submittedDepartments.includes(dept.alias);

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
                className={"group relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between min-h-[230px] sm:min-h-[250px] text-white " + dept.bgColor + " " + dept.bgHover + " " + (
                  isSubmitted
                    ? "opacity-50 grayscale cursor-not-allowed"
                    : isSelected
                    ? "ring-4 ring-white shadow-2xl scale-[1.02] z-10"
                    : "hover:-translate-y-1.5 hover:shadow-2xl hover:brightness-105 active:scale-[0.98]"
                )}
              >
                {/* Vector SVG Watermark Icon */}
                <div className="absolute -top-3 -right-3 w-32 h-32 sm:w-36 sm:h-36 pointer-events-none opacity-30 group-hover:opacity-50 transition-all duration-300 transform group-hover:scale-110 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dept.iconSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-contain filter brightness-0 invert"
                  />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                    {dept.name}
                  </h3>

                  {isSubmitted ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-black/30 backdrop-blur-sm text-white/90">
                      Applied
                    </span>
                  ) : (
                    <div
                      className={"w-6 h-6 rounded-full flex items-center justify-center transition-all " + (
                        isSelected
                          ? "bg-white text-slate-900 shadow-md scale-110"
                          : "border-2 border-white/40 bg-black/10 group-hover:border-white/80"
                      )}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  )}
                </div>

                <div className="relative z-10 mt-4">
                  <p className="text-xs sm:text-[13px] text-white/95 leading-relaxed font-normal line-clamp-4">
                    {dept.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
