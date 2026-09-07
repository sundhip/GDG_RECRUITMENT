"use client";

import React, { useState, useMemo } from "react";
import { useRouter, notFound } from "next/navigation";
import { reviews } from "@/constants/index";
import NavBar from "@/components/NavBar";
import FormComp from "@/components/FormComp";
import Footer from "@/components/Footer";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";

const JoinDepartmentPage = ({ params }) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isSignedIn = !!user;

  const joinIds = params?.joinIds || [];

  const valid = useMemo(() => {
    if (!joinIds.length) return false;
    return joinIds.every(
      (id) => reviews.some((dept) => dept.id === id) || id.startsWith("clerk_")
    );
  }, [joinIds]);

  const departments = useMemo(() => {
    return reviews.filter((dept) => joinIds.includes(dept.id));
  }, [joinIds]);

  if (!valid) {
    notFound();
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
            <p className="text-sm text-slate-400">Verifying application session...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavBar />
      <div className="flex-1">
        {isSignedIn ? (
          <FormComp
            dept1={departments[0]}
            dept2={departments[1]}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        ) : (
          <main className="max-w-xl mx-auto px-4 py-20 text-center">
            <div className="p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100">Authentication Required</h1>
              <p className="text-sm text-slate-400 mt-2">
                Please sign in with your student email account to access the application form and save your progress.
              </p>
              <Button
                onClick={() => router.push("/auth/signin")}
                className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Continue</span>
              </Button>
            </div>
          </main>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default JoinDepartmentPage;

