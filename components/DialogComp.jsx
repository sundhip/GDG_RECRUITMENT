"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, AlertCircle } from "lucide-react";
import CarouselComp from "./CarouselComp";
import { toast } from "sonner";

export default function DialogComp({ selectedApplicants }) {
  const [shortlistStatus, setShortlistStatus] = useState([]);

  // Initialize shortlist status when selection changes
  useEffect(() => {
    const list = selectedApplicants();
    const status = list.map((applicant) => Boolean(applicant.shortlisted));
    setShortlistStatus(status);
  }, [selectedApplicants]);

  const handleShortlist = async (index) => {
    const list = selectedApplicants();
    const applicant = list[index];
    if (!applicant) return;
    const isShortlisted = shortlistStatus[index];
    const appId = applicant._id || applicant.id || applicant.submissionId;

    try {
      const res = await fetch(`/api/shortlist/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !isShortlisted }),
      });

      if (res.ok) {
        const updatedStatus = [...shortlistStatus];
        updatedStatus[index] = !isShortlisted;
        setShortlistStatus(updatedStatus);
        toast.success(
          `Applicant ${applicant.Name || ""} has been ${
            !isShortlisted ? "shortlisted" : "removed from shortlist"
          }!`
        );
      } else {
        throw new Error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error.message);
      toast.error("Failed to update applicant status");
    }
  };

  const currentSelection = selectedApplicants();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 gap-1.5"
        >
          <Eye className="w-4 h-4 text-blue-400" />
          <span>View Responses</span>
          {currentSelection.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-bold">
              {currentSelection.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[85vw] md:max-w-[75vw] lg:max-w-[65vw] bg-slate-950 border border-slate-800 text-slate-100 p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-100">
            Applicant Responses & Evaluation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Review detailed motivation statements and department-specific questionnaire responses.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          {currentSelection.length > 0 ? (
            <CarouselComp
              dataList={currentSelection}
              handleShortlist={handleShortlist}
              shortlistStatus={shortlistStatus}
            />
          ) : (
            <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-300">
                No Applicant Selected
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Select one or more applicants in the table rows to inspect their responses.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

