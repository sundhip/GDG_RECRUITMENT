/**
 * Admin Authorization Helper for GDG Recruitment Portal
 */

export const DEFAULT_ADMIN_PASSKEY = "gdg2026admin";

export const ADMIN_WHITELIST = [
  "sundhipmanhooj@email.com",
  "admin@gdg.org",
  "lead@gdg.org",
  "recruitment@gdg.org",
  "admin@example.com",
];

export const RECRUITMENT_PHASES = [
  {
    phase: 1,
    id: "phase_1_applied",
    name: "Application Received",
    shortName: "Applied",
    description: "Initial application submitted and identity verified.",
    badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  {
    phase: 2,
    id: "phase_2_screening",
    name: "Aptitude and Screening",
    shortName: "Screening",
    description: "Preliminary assessment and quality diagnostics review.",
    badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  {
    phase: 3,
    id: "phase_3_domain_review",
    name: "Domain and Portfolio Review",
    shortName: "Domain Review",
    description: "Deep technical questionnaire and code/project critique.",
    badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  },
  {
    phase: 4,
    id: "phase_4_tech_interview",
    name: "Technical Interview (R1)",
    shortName: "Tech Interview",
    description: "Live coding, system architecture, and domain problem solving.",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  {
    phase: 5,
    id: "phase_5_lead_interview",
    name: "Lead and Culture Fit (R2)",
    shortName: "Lead & HR",
    description: "GDG community alignment, leadership potential, and fit.",
    badgeColor: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
  {
    phase: 6,
    id: "phase_6_final_selection",
    name: "Final Selection and Induction",
    shortName: "Selected",
    description: "Candidate accepted into GDG Core Technical Team.",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
];

export function isWhitelistedAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.toLowerCase().trim();
  const envAdmins = (process.env.ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return ADMIN_WHITELIST.includes(normalized) || envAdmins.includes(normalized);
}

export function verifyAdminPasskey(passkey) {
  if (!passkey || typeof passkey !== "string") return false;
  const expectedKey = process.env.ADMIN_PASSKEY || process.env.ADMIN_SECRET_KEY || DEFAULT_ADMIN_PASSKEY;
  return passkey.trim() === expectedKey.trim();
}

export function getPhaseDetails(phaseNumber) {
  const num = Math.min(6, Math.max(1, parseInt(phaseNumber || "1", 10)));
  return RECRUITMENT_PHASES.find((p) => p.phase === num) || RECRUITMENT_PHASES[0];
}
