"use client";

import React from "react";
import { GDGEmblem } from "@/components/GDGLogo";

const DWASFWLoader = ({ message = "Loading GDG Portal..." }) => {
  return (
    <div className="min-h-[50vh] w-full flex flex-col items-center justify-center p-6 bg-background text-foreground animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center gap-5 p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl max-w-sm w-full text-center">
        {/* Ambient colored background pulse */}
        <div className="absolute inset-0 bg-blue-600/10 rounded-3xl blur-2xl pointer-events-none animate-pulse" />

        {/* Top Accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58] rounded-t-3xl" />

        {/* Animated GDG Emblem */}
        <div className="relative p-3 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
          <GDGEmblem className="w-16 h-10" animated={true} />
        </div>

        <div className="flex flex-col items-center gap-2 relative z-10">
          <h3 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1.5">
            <span>Google Developer Groups</span>
          </h3>
          <p className="text-xs text-slate-400 font-medium animate-pulse">
            {message}
          </p>
        </div>

        {/* 4 Google Colors Indicator */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#4285F4] animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-[#EA4335] animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-[#F4B400] animate-bounce [animation-delay:300ms]" />
          <span className="w-2 h-2 rounded-full bg-[#0F9D58] animate-bounce [animation-delay:450ms]" />
        </div>
      </div>
    </div>
  );
};

export default DWASFWLoader;
