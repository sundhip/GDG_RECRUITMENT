"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import GDGLogo from "./GDGLogo";

const footerLinks = [
  { name: "Home", path: "/" },
  { name: "Technical Departments", path: "/departments" },
  { name: "Application Passport", path: "/passport" },
  { name: "Candidate Portal", path: "/auth/signin" },
  { name: "Staff & Recruiter Portal", path: "/admin/login" },
];

const currentYear = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-10 mt-20">
      {/* Top 4-Color Google Line */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="h-1 w-24 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3.5">
            <GDGLogo subtitle="VIT Chennai · Technical Recruitment 2026" size="sm" />
            <span className="h-6 w-px bg-slate-800 hidden sm:block" />
            <div className="bg-white px-2.5 py-1 rounded-lg hidden sm:flex items-center justify-center shadow-sm">
              <Image
                src="/assets/images/vit-chennai-logo.png"
                alt="VIT Chennai"
                width={110}
                height={30}
                className="h-5 w-auto object-contain"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            A student developer community at VIT Chennai — learning, building, and growing together through real projects, workshops, and open-source collaboration.
          </p>
          <span className="text-[11px] text-slate-500">
            &copy; {currentYear} GDG on Campus · Vellore Institute of Technology, Chennai. All rights reserved.
          </span>
        </div>

        <nav aria-label="Footer Navigation" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className="text-xs text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded py-1"
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
