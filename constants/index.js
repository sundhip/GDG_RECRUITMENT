import {
  DEPARTMENTS,
  findDepartment,
} from "./recruitment/departments.js";
import {
  QUESTIONNAIRE_VERSION,
  WHY_GDG_QUESTIONS,
  TECHNICAL_INTEREST_QUESTIONS,
  DEPARTMENT_QUESTIONNAIRES,
  PROJECT_QUESTIONS,
  REFLECTION_QUESTIONS,
  ALL_GENERAL_QUESTIONS,
  GENERAL_QUESTIONS,
  QuestionnaireData,
} from "./recruitment/questions.js";

export {
  DEPARTMENTS,
  findDepartment,
  QUESTIONNAIRE_VERSION,
  WHY_GDG_QUESTIONS,
  TECHNICAL_INTEREST_QUESTIONS,
  DEPARTMENT_QUESTIONNAIRES,
  PROJECT_QUESTIONS,
  REFLECTION_QUESTIONS,
  ALL_GENERAL_QUESTIONS,
  GENERAL_QUESTIONS,
  QuestionnaireData,
};

// Current Date Utilities
export const curDay = new Date().getDay();
export const curYear = new Date().getFullYear();
export const curDate = new Date().getDate();
export const curMonth = new Date().getMonth();
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Verified Navigation & Community Links
export const LINKS = {
  home: "/",
  departments: "/departments",
  passport: "/passport",
  candidatePortal: "/auth/signin",
  admin: "/admin",
};

/**
 * 8 Technical Departments for GDG on Campus · VIT Chennai
 * Mapped directly from canonical DEPARTMENTS.
 */
export const reviews = DEPARTMENTS.map((dept) => ({
  id: dept.id,
  name: dept.name,
  description: dept.description,
  body: dept.shortDescription,
  beginnerNote: dept.beginnerNote,
  icon: dept.icon,
  tone: dept.color,
  color: dept.color,
  slug: dept.slug,
  aliases: dept.aliases,
}));

/**
 * Technical Department Cards for UI display
 */
export const technicalCards = DEPARTMENTS.map((dept) => ({
  title: dept.name,
  description: dept.description,
  shortDescription: dept.shortDescription,
  beginnerNote: dept.beginnerNote,
  color: dept.color,
  image: dept.iconSrc,
  formLink: `/${dept.id}`,
  id: dept.id,
  slug: dept.slug,
}));

// Sample Admin Data
export const sampleAdminHeader = [
  { Header: "SrNo", accessor: "srno" },
  { Header: "Name", accessor: "name" },
  { Header: "Registration No", accessor: "registrationNumber" },
  { Header: "Email", accessor: "email" },
  { Header: "Department", accessor: "department" },
  { Header: "Phase", accessor: "currentPhase" },
];

// Headers for CSV exports
export const CSV_Header = [
  { label: "Name", key: "Name" },
  { label: "Email", key: "Email" },
  { label: "Registration Number", key: "RegistrationNumber" },
  { label: "Phone", key: "Phone" },
  { label: "Department", key: "Department" },
  { label: "Current Phase", key: "currentPhase" },
  { label: "Phase Name", key: "phaseName" },
  { label: "Preference", key: "Pref" },
  { label: "Shortlisted", key: "shortlisted" },
  { label: "Questions", key: "Questions" },
];

// Email Notification Templates
export const mailingTemplate = {
  Interview:
    "<p>Hello Candidate,</p><br><p>Thank you for applying to <strong>GDG on Campus · VIT Chennai Technical Recruitment 2026</strong>. We are excited to inform you that your application has advanced to the next review round for the <strong>#dept</strong> Department!</p><p>Please check your registered student email for interview scheduling and preparation details.</p><p>Best regards,<br>GDG on Campus · VIT Chennai Team</p>",
};
