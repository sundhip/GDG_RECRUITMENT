"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import * as z from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { QuestionnaireData } from "@/constants";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";
import {
  User,
  FileText,
  Layers,
  CheckSquare,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Clock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Send,
  Home,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const normaliseQuestion = (question) =>
  typeof question === "string"
    ? { name: question, type: "generic", placeholder: "2-3 sentences" }
    : question;

const normalizeDeptName = (str) =>
  str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

const FormComp = ({ dept1, dept2, isLoading, setIsLoading }) => {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isSignedIn = Boolean(user);
  const isLoaded = !isPending;

  const [currentStep, setCurrentStep] = useState(1); // 1: Personal, 2: General, 3: Dept, 4: Review, 5: Success
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDepartments, setSubmittedDepartments] = useState([]);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [confirmedPledge, setConfirmedPledge] = useState(true);
  const [submissionReceipts, setSubmissionReceipts] = useState([]);

  const router = useRouter();
  const { submittedDepartments: contextSubmitted, markDepartmentsSubmitted } =
    useSubmissions();
  const debounceTimerRef = useRef(null);

  const departmentNames = useMemo(
    () =>
      [dept1, dept2].filter(Boolean).map((d) => (typeof d === "string" ? d : d.name)),
    [dept1, dept2]
  );

  const draftKey =
    user?.email && departmentNames.length
      ? `recruitment-draft:${user.email}:${[...departmentNames].sort().join("|")}`
      : null;

  // Resolve questionnaire questions for the selected departments
  const deptQuestionsMap = useMemo(() => {
    const map = {};
    departmentNames.forEach((dept) => {
      const qd = QuestionnaireData.find(
        (item) => normalizeDeptName(item.department) === normalizeDeptName(dept)
      );
      map[dept] = (qd?.questions ?? [])
        .map(normaliseQuestion)
        .filter(
          (q) =>
            q.name !== "Why do you want to join Organization Name?" &&
            q.name !== "Why do you want to join DWASFW?"
        );
    });
    return map;
  }, [departmentNames]);

  const questionData = useMemo(() => {
    return [
      ...new Set(
        departmentNames.flatMap((department) =>
          (
            QuestionnaireData.find(
              (item) => normalizeDeptName(item.department) === normalizeDeptName(department)
            )?.questions ?? []
          )
            .map(normaliseQuestion)
            .map((question) => question.name)
        )
      ),
    ];
  }, [departmentNames]);

  const formSchema = useMemo(() => {
    const schemaObj = {
      Name: z.string().min(2, "Full Name is required (at least 2 characters)"),
      RegistrationNumber: z
        .string()
        .min(1, "Registration number is required")
        .regex(
          /^\d{2}[A-Z]{3}\d{4}$/,
          "Registration number format must be e.g. 25BCE5612 (2 numbers, 3 uppercase letters, 4 numbers)"
        ),
      Email: z.string(),
      Phone: z
        .string()
        .min(1, "Phone number is required")
        .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
      Gender: z.string().optional(),
      "Year of Study": z.string().optional(),
      "Why do you want to join Organization Name?": z
        .string()
        .min(10, "Please provide at least 10 characters for your motivation statement"),
    };

    questionData.forEach((qd) => {
      schemaObj[qd] = z.string().optional();
    });

    return z.object(schemaObj);
  }, [questionData]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      Name: "",
      RegistrationNumber: "",
      Email: "",
      Phone: "",
      Gender: "",
      "Year of Study": "1st Year",
      "Why do you want to join Organization Name?": "",
    },
  });

  // Initialize draft from localStorage and check remote submission status
  useEffect(() => {
    if (!isLoaded || !user || !draftKey) return;

    const email = user.email;
    let isActive = true;
    setIsDraftReady(false);

    try {
      const savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
      form.reset({ ...form.getValues(), ...savedDraft.values, Email: email });
    } catch {
      form.setValue("Email", email);
    }

    async function initialiseForm() {
      let remoteSubmitted = contextSubmitted || [];

      if (!remoteSubmitted.length) {
        const cacheKey = `submitted_depts_${email}`;
        const cached = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

        if (cached) {
          try {
            remoteSubmitted = JSON.parse(cached);
          } catch {}
        } else {
          try {
            const response = await fetch(
              `/api/check-applications?email=${encodeURIComponent(email)}`
            );
            const result = await response.json();
            if (result?.submittedDepartments) {
              remoteSubmitted = result.submittedDepartments;
              if (typeof window !== "undefined") {
                sessionStorage.setItem(cacheKey, JSON.stringify(remoteSubmitted));
              }
            }
          } catch (err) {
            console.error("Failed to check applications:", err);
          }
        }
      }

      if (!isActive) return;
      const completed = [...new Set(remoteSubmitted)];
      setSubmittedDepartments(completed);

      if (completed.length >= 2) {
        setErrorMessage("You have already submitted the maximum allowed (2) applications.");
      } else if (
        departmentNames.length > 0 &&
        departmentNames.every((dept) => completed.includes(dept))
      ) {
        setErrorMessage(
          `You have already submitted applications for ${departmentNames.join(" and ")}.`
        );
      }

      setIsDraftReady(true);
    }

    initialiseForm().catch(() => {
      if (isActive) setIsDraftReady(true);
    });

    return () => {
      isActive = false;
    };
  }, [contextSubmitted, departmentNames, draftKey, form, isLoaded, user]);

  // Debounced autosave (500ms debounce)
  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    if (!isDraftReady || !draftKey) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ values: watchedValues, submittedDepartments })
        );
      } catch (err) {}
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [draftKey, isDraftReady, submittedDepartments, watchedValues]);

  // Authentic Derived Progress Calculation
  const progressStats = useMemo(() => {
    const requiredGeneral = [
      "Name",
      "RegistrationNumber",
      "Phone",
      "Why do you want to join Organization Name?",
    ];

    let totalTracked = requiredGeneral.length;
    let answeredTracked = 0;

    requiredGeneral.forEach((key) => {
      if (watchedValues?.[key] && String(watchedValues[key]).trim().length > 0) {
        answeredTracked += 1;
      }
    });

    Object.values(deptQuestionsMap).forEach((questionsList) => {
      questionsList.forEach((q) => {
        totalTracked += 1;
        if (watchedValues?.[q.name] && String(watchedValues[q.name]).trim().length > 0) {
          answeredTracked += 1;
        }
      });
    });

    const percent =
      totalTracked > 0 ? Math.round((answeredTracked / totalTracked) * 100) : 0;

    return {
      total: totalTracked,
      answered: answeredTracked,
      percent,
    };
  }, [deptQuestionsMap, watchedValues]);

  const [expandedHelp, setExpandedHelp] = useState({});

  const toggleHelp = (qName) => {
    setExpandedHelp((prev) => ({
      ...prev,
      [qName]: !prev[qName],
    }));
  };

  // Pre-Flight Quality Diagnostics (Deterministic Heuristics)
  const preFlightAnalysis = useMemo(() => {
    const answersList = [];
    const whyJoin = watchedValues?.["Why do you want to join Organization Name?"];
    if (whyJoin && String(whyJoin).trim()) {
      answersList.push({
        question: "Why do you want to join Organization Name?",
        value: String(whyJoin).trim(),
      });
    }

    Object.values(deptQuestionsMap).forEach((questionsList) => {
      questionsList.forEach((q) => {
        const val = watchedValues?.[q.name];
        if (val && String(val).trim()) {
          answersList.push({
            question: q.name,
            value: String(val).trim(),
          });
        }
      });
    });

    const shortAnswers = answersList.filter((a) => a.value.length < 20);

    // Duplicate detection: group by lowercase normalized value
    const duplicates = [];
    const seenValues = new Map();
    answersList.forEach((a) => {
      const normalized = a.value.toLowerCase();
      if (seenValues.has(normalized)) {
        duplicates.push({
          question1: seenValues.get(normalized),
          question2: a.question,
          value: a.value,
        });
      } else {
        seenValues.set(normalized, a.question);
      }
    });

    let health = "ready";
    let healthLabel = "Application Ready";
    let healthColor = "emerald";

    if (progressStats.answered < progressStats.total) {
      health = "incomplete";
      healthLabel = "Incomplete Fields";
      healthColor = "red";
    } else if (shortAnswers.length > 0 || duplicates.length > 0) {
      health = "review_suggested";
      healthLabel = "Review Suggested";
      healthColor = "amber";
    }

    return {
      answersCount: answersList.length,
      shortAnswers,
      duplicates,
      health,
      healthLabel,
      healthColor,
    };
  }, [deptQuestionsMap, progressStats, watchedValues]);

  // Step Validation Helpers
  const validateStep1 = async () => {
    const isValid = await form.trigger(["Name", "RegistrationNumber", "Phone"]);
    if (isValid) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required personal details with valid formats.");
    }
  };

  const validateStep2 = async () => {
    const isValid = await form.trigger(["Why do you want to join Organization Name?"]);
    if (isValid) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please provide your answer to the general question.");
    }
  };

  const validateStep3 = () => {
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400">Loading application...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values) => {
    if (isSubmitting) return; // Prevent double-submit
    setIsSubmitting(true);
    setErrorMessage("");

    const pendingDepartments = departmentNames.filter(
      (department) => !submittedDepartments.includes(department)
    );

    if (!pendingDepartments.length) {
      toast.success("Your applications have already been submitted.");
      setIsSubmitting(false);
      router.push("/departments");
      return;
    }

    const basicDetails = {
      Name: values.Name,
      RegistrationNumber: values.RegistrationNumber,
      Email: values.Email,
      Phone: values.Phone,
      Gender: values.Gender || "Prefer not to say",
      "Year of Study": values["Year of Study"] || "1st Year",
    };

    const submitDepartment = async (department) => {
      const deptQuestionnaire = QuestionnaireData.find(
        (item) => normalizeDeptName(item.department) === normalizeDeptName(department)
      );
      const questions = (deptQuestionnaire?.questions ?? []).map(normaliseQuestion);

      const generalWhyJoin = values["Why do you want to join Organization Name?"] || "";

      const answersArray = [
        ...(generalWhyJoin
          ? [
              {
                questionId: "q_general_why_join",
                questionText: "Why do you want to join Organization Name?",
                questionVersion: 1,
                type: "long-text",
                value: generalWhyJoin,
              },
            ]
          : []),
        ...questions
          .filter(
            (q) =>
              q.name !== "Why do you want to join Organization Name?" &&
              q.name !== "Why do you want to join DWASFW?"
          )
          .map((question) => ({
            questionId: question.id || question.questionId || question.name,
            questionText: question.questionText || question.name,
            questionVersion: question.version || 1,
            type: question.type || "generic",
            value: values[question.name] || values[question.id] || "",
          })),
      ];

      const questionsMap = questions.reduce(
        (answers, question) => ({
          ...answers,
          [question.name]: values[question.name] || "",
        }),
        generalWhyJoin
          ? { "Why do you want to join Organization Name?": generalWhyJoin }
          : {}
      );

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basicDetails,
          Department: department,
          departmentId: deptQuestionnaire?.departmentId,
          Questions: questionsMap,
          Answers: answersArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Could not submit ${department}.`);
      }

      const result = await response.json();
      return {
        department,
        success: true,
        submissionId:
          result.submissionId ||
          `sub_${(values.Email || "applicant").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${
            deptQuestionnaire?.departmentId || department.toLowerCase().replace(/[^a-z0-9]/g, "_")
          }`,
        timestamp: new Date().toISOString(),
      };
    };

    try {
      const results = await Promise.allSettled(
        pendingDepartments.map(submitDepartment)
      );
      const successful = results
        .filter((result) => result.status === "fulfilled" && result.value.success)
        .map((result) => result.value);

      const failed = results.flatMap((result, index) =>
        result.status === "rejected" ? [pendingDepartments[index]] : []
      );

      const completedDepts = [
        ...new Set([...submittedDepartments, ...successful.map((s) => s.department)]),
      ];

      setSubmittedDepartments(completedDepts);
      markDepartmentsSubmitted(completedDepts);
      setSubmissionReceipts(successful);

      if (draftKey) {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ values, submittedDepartments: completedDepts })
        );
      }
      if (typeof window !== "undefined" && values?.Email) {
        sessionStorage.setItem(
          `submitted_depts_${values.Email}`,
          JSON.stringify(completedDepts)
        );
      }

      successful.forEach((item) =>
        toast.success(`Application submitted successfully for ${item.department}!`)
      );

      if (failed.length) {
        setErrorMessage(
          `Submitted ${
            successful.length ? successful.map((s) => s.department).join(", ") : "no applications"
          }. Please retry ${failed.join(", ")}.`
        );
      } else {
        // Move to Step 5: Success Receipt
        setCurrentStep(5);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setErrorMessage(
        "Your application could not be submitted. Your saved answers have been preserved for retrying."
      );
      toast.error("Submission failed. Please check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 5: Success Receipt View
  if (currentStep === 5) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Application Successfully Submitted</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            Official Application Receipt
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Thank you, <span className="text-slate-200 font-semibold">{form.getValues("Name")}</span>. Your application is officially on record and entering technical review.
          </p>

          {/* Receipt Details Box */}
          <div className="mt-8 bg-slate-950/60 border border-slate-800 rounded-xl p-5 text-left divide-y divide-slate-800/60">
            <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium">Applied Departments</span>
              <div className="flex flex-wrap gap-2">
                {departmentNames.map((d) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-semibold"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium">Canonical Submission ID(s)</span>
              <div className="flex flex-col gap-1 font-mono text-xs text-slate-200">
                {submissionReceipts.length > 0
                  ? submissionReceipts.map((r) => (
                      <span key={r.submissionId} className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {r.submissionId}
                      </span>
                    ))
                  : departmentNames.map((d) => (
                      <span key={d} className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        sub_{user?.email?.split("@")[0]}_{d.toLowerCase().slice(0, 4)}
                      </span>
                    ))}
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Submission Timestamp</span>
              <span className="text-xs text-slate-300 font-mono">
                {new Date().toLocaleString()}
              </span>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Registered Email</span>
              <span className="text-xs text-slate-200 font-medium">{user?.email}</span>
            </div>
          </div>

          {/* Timeline / What's Next */}
          <div className="mt-8 text-left">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Application Review Timeline</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1. Submitted</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Answers recorded and indexed securely.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-950/30 border border-blue-800/40">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>2. Under Review</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Department leads evaluate technical responses.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/60 opacity-75">
                <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600" />
                  <span>3. Interview Invite</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Shortlisted candidates will receive email invites.
                </p>
              </div>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-slate-200 gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Button>
            {submittedDepartments.length < 2 && (
              <Button
                onClick={() => router.push("/departments")}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white gap-2"
              >
                <span>Apply to Another Department</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const stepsConfig = [
    { id: 1, label: "Personal Details", icon: User },
    { id: 2, label: "General Questions", icon: FileText },
    { id: 3, label: "Department Questions", icon: Layers },
    { id: 4, label: "Review & Confirm", icon: CheckSquare },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stepper Navigation Header */}
      <nav aria-label="Application Progress" className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {stepsConfig.map((step) => {
            const Icon = step.icon;
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (isDone) setCurrentStep(step.id);
                }}
                disabled={!isDone && !isCurrent}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? "bg-blue-950/40 border-blue-500 text-slate-100 shadow-md ring-1 ring-blue-500/30"
                    : isDone
                    ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                    : "bg-slate-950/30 border-slate-900 text-slate-600 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                    Step {step.id}
                  </div>
                  <div className="text-xs font-medium truncate">{step.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Derived Progress Bar */}
        <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-semibold text-blue-400">{progressStats.percent}% Completed</span>
            <span className="text-slate-600">·</span>
            <span>
              {progressStats.answered} of {progressStats.total} fields answered
            </span>
          </div>
          <div className="w-full sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressStats.percent}%` }}
            />
          </div>
        </div>
      </nav>

      {/* Error Message Box */}
      {errorMessage && !isSubmitting && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm">{errorMessage}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/departments")}
            className="border-red-800 text-red-300 hover:bg-red-950"
          >
            Change Dept
          </Button>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* STEP 1: PERSONAL DETAILS */}
            {currentStep === 1 && (
              <section aria-labelledby="step1-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 id="step1-heading" className="text-xl font-bold text-slate-100">
                    Step 1: Personal Information
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Please provide your contact and academic details.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Jane Doe"
                            className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="RegistrationNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Registration Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. 25BCE5612"
                            className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 uppercase font-mono"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-slate-400">
                          Format: 2 digits, 3 letters, 4 digits (e.g. 25BCE5612)
                        </FormDescription>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Email Address (Verified)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            readOnly
                            type="email"
                            className="bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-slate-400">
                          Derived from your authenticated session.
                        </FormDescription>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">WhatsApp / Phone Number *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. 9876543210"
                            className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-slate-400">
                          10 digit mobile number without country code
                        </FormDescription>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Gender</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            value={field.value || ""}
                            className="w-full h-10 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="Year of Study"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">Year of Study</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            value={field.value || "1st Year"}
                            className="w-full h-10 px-3 py-2 rounded-md bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-6 border-t border-slate-800 flex justify-end">
                  <Button
                    type="button"
                    onClick={validateStep1}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 gap-2"
                  >
                    <span>Next: General Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 2: GENERAL QUESTION */}
            {currentStep === 2 && (
              <section aria-labelledby="step2-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 id="step2-heading" className="text-xl font-bold text-slate-100">
                    Step 2: General Application Questions
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Help us understand your motivation to join our organization.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="Why do you want to join Organization Name?"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200 text-sm font-semibold">
                        Why do you want to join Organization Name? *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={6}
                          placeholder="Tell us about your background, interests, and what you hope to contribute and learn..."
                          className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm leading-relaxed"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-slate-400">
                        Aim for 2–4 concise paragraphs explaining your goals.
                      </FormDescription>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={validateStep2}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 gap-2"
                  >
                    <span>Next: Department Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 3: DEPARTMENT QUESTIONS */}
            {currentStep === 3 && (
              <section aria-labelledby="step3-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 id="step3-heading" className="text-xl font-bold text-slate-100">
                    Step 3: Department Specific Questions
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Answer the technical and domain-specific questions for your selected department(s).
                  </p>
                </div>

                {departmentNames.map((deptName) => {
                  const questions = deptQuestionsMap[deptName] || [];

                  return (
                    <div key={deptName} className="p-5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <h3 className="text-base font-bold text-slate-200">{deptName} Questionnaire</h3>
                      </div>

                      {questions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No specific questionnaire for this department.</p>
                      ) : (
                        questions.map((question, idx) => {
                          const isCompact = question.type === "short-text";

                          return (
                            <div key={question.id || question.name || idx} className="space-y-1.5">
                              <FormField
                                control={form.control}
                                name={question.name}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-slate-300 text-xs font-semibold">
                                      {idx + 1}. {question.name}
                                    </FormLabel>
                                    <FormControl>
                                      {isCompact ? (
                                        <Input
                                          {...field}
                                          placeholder={question.placeholder || "Your answer..."}
                                          className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                                        />
                                      ) : (
                                        <Textarea
                                          {...field}
                                          rows={4}
                                          placeholder={question.placeholder || "Provide 2-3 sentences explaining your experience or approach..."}
                                          className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm"
                                        />
                                      )}
                                    </FormControl>
                                    <FormMessage className="text-red-400 text-xs" />
                                  </FormItem>
                                )}
                              />
                              <div className="pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleHelp(question.name)}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                  <Lightbulb className="w-3 h-3 text-amber-400" />
                                  <span>
                                    {expandedHelp[question.name] ? "Hide reviewer guidance" : "What reviewers look for"}
                                  </span>
                                </button>
                                {expandedHelp[question.name] && (
                                  <div className="mt-1.5 p-3 rounded-lg bg-blue-950/40 border border-blue-900/50 text-xs text-slate-300 space-y-1 animate-in fade-in duration-150">
                                    <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                      <span>Evaluation Advice</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                      Mention concrete project examples, specific tools/libraries you used, technical hurdles you overcame, and how you want to grow in this role.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}

                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(2)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={validateStep3}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 gap-2"
                  >
                    <span>Next: Review & Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 4: PRE-SUBMISSION REVIEW */}
            {currentStep === 4 && (
              <section aria-labelledby="step4-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 id="step4-heading" className="text-xl font-bold text-slate-100">
                    Step 4: Review & Final Confirmation
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Please review your submission carefully before sending. You can jump back to edit any section.
                  </p>
                </div>

                {/* Pre-Flight Quality Check Assistant */}
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    preFlightAnalysis.health === "ready"
                      ? "bg-emerald-950/20 border-emerald-800/40"
                      : preFlightAnalysis.health === "review_suggested"
                      ? "bg-amber-950/20 border-amber-800/40"
                      : "bg-red-950/20 border-red-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles
                        className={`w-4 h-4 ${
                          preFlightAnalysis.health === "ready"
                            ? "text-emerald-400"
                            : preFlightAnalysis.health === "review_suggested"
                            ? "text-amber-400"
                            : "text-red-400"
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-200">
                        Smart Pre-Flight Quality Check
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        preFlightAnalysis.health === "ready"
                          ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700"
                          : preFlightAnalysis.health === "review_suggested"
                          ? "bg-amber-950/80 text-amber-300 border border-amber-700"
                          : "bg-red-950/80 text-red-300 border border-red-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          preFlightAnalysis.health === "ready"
                            ? "bg-emerald-400"
                            : preFlightAnalysis.health === "review_suggested"
                            ? "bg-amber-400"
                            : "bg-red-400"
                        }`}
                      />
                      {preFlightAnalysis.healthLabel}
                    </span>
                  </div>

                  {preFlightAnalysis.health === "ready" ? (
                    <p className="text-xs text-emerald-300/90">
                      All responses are thoughtfully structured with good detail. Your application looks strong for submission!
                    </p>
                  ) : (
                    <div className="space-y-1.5 text-xs text-slate-300">
                      {preFlightAnalysis.shortAnswers.length > 0 && (
                        <div className="flex items-start gap-2 text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            {preFlightAnalysis.shortAnswers.length} response(s) are very brief (&lt; 20 characters). Adding more context about your experience can strengthen your review.
                          </span>
                        </div>
                      )}
                      {preFlightAnalysis.duplicates.length > 0 && (
                        <div className="flex items-start gap-2 text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            Identical responses detected across multiple questions. Tailoring your answers per question is recommended.
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 italic">
                        Note: Pre-flight checks are advisory only. You can submit whenever you feel ready.
                      </p>
                    </div>
                  )}
                </div>

                {/* Personal Details Summary */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span>Personal Information</span>
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Full Name</span>
                      <span className="font-semibold text-slate-200">{form.getValues("Name") || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Reg Number</span>
                      <span className="font-mono font-semibold text-slate-200">{form.getValues("RegistrationNumber") || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Email</span>
                      <span className="font-mono text-slate-200 truncate block">{form.getValues("Email") || user?.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Phone</span>
                      <span className="font-semibold text-slate-200">{form.getValues("Phone") || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* General Motivation Summary */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span>General Motivation Statement</span>
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/50 p-3 rounded border border-slate-800/50">
                    &ldquo;{form.getValues("Why do you want to join Organization Name?") || "No answer provided."}&rdquo;
                  </p>
                </div>

                {/* Department Answers Summary */}
                {departmentNames.map((deptName) => {
                  const questions = deptQuestionsMap[deptName] || [];

                  return (
                    <div key={deptName} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <span>{deptName} Questions</span>
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setCurrentStep(3)}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {questions.map((q, idx) => {
                          const answer = form.getValues(q.name);
                          return (
                            <div key={idx} className="p-2.5 rounded bg-slate-900/40 border border-slate-800/40 text-xs">
                              <span className="font-medium text-slate-300 block">{q.name}</span>
                              <span className="text-slate-400 block mt-1">
                                {answer ? String(answer) : <span className="text-slate-600 italic">Not answered</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Submission Pledge */}
                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="pledge"
                    checked={confirmedPledge}
                    onChange={(e) => setConfirmedPledge(e.target.checked)}
                    className="mt-1 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="pledge" className="text-xs text-slate-300 cursor-pointer select-none">
                    I confirm that all responses submitted are accurate and written by me. I understand that I can apply for a maximum of 2 departments.
                  </label>
                </div>

                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(3)}
                    disabled={isSubmitting}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Questions</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !confirmedPledge}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 shadow-lg shadow-blue-950 gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Official Application</span>
                      </>
                    )}
                  </Button>
                </div>
              </section>
            )}
          </form>
        </Form>
      </div>
    </main>
  );
};

export default FormComp;

