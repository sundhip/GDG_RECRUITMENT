"use client";

import React, { useState } from "react";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import DraftResumeBanner from "@/components/DraftResumeBanner";
import TechnicalDepartments from "@/components/TechnicalDepartments";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";

const DepartmentsListPage = () => {
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const { submittedDepartments = [] } = useSubmissions();

  const remainingSlots = Math.max(0, 2 - submittedDepartments.length);

  const toggleDepartment = (dept) => {
    const deptName = dept.name;
    const deptAlias = dept.alias;

    if (submittedDepartments.includes(deptName) || submittedDepartments.includes(deptAlias)) {
      toast.error(`You have already submitted an application for ${deptName}.`);
      return;
    }

    if (remainingSlots <= 0) {
      toast.error("You have already submitted the maximum allowed (2) applications.");
      return;
    }

    setSelectedDepartments((current) => {
      const isSelected = current.includes(deptName) || current.includes(deptAlias) || current.includes(dept.id);

      if (isSelected) {
        return current.filter((item) => item !== deptName && item !== deptAlias && item !== dept.id);
      }

      if (current.length >= remainingSlots) {
        toast.error(`You can select at most ${remainingSlots} department(s).`);
        return current;
      }

      return [...current, deptName];
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <NavBar />
      <DraftResumeBanner />

      <main className="flex-1 w-full py-6">
        <TechnicalDepartments
          selectedDepartments={selectedDepartments}
          onToggleDepartment={toggleDepartment}
        />
      </main>

      <Footer />
    </div>
  );
};

export default DepartmentsListPage;


