"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { User, LogOut, Shield } from "lucide-react";

export default function UserButton({ user }) {
  const router = useRouter();

  if (!user) return null;

  const handleSignOut = () => {
    router.push("/auth/signout");
  };

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "U";
  };

  const isAdmin = user.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User profile menu"
          className="flex items-center gap-2 px-2 py-1 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <Avatar className="h-6 w-6 border border-slate-600">
            <AvatarImage src={user.image} alt={user.name || "User"} />
            <AvatarFallback className="text-[10px] font-semibold bg-blue-600 text-white">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-slate-200 max-w-[120px] truncate hidden sm:inline">
            {user.name || user.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-slate-100">{user.name || "Applicant"}</p>
            <p className="text-xs leading-none text-slate-400 truncate">{user.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-semibold mt-1">
                <Shield className="w-3 h-3" /> Administrator
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-800" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-400 focus:text-red-300 focus:bg-red-950/40 cursor-pointer flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
 