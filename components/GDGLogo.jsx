"use client";

import React from "react";
import Link from "next/link";

export function GDGEmblem({ className = "w-10 h-6", animated = false }) {
  return (
    <div className={"relative inline-flex items-center justify-center shrink-0 " + className}>
      <svg
        viewBox="0 0 160 90"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={"w-full h-full drop-shadow-sm " + (animated ? "animate-pulse" : "")}
      >
        {/* Left Bracket - Top Red */}
        <path d="M52 14 L18 45 L29 55 L63 24 Z" fill="#EA4335" />
        {/* Left Bracket - Bottom Blue */}
        <path d="M18 45 L52 76 L63 66 L29 35 Z" fill="#4285F4" />
        {/* Right Bracket - Top Green */}
        <path d="M108 14 L142 45 L131 55 L97 24 Z" fill="#0F9D58" />
        {/* Right Bracket - Bottom Yellow */}
        <path d="M142 45 L108 76 L97 66 L131 35 Z" fill="#F4B400" />
      </svg>
    </div>
  );
}

export default function GDGLogo({
  showSubtitle = true,
  subtitle = "Recruitments 2026",
  size = "md",
  href = "/",
}) {
  const sizeClasses = {
    sm: {
      emblem: "w-8 h-5",
      title: "text-sm font-bold",
      subtitle: "text-[10px]",
      gap: "gap-2",
    },
    md: {
      emblem: "w-10 h-6 sm:w-11 sm:h-7",
      title: "text-base sm:text-lg font-extrabold",
      subtitle: "text-[11px] font-medium",
      gap: "gap-2.5",
    },
    lg: {
      emblem: "w-14 h-9 sm:w-16 sm:h-10",
      title: "text-xl sm:text-2xl font-black",
      subtitle: "text-xs font-semibold",
      gap: "gap-3.5",
    },
  }[size] || {
    emblem: "w-10 h-6",
    title: "text-base font-extrabold",
    subtitle: "text-[11px]",
    gap: "gap-2.5",
  };

  const Content = (
    <div className={"inline-flex items-center " + sizeClasses.gap + " group select-none"}>
      <GDGEmblem className={sizeClasses.emblem} />
      <div className="flex flex-col leading-tight">
        <div className={"tracking-tight text-white flex items-center gap-1.5 " + sizeClasses.title}>
          <span>Google Developer Groups</span>
        </div>
        {showSubtitle && (
          <span className={"text-slate-400 group-hover:text-blue-400 transition-colors tracking-wide " + sizeClasses.subtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg p-1 -m-1 transition-opacity hover:opacity-95"
      >
        {Content}
      </Link>
    );
  }

  return Content;
}
