"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, BookOpen, Shield, CheckCircle2, XCircle } from "lucide-react";

export default function CarouselComp({
  dataList,
  handleShortlist,
  shortlistStatus,
}) {
  const getQuestions = (data) => {
    if (Array.isArray(data?.answers) && data.answers.length > 0) {
      return data.answers.map((a) => [
        a.questionText || a.questionId || "Question",
        a.value,
      ]);
    }

    if (!data?.Questions) return [];

    if (Array.isArray(data.Questions)) {
      return data.Questions.map((entry) => {
        if (Array.isArray(entry)) return entry;
        if (entry && typeof entry === "object") {
          return [
            entry.questionText || entry.questionId || Object.keys(entry)[0],
            entry.value ?? Object.values(entry)[0],
          ];
        }
        return ["Question", String(entry)];
      });
    }

    if (typeof data.Questions === "object") {
      return Object.entries(data.Questions);
    }

    return [];
  };

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {dataList.map((data, index) => {
          const questions = getQuestions(data);
          const isShortlisted = shortlistStatus[index];

          return (
            <CarouselItem key={data._id || data.id || index}>
              <div className="p-1">
                <Card className="h-[65vh] max-h-[65vh] bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                  {/* Header / Applicant Summary */}
                  <div className="p-4 bg-slate-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-100">
                            {data.Name || "Unnamed Applicant"}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                            {data.Department || "No Dept"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-300">{data.RegistrationNumber || "No Reg"}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {data.Email || "No Email"}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {data.Phone || "No Phone"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          isShortlisted
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {isShortlisted ? "Shortlisted" : "Pending Review"}
                      </span>
                    </div>
                  </div>

                  {/* Questionnaire Q&A List */}
                  <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {questions.length > 0 ? (
                      questions.map(([question, answer], qIndex) => {
                        const displayAnswer =
                          answer === undefined || answer === null || answer === ""
                            ? "Not Answered"
                            : answer;

                        return (
                          <div
                            key={`${question}-${qIndex}`}
                            className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-2"
                          >
                            <h4 className="text-xs font-semibold text-blue-300 flex items-start gap-1.5">
                              <span className="w-4 h-4 rounded-full bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5">
                                {qIndex + 1}
                              </span>
                              <span>{question}</span>
                            </h4>
                            <p className="text-xs text-slate-200 leading-relaxed pl-5 whitespace-pre-wrap">
                              {displayAnswer}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
                        <p className="text-sm text-slate-400">
                          No responses recorded for this applicant.
                        </p>
                      </div>
                    )}
                  </CardContent>

                  {/* Actions Footer */}
                  <div className="p-3.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-4 shrink-0">
                    <span className="text-xs text-slate-500 font-mono">
                      Applicant {index + 1} of {dataList.length}
                    </span>
                    <Button
                      onClick={() => handleShortlist(index)}
                      size="sm"
                      className={`text-xs font-semibold px-4 gap-1.5 ${
                        isShortlisted
                          ? "bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-700"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      {isShortlisted ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Remove From Shortlist</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Shortlist Applicant</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious className="left-2 bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700" />
      <CarouselNext className="right-2 bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-700" />
    </Carousel>
  );
}

