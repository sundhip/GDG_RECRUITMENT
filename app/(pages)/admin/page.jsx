import React from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { connect, serializeFirestoreData } from "@/lib/db";
import { normalizeSubmission } from "@/lib/submissions";
import { getSessionUser } from "@/lib/security";
import { isWhitelistedAdminEmail } from "@/lib/admin-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminContent from "@/components/AdminContent";
import { ShieldCheck, LayoutDashboard, Sparkles, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reqHeaders = await headers();
  const user = await getSessionUser(reqHeaders);

  // 1. Server-side redirect for unauthenticated users
  if (!user) {
    redirect("/auth/signin");
  }

  const isAdmin = Boolean(user.role === "admin" || isWhitelistedAdminEmail(user.email));

  // 2. Access Control: If not yet admin, render AdminContent with zero PII so passkey can be entered
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
          <AdminContent applicants={[]} isAdmin={false} user={user} />
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Authenticated Admin: safely query Firestore and render table & pipeline
  let applicants = [];
  try {
    const db = await connect();
    const snapshot = await db.collection("formData").get();
    applicants = snapshot.docs.map((doc) => {
      const serialized = serializeFirestoreData(doc.data());
      return normalizeSubmission({
        id: doc.id,
        _id: doc.id,
        ...serialized,
      });
    });
  } catch (err) {
    console.error("Error fetching applicants in AdminPage:", err);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavBar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/70 text-blue-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>GDG on Campus · VIT Chennai · Operations Console</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800">
                Staff Verified
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Recruitment Operations & 6-Phase Pipeline
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Real-time candidate progression across all 6 recruitment stages, scoring rubrics, technical reviews, and interview scheduling.
            </p>
          </div>
        </div>

        <AdminContent applicants={applicants} isAdmin={true} user={user} />
      </main>

      <Footer />
    </div>
  );
}
