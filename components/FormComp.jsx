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
import {
  WHY_GDG_QUESTIONS,
  TECHNICAL_INTEREST_QUESTIONS,
  DEPARTMENT_QUESTIONNAIRES,
  PROJECT_QUESTIONS,
  REFLECTION_QUESTIONS,
  findDepartment,
  QuestionnaireData,
} from "@/constants";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";
import {
  User,
  Heart,
  Compass,
  Layers,
  FolderGit2,
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
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

const normalizeDeptName = (str) =>
  str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

const FormComp = ({ dept1, dept2, isLoading, setIsLoading }) => {
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;
  const isSignedIn = Boolean(user);
  const isLoaded = !isPending;

  // Step 1: Personal, Step 2: Why GDG, Step 3: Tech Interests, Step 4: Dept Questions, Step 5: Projects, Step 6: Review & Reflection, Step 7: Receipt
  const [currentStep, setCurrentStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDepartments, setSubmittedDepartments] = useState([]);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [confirmedPledge, setConfirmedPledge] = useState(true);
  const [submissionReceipts, setSubmissionReceipts] = useState([]);
  const [expandedHelp, setExpandedHelp] = useState({});

  const router = useRouter();
  const { submittedDepartments: contextSubmitted, markDepartmentsSubmitted } =
    useSubmissions();
  const debounceTimerRef = useRef(null);

  const selectedDepartmentObjects = useMemo(() => {
    return [dept1, dept2]
      .filter(Boolean)
      .map((d) => (typeof d === "string" ? findDepartment(d) || { name: d, id: d } : d));
  }, [dept1, dept2]);

  const departmentNames = useMemo(
    () => selectedDepartmentObjects.map((d) => d.name),
    [selectedDepartmentObjects]
  );

  const draftKey =
    user?.email && departmentNames.length
      ? `recruitment-draft:${user.email}:${[...departmentNames].sort().join("|")}`
      : null;

  // Resolve questions per department
  const deptQuestionsMap = useMemo(() => {
    const map = {};
    selectedDepartmentObjects.forEach((deptObj) => {
      const qd = DEPARTMENT_QUESTIONNAIRES.find(
        (item) =>
          normalizeDeptName(item.department) === normalizeDeptName(deptObj.name) ||
          item.departmentId === deptObj.id
      );
      map[deptObj.name] = qd?.questions ?? [];
    });
    return map;
  }, [selectedDepartmentObjects]);

  // Build dynamic form schema
  const formSchema = useMemo(() => {
    const schemaObj = {
      Name: z.string().min(2, "Full Name is required (at least 2 characters)"),
      RegistrationNumber: z
        .string()
        .min(1, "Registration number is required")
        .regex(
          /^(23|24|25|26)[a-zA-Z]{3}\d{3,5}$/,
          "Registration number must start with year 23-26 followed by 3 branch letters and 3-5 digits (e.g. 25BCE1328, 25EEE1562, 26ECE176)"
        ),
      Email: z.string(),
      Phone: z
        .string()
        .min(1, "Phone number is required")
        .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
      Gender: z.string().optional(),
      "Year of Study": z.string().optional(),
      GitHubUrl: z.string().optional(),
      LinkedInUrl: z.string().optional(),
      PortfolioUrl: z.string().optional(),

      // Backward compatibility alias for motivation
      "Why do you want to join Organization Name?": z.string().optional(),
    };

    // Why GDG Questions
    WHY_GDG_QUESTIONS.forEach((q) => {
      schemaObj[q.id] = q.required
        ? z.string().min(3, `${q.label} is required`)
        : z.string().optional();
    });

    // Technical Interests Questions
    TECHNICAL_INTEREST_QUESTIONS.forEach((q) => {
      schemaObj[q.id] = q.required
        ? z.string().min(1, `${q.label} is required`)
        : z.string().optional();
    });

    // Department Specific Questions
    Object.values(deptQuestionsMap).forEach((qList) => {
      qList.forEach((q) => {
        schemaObj[q.id] = q.required
          ? z.string().min(3, `${q.label} is required`)
          : z.string().optional();
        // Also map name key for legacy lookup
        if (q.name && q.name !== q.id) {
          schemaObj[q.name] = z.string().optional();
        }
      });
    });

    // Projects Questions
    PROJECT_QUESTIONS.forEach((q) => {
      schemaObj[q.id] = q.required
        ? z.string().min(1, `${q.label} is required`)
        : z.string().optional();
    });

    // Reflection Questions
    REFLECTION_QUESTIONS.forEach((q) => {
      schemaObj[q.id] = z.string().optional();
    });

    return z.object(schemaObj);
  }, [deptQuestionsMap]);

  const defaultValues = useMemo(() => {
    const defaults = {
      Name: "",
      RegistrationNumber: "",
      Email: "",
      Phone: "",
      Gender: "",
      "Year of Study": "1st Year",
      GitHubUrl: "",
      LinkedInUrl: "",
      PortfolioUrl: "",
      "Why do you want to join Organization Name?": "",
    };

    WHY_GDG_QUESTIONS.forEach((q) => (defaults[q.id] = ""));
    TECHNICAL_INTEREST_QUESTIONS.forEach((q) => (defaults[q.id] = ""));
    Object.values(deptQuestionsMap).forEach((qList) => {
      qList.forEach((q) => {
        defaults[q.id] = "";
        if (q.name) defaults[q.name] = "";
      });
    });
    PROJECT_QUESTIONS.forEach((q) => (defaults[q.id] = ""));
    REFLECTION_QUESTIONS.forEach((q) => (defaults[q.id] = ""));

    return defaults;
  }, [deptQuestionsMap]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues,
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
        const cached =
          typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

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

  // Derived Progress Calculation
  const progressStats = useMemo(() => {
    const requiredKeys = [
      "Name",
      "RegistrationNumber",
      "Phone",
      ...WHY_GDG_QUESTIONS.filter((q) => q.required).map((q) => q.id),
      ...TECHNICAL_INTEREST_QUESTIONS.filter((q) => q.required).map((q) => q.id),
      ...Object.values(deptQuestionsMap).flatMap((list) =>
        list.filter((q) => q.required).map((q) => q.id)
      ),
      ...PROJECT_QUESTIONS.filter((q) => q.required).map((q) => q.id),
    ];

    let totalTracked = requiredKeys.length;
    let answeredTracked = 0;

    requiredKeys.forEach((key) => {
      const val = watchedValues?.[key];
      if (val && String(val).trim().length > 0) {
        answeredTracked += 1;
      }
    });

    const percent =
      totalTracked > 0 ? Math.round((answeredTracked / totalTracked) * 100) : 0;

    return {
      total: totalTracked,
      answered: answeredTracked,
      percent,
    };
  }, [deptQuestionsMap, watchedValues]);

  const toggleHelp = (qId) => {
    setExpandedHelp((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  // Pre-Flight Quality Diagnostics
  const preFlightAnalysis = useMemo(() => {
    const answersList = [];

    // Collect all text responses
    [
      ...WHY_GDG_QUESTIONS,
      ...TECHNICAL_INTEREST_QUESTIONS,
      ...Object.values(deptQuestionsMap).flat(),
      ...PROJECT_QUESTIONS,
      ...REFLECTION_QUESTIONS,
    ].forEach((q) => {
      const val = watchedValues?.[q.id] || watchedValues?.[q.name];
      if (val && String(val).trim().length > 0 && typeof val === "string") {
        answersList.push({
          question: q.label || q.name,
          value: String(val).trim(),
          type: q.type,
        });
      }
    });

    // Check for brief answers on long-text questions (< 20 chars)
    const shortAnswers = answersList.filter(
      (a) => a.type === "long-text" && a.value.length < 20
    );

    // Duplicate detection: group by lowercase normalized value
    const duplicates = [];
    const seenValues = new Map();
    answersList.forEach((a) => {
      if (a.value.length >= 10) {
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

  // Step Validation Handlers
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
    const requiredWhyKeys = WHY_GDG_QUESTIONS.filter((q) => q.required).map(
      (q) => q.id
    );
    const isValid = await form.trigger(requiredWhyKeys);
    if (isValid) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please answer all required Why GDG questions.");
    }
  };

  const validateStep3 = async () => {
    const requiredTechKeys = TECHNICAL_INTEREST_QUESTIONS.filter((q) => q.required).map(
      (q) => q.id
    );
    const isValid = await form.trigger(requiredTechKeys);
    if (isValid) {
      setCurrentStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please answer all required technical interest questions.");
    }
  };

  const validateStep4 = async () => {
    const requiredDeptKeys = Object.values(deptQuestionsMap)
      .flat()
      .filter((q) => q.required)
      .map((q) => q.id);
    const isValid = await form.trigger(requiredDeptKeys);
    if (isValid) {
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please answer all required department questions.");
    }
  };

  const validateStep5 = async () => {
    const requiredProjectKeys = PROJECT_QUESTIONS.filter((q) => q.required).map(
      (q) => q.id
    );
    const isValid = await form.trigger(requiredProjectKeys);
    if (isValid) {
      setCurrentStep(6);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please answer the project section questions.");
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400">Loading GDG recruitment portal...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage("");

    const pendingDepartments = selectedDepartmentObjects.filter(
      (deptObj) => !submittedDepartments.includes(deptObj.name)
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
      GitHubUrl: values.GitHubUrl || "",
      LinkedInUrl: values.LinkedInUrl || "",
      PortfolioUrl: values.PortfolioUrl || "",
    };

    const submitDepartment = async (deptObj) => {
      const deptQuestions = deptQuestionsMap[deptObj.name] || [];

      // Primary general motivation
      const motivationAnswer =
        values["general.motivation"] ||
        values["Why do you want to join Organization Name?"] ||
        "";

      // Build structured answers array with canonical metadata
      const answersArray = [
        ...(motivationAnswer
          ? [
              {
                questionId: "q_general_why_join",
                questionText: "What interests you about joining GDG on Campus · VIT Chennai?",
                questionVersion: 1,
                type: "long-text",
                value: motivationAnswer,
              },
            ]
          : []),
        ...WHY_GDG_QUESTIONS.filter((q) => q.id !== "general.motivation").map((q) => ({
          questionId: q.id,
          questionText: q.label,
          questionVersion: q.version || 1,
          type: q.type,
          value: values[q.id] || "",
        })),
        ...TECHNICAL_INTEREST_QUESTIONS.map((q) => ({
          questionId: q.id,
          questionText: q.label,
          questionVersion: q.version || 1,
          type: q.type,
          value: values[q.id] || "",
        })),
        ...deptQuestions.map((q) => ({
          questionId: q.id,
          questionText: q.label || q.name,
          questionVersion: q.version || 1,
          type: q.type || "generic",
          value: values[q.id] || values[q.name] || "",
        })),
        ...PROJECT_QUESTIONS.map((q) => ({
          questionId: q.id,
          questionText: q.label,
          questionVersion: q.version || 1,
          type: q.type,
          value: values[q.id] || "",
        })),
        ...REFLECTION_QUESTIONS.map((q) => ({
          questionId: q.id,
          questionText: q.label,
          questionVersion: q.version || 1,
          type: q.type,
          value: values[q.id] || "",
        })),
      ];

      // Build dictionary map for legacy compatibility
      const questionsMap = {};
      answersArray.forEach((ans) => {
        questionsMap[ans.questionText] = ans.value;
        questionsMap[ans.questionId] = ans.value;
      });
      if (motivationAnswer) {
        questionsMap["Why do you want to join Organization Name?"] = motivationAnswer;
      }

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basicDetails,
          Department: deptObj.name,
          departmentId: deptObj.id,
          departmentSlug: deptObj.slug,
          Questions: questionsMap,
          Answers: answersArray,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Could not submit ${deptObj.name}.`);
      }

      const result = await response.json();
      return {
        department: deptObj.name,
        departmentId: deptObj.id,
        success: true,
        submissionId:
          result.submissionId ||
          `sub_${(values.Email || "applicant").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${
            deptObj.id || deptObj.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
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
        result.status === "rejected" ? [pendingDepartments[index].name] : []
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
        // Step 7: Application Submitted Receipt
        setCurrentStep(7);
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

  // STEP 7: APPLICATION SUBMITTED RECEIPT VIEW
  if (currentStep === 7) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-center relative overflow-hidden">
          {/* Top Google accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#F4B400] to-[#0F9D58]" />

          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GDG on Campus · VIT Chennai · Recruitment 2026</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Official Application Receipt
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-lg mx-auto">
            Thank you, <span className="text-white font-semibold">{form.getValues("Name")}</span>. Your application has been securely recorded and submitted to department leads for review.
          </p>

          {/* Receipt Details Box */}
          <div className="mt-8 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 sm:p-6 text-left divide-y divide-slate-800/60">
            <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium">Applied Technical Departments</span>
              <div className="flex flex-wrap gap-2">
                {departmentNames.map((d) => (
                  <span
                    key={d}
                    className="px-3 py-1 rounded-lg bg-blue-950/80 border border-blue-800/70 text-blue-300 text-xs font-bold"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium">Canonical Submission ID(s)</span>
              <div className="flex flex-col gap-1.5 font-mono text-xs text-slate-200">
                {submissionReceipts.length > 0
                  ? submissionReceipts.map((r) => (
                      <span key={r.submissionId} className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-[11px]">
                        {r.submissionId}
                      </span>
                    ))
                  : departmentNames.map((d) => (
                      <span key={d} className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800 text-[11px]">
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
              <span className="text-xs text-slate-400 font-medium">Registered Candidate Email</span>
              <span className="text-xs text-slate-200 font-medium">{user?.email}</span>
            </div>
          </div>

          {/* Application Lifecycle Tracker */}
          <div className="mt-8 text-left">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Application Lifecycle Tracker</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Submitted</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Answers recorded and indexed securely.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/50">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>2. Under Review</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Domain leads evaluate candidate responses.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 opacity-80">
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
              onClick={() => router.push("/passport")}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 shadow-lg shadow-emerald-950"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>View Application Passport</span>
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full sm:w-auto border-slate-700 hover:bg-slate-800 text-slate-200 gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const stepsConfig = [
    { id: 1, label: "About You", icon: User },
    { id: 2, label: "Why GDG?", icon: Heart },
    { id: 3, label: "Interests & Campus", icon: Compass },
    { id: 4, label: "Department Questions", icon: Layers },
    { id: 5, label: "Projects & Experience", icon: FolderGit2 },
    { id: 6, label: "Review & Confirm", icon: CheckSquare },
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stepper Navigation Header */}
      <nav aria-label="Application Progress" className="mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
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
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? "bg-blue-950/50 border-blue-500 text-white shadow-md ring-1 ring-blue-500/40"
                    : isDone
                    ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer"
                    : "bg-slate-950/30 border-slate-900/80 text-slate-600 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isDone
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
                </div>
                <div className="overflow-hidden">
                  <div className="text-[9px] uppercase font-bold tracking-wider text-slate-400">
                    Step {step.id}
                  </div>
                  <div className="text-xs font-semibold truncate">{step.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Live Derived Progress Bar */}
        <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-bold text-blue-400">{progressStats.percent}% Completed</span>
            <span className="text-slate-600">·</span>
            <span>
              {progressStats.answered} of {progressStats.total} required questions answered
            </span>
          </div>
          <div className="w-full sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
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
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            {/* STEP 1: PERSONAL INFORMATION */}
            {currentStep === 1 && (
              <section aria-labelledby="step1-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
                    <User className="w-3.5 h-3.5" />
                    <span>Candidate Profile</span>
                  </div>
                  <h2 id="step1-heading" className="text-xl font-bold text-white">
                    Step 1: About You
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Please provide your contact, academic, and optional profile details.
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
                            placeholder="e.g. 25BCE1328, 25EEE1562, 26ECE176"
                            className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 uppercase font-mono"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px] text-slate-400">
                          Format: Year (23-26), 3 branch letters, 3-5 digits (e.g. 25BCE1328)
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
                          Derived from your verified login session.
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
                          10 digit Indian mobile number without +91
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

                  <FormField
                    control={form.control}
                    name="GitHubUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">GitHub Profile URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://github.com/username"
                            className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="LinkedInUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200">LinkedIn Profile URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://linkedin.com/in/username"
                            className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500"
                          />
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
                    <span>Next: Why GDG?</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 2: WHY GDG? */}
            {currentStep === 2 && (
              <section aria-labelledby="step2-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    <span>Community & Motivation</span>
                  </div>
                  <h2 id="step2-heading" className="text-xl font-bold text-white">
                    Step 2: Why GDG?
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Help us understand what brings you to GDG on Campus · VIT Chennai and how you want to learn, build, and grow with the student community.
                  </p>
                </div>

                <div className="space-y-5">
                  {WHY_GDG_QUESTIONS.map((q, idx) => (
                    <FormField
                      key={q.id}
                      control={form.control}
                      name={q.id}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
                          <FormLabel className="text-slate-200 text-sm font-semibold">
                            {idx + 1}. {q.label} {q.required && "*"}
                          </FormLabel>
                          {q.helperText && (
                            <p className="text-[11px] text-slate-400">{q.helperText}</p>
                          )}
                          <FormControl>
                            {q.type === "short-text" ? (
                              <Input
                                {...field}
                                placeholder={q.placeholder || "Your answer..."}
                                className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm"
                              />
                            ) : q.type === "multiple-choice" ? (
                              <div className="space-y-2 pt-1">
                                {q.options?.map((opt) => {
                                  const currentVals = field.value
                                    ? String(field.value).split(" | ")
                                    : [];
                                  const isSelected = currentVals.includes(opt);

                                  return (
                                    <label
                                      key={opt}
                                      className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        isSelected
                                          ? "bg-blue-950/40 border-blue-500/60 text-blue-200"
                                          : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          let updated = [...currentVals];
                                          if (e.target.checked) {
                                            updated.push(opt);
                                          } else {
                                            updated = updated.filter((v) => v !== opt);
                                          }
                                          field.onChange(updated.join(" | "));
                                        }}
                                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <Textarea
                                {...field}
                                rows={4}
                                placeholder={q.placeholder || "Share your thoughts in 2-3 paragraphs..."}
                                className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm leading-relaxed"
                              />
                            )}
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

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
                    <span>Next: Technical Interests</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 3: TECHNICAL INTERESTS & CAMPUS PROJECT */}
            {currentStep === 3 && (
              <section aria-labelledby="step3-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
                    <Compass className="w-3.5 h-3.5 text-blue-400" />
                    <span>Exploration & Campus Impact</span>
                  </div>
                  <h2 id="step3-heading" className="text-xl font-bold text-white">
                    Step 3: Technical Interests & Campus Project
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tell us what domains excite you and propose a creative project idea for students at VIT Chennai.
                  </p>
                </div>

                <div className="space-y-5">
                  {TECHNICAL_INTEREST_QUESTIONS.map((q, idx) => (
                    <FormField
                      key={q.id}
                      control={form.control}
                      name={q.id}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
                          <FormLabel className="text-slate-200 text-sm font-semibold">
                            {idx + 1}. {q.label} {q.required && "*"}
                          </FormLabel>
                          {q.helperText && (
                            <p className="text-[11px] text-slate-400">{q.helperText}</p>
                          )}
                          <FormControl>
                            {q.type === "multiple-choice" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options?.map((opt) => {
                                  const currentVals = field.value
                                    ? String(field.value).split(" | ")
                                    : [];
                                  const isSelected = currentVals.includes(opt);

                                  return (
                                    <label
                                      key={opt}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        isSelected
                                          ? "bg-blue-950/40 border-blue-500/60 text-blue-200"
                                          : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          let updated = [...currentVals];
                                          if (e.target.checked) {
                                            updated.push(opt);
                                          } else {
                                            updated = updated.filter((v) => v !== opt);
                                          }
                                          field.onChange(updated.join(" | "));
                                        }}
                                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : q.type === "single-choice" ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options?.map((opt) => (
                                  <label
                                    key={opt}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      field.value === opt
                                        ? "bg-blue-950/40 border-blue-500/60 text-blue-200"
                                        : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value={opt}
                                      checked={field.value === opt}
                                      onChange={() => field.onChange(opt)}
                                      className="border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <Textarea
                                {...field}
                                rows={4}
                                placeholder={q.placeholder || "Describe your campus project idea and approach..."}
                                className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm leading-relaxed"
                              />
                            )}
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

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
                    <span>Next: Department Questions</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 4: DEPARTMENT QUESTIONS */}
            {currentStep === 4 && (
              <section aria-labelledby="step4-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Domain Problem Solving</span>
                  </div>
                  <h2 id="step4-heading" className="text-xl font-bold text-white">
                    Step 4: Department Specific Questions
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Answer the thoughtful, reasoning-focused questions for your chosen department(s). Remember: Beginners are evaluated on curiosity and thinking process.
                  </p>
                </div>

                {departmentNames.map((deptName) => {
                  const questions = deptQuestionsMap[deptName] || [];

                  return (
                    <div key={deptName} className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <h3 className="text-base font-bold text-white">{deptName} Questionnaire</h3>
                      </div>

                      {questions.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No specific questionnaire found for this department.</p>
                      ) : (
                        questions.map((question, idx) => {
                          const isCompact = question.type === "short-text";

                          return (
                            <div key={question.id || idx} className="space-y-1.5 pt-2">
                              <FormField
                                control={form.control}
                                name={question.id}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-slate-200 text-xs sm:text-sm font-semibold flex items-start gap-1.5">
                                      <span className="text-blue-400">{idx + 1}.</span>
                                      <span>{question.label} {question.required && "*"}</span>
                                    </FormLabel>
                                    {question.helperText && (
                                      <p className="text-[11px] text-slate-400 leading-relaxed">
                                        {question.helperText}
                                      </p>
                                    )}
                                    <FormControl>
                                      {question.type === "single-choice" ? (
                                        <div className="space-y-1.5 pt-1">
                                          {question.options?.map((opt) => (
                                            <label
                                              key={opt}
                                              className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer ${
                                                field.value === opt
                                                  ? "bg-blue-950/40 border-blue-500/60 text-blue-200"
                                                  : "bg-slate-900/40 border-slate-800 text-slate-300"
                                              }`}
                                            >
                                              <input
                                                type="radio"
                                                name={question.id}
                                                value={opt}
                                                checked={field.value === opt}
                                                onChange={() => field.onChange(opt)}
                                                className="border-slate-700 bg-slate-950 text-blue-600"
                                              />
                                              <span>{opt}</span>
                                            </label>
                                          ))}
                                        </div>
                                      ) : isCompact ? (
                                        <Input
                                          {...field}
                                          placeholder={question.placeholder || "Your answer..."}
                                          className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm"
                                        />
                                      ) : (
                                        <Textarea
                                          {...field}
                                          rows={4}
                                          placeholder={question.placeholder || "Explain your thinking, approach, or technical perspective..."}
                                          className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm leading-relaxed"
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
                                  onClick={() => toggleHelp(question.id)}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                  <Lightbulb className="w-3 h-3 text-amber-400" />
                                  <span>
                                    {expandedHelp[question.id] ? "Hide reviewer guidance" : "What reviewers look for"}
                                  </span>
                                </button>
                                {expandedHelp[question.id] && (
                                  <div className="mt-1.5 p-3 rounded-lg bg-blue-950/40 border border-blue-900/50 text-xs text-slate-300 space-y-1 animate-in fade-in duration-150">
                                    <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                      <span>Reviewer Advice</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                      We care about your problem-solving approach, technical reasoning, and how you articulate trade-offs. Beginners are fully encouraged to explain how they would start learning!
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
                    onClick={() => setCurrentStep(3)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={validateStep4}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 gap-2"
                  >
                    <span>Next: Projects & Experience</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 5: PROJECTS & EXPERIENCE */}
            {currentStep === 5 && (
              <section aria-labelledby="step5-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
                    <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hands-On Building</span>
                  </div>
                  <h2 id="step5-heading" className="text-xl font-bold text-white">
                    Step 5: Projects & Experience
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Share a project or experiment you worked on — or tell us what you dream of building if you are just getting started!
                  </p>
                </div>

                <div className="space-y-5">
                  {PROJECT_QUESTIONS.map((q, idx) => (
                    <FormField
                      key={q.id}
                      control={form.control}
                      name={q.id}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
                          <FormLabel className="text-slate-200 text-sm font-semibold">
                            {idx + 1}. {q.label} {q.required && "*"}
                          </FormLabel>
                          {q.helperText && (
                            <p className="text-[11px] text-slate-400">{q.helperText}</p>
                          )}
                          <FormControl>
                            {q.type === "single-choice" ? (
                              <div className="space-y-2 pt-1">
                                {q.options?.map((opt) => (
                                  <label
                                    key={opt}
                                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      field.value === opt
                                        ? "bg-blue-950/40 border-blue-500/60 text-blue-200"
                                        : "bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700"
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value={opt}
                                      checked={field.value === opt}
                                      onChange={() => field.onChange(opt)}
                                      className="border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : q.type === "short-text" ? (
                              <Input
                                {...field}
                                placeholder={q.placeholder || "Your answer..."}
                                className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm"
                              />
                            ) : (
                              <Textarea
                                {...field}
                                rows={4}
                                placeholder={q.placeholder || "Describe the project, challenges, and technologies used..."}
                                className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-sm leading-relaxed"
                              />
                            )}
                          </FormControl>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(4)}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={validateStep5}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 gap-2"
                  >
                    <span>Next: Review & Confirm</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* STEP 6: FINAL REFLECTION, PRE-FLIGHT CHECK & REVIEW */}
            {currentStep === 6 && (
              <section aria-labelledby="step6-heading" className="space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-300 text-xs font-semibold mb-2">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Final Review</span>
                  </div>
                  <h2 id="step6-heading" className="text-xl font-bold text-white">
                    Step 6: Review & Final Confirmation
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Review your application responses carefully. You can jump back to any previous section using the edit buttons.
                  </p>
                </div>

                {/* Final Reflection Questions */}
                <div className="space-y-4 p-5 rounded-2xl bg-slate-950/50 border border-slate-800">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">One Last Thing (Optional)</h3>
                  </div>

                  {REFLECTION_QUESTIONS.map((q) => (
                    <FormField
                      key={q.id}
                      control={form.control}
                      name={q.id}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-slate-300 text-xs font-semibold">
                            {q.label}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              rows={3}
                              placeholder={q.placeholder || "Share any final thoughts..."}
                              className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-xs leading-relaxed"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {/* Smart Pre-Flight Quality Check */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
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
                      <span className="text-xs font-bold text-white">
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

                {/* Section Review Blocks with Jump Links */}
                {/* 1. Personal Information Summary */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span>1. Personal Information</span>
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Step 1</span>
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

                {/* 2. Why GDG Summary */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span>2. Why GDG? Responses</span>
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Step 2</span>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {WHY_GDG_QUESTIONS.map((q) => {
                      const answer = form.getValues(q.id);
                      return (
                        <div key={q.id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-xs">
                          <span className="font-medium text-slate-300 block">{q.label}</span>
                          <span className="text-slate-400 block mt-1 leading-relaxed">
                            {answer ? String(answer) : <span className="text-slate-600 italic">Not answered</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Department Questions Summary */}
                {departmentNames.map((deptName) => {
                  const questions = deptQuestionsMap[deptName] || [];

                  return (
                    <div key={deptName} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-purple-400" />
                          <span>4. {deptName} Questionnaire</span>
                        </h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setCurrentStep(4)}
                          className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-950/40 h-7 gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Step 4</span>
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {questions.map((q, idx) => {
                          const answer = form.getValues(q.id) || form.getValues(q.name);
                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/40 text-xs">
                              <span className="font-medium text-slate-300 block">{q.label}</span>
                              <span className="text-slate-400 block mt-1 leading-relaxed">
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
                <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-900/40 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="pledge"
                    checked={confirmedPledge}
                    onChange={(e) => setConfirmedPledge(e.target.checked)}
                    className="mt-1 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="pledge" className="text-xs text-slate-300 cursor-pointer select-none leading-relaxed">
                    I confirm that all responses submitted are authentic and written by me. I understand that I can apply for a maximum of 2 technical departments for GDG on Campus · VIT Chennai.
                  </label>
                </div>

                <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(5)}
                    disabled={isSubmitting}
                    className="border-slate-800 text-slate-300 hover:bg-slate-800 gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Projects</span>
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
