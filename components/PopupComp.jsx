"use client";
import React, { useEffect } from "react";
import { X, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const PopupComp = ({ isOpen, onClose, PopupData }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const header = PopupData?.header || "Recruitment Notice";
  const description = PopupData?.description || "Welcome to the recruitment portal.";
  const messages = Array.isArray(PopupData?.message)
    ? PopupData.message
    : typeof PopupData?.message === "string"
    ? [PopupData.message]
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruitment-notice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-700/80 bg-slate-900/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col gap-6 animate-in zoom-in-95 duration-200"
      >
        {/* GDG Brand Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notice"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 rounded-full p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header & Icon */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800/60 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Recruitments 2026 · Official Notice</span>
          </div>

          <h2
            id="recruitment-notice-title"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white"
          >
            {header}
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            {description}
          </p>
        </div>

        {/* Message Items */}
        {messages.length > 0 && (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-700/50 shadow-inner"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mt-0.5 text-xs font-bold">
                  {index + 1}
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                  {message}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Security badge / Footer note */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Single-device session protection & verified draft recovery enabled</span>
        </div>

        {/* Action Button */}
        <Button
          type="button"
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 sm:py-3.5 h-auto text-sm sm:text-base rounded-xl shadow-lg shadow-blue-900/40 gap-2 transition-all transform active:scale-[0.99]"
        >
          <span>Got it, Let&apos;s Continue</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default PopupComp;
