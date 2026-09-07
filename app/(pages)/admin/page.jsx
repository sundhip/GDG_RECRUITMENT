import React from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import { connect, serializeFirestoreData } from "@/lib/db";
import { normalizeSubmission } from "@/lib/submissions";
import { getSessionUser } from "@/lib/security";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AdminContent from "@/components/AdminContent";
import { ShieldCheck, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const reqHeaders = await headers();
  const user = await getSessionUser(reqHeaders);

  // 1. Server-side redirect for unauthenticated users
  if (!user) {
    redirect("/auth/signin");
  }

  // 2. Server-side Access Control: block non-admin users before querying Firestore
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-md p-8 rounded-2xl bg-slate-900/60 border border-red-900/40 shadow-2xl">
            <h1 className="text-2xl font-bold text-red-400">403 — Access Denied</h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Administrative privileges are required to access the applicant review operations console.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 3. Authenticated Admin: safely query Firestore and render table
  const db = await connect();
  const snapshot = await db.collection("formData").get();
  const applicants = snapshot.docs.map((doc) => {
    const serialized = serializeFirestoreData(doc.data());
    return normalizeSubmission({
      id: doc.id,
      _id: doc.id,
      ...serialized,
    });
  });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavBar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrative Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Applicant Review & Evaluation
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage incoming candidates, inspect technical responses, toggle shortlist status, and dispatch invites.
            </p>
          </div>
        </div>

        <AdminContent applicants={applicants} />
      </main>
      <Footer />
    </div>
  );
}

