"use client";
import React from "react";
import { authClient } from "@/lib/auth-client";
import DataTable from "./DataTable";

const AdminContent = ({ applicants }) => {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  if (isPending) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <p className="text-gray-400">Loading admin session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8 text-center">
        <h2 className="text-xl font-bold">Authentication Required</h2>
        <p className="text-gray-400">Please sign in to access the admin panel.</p>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/auth/signin";
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
        <p className="text-red-500 font-semibold">
          Access Denied! You are not authorized to view this webpage.
        </p>
      </div>
    );
  }

  return (
    <div>
      <DataTable data={applicants} />
    </div>
  );
};

export default AdminContent;
