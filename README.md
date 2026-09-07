# Technical Recruitment Portal — Production Engineering Report & Architecture

A high-performance, security-hardened technical recruitment platform engineered with Next.js 14, React 18, Tailwind CSS, Better-Auth, and Firebase Firestore.

---

## 1. System Architecture

```text
                               ┌────────────────────────────────────────────────────────┐
                               │                     CLIENT LAYER                       │
                               └────────────────────────────────────────────────────────┘
                                                            │
                     ┌──────────────────────────────────────┴──────────────────────────────────────┐
                     ▼                                                                             ▼
        ┌─────────────────────────┐                                                   ┌─────────────────────────┐
        │  APPLICANT EXPERIENCE   │                                                   │   RECRUITER WORKSPACE   │
        │                         │                                                   │                         │
        │ • Multi-Step Wizard     │                                                   │ • Paginated Data Table  │
        │ • Derived Progress Bar  │                                                   │ • Review Workspace      │
        │ • Draft Resume Banner   │                                                   │ • Candidate Comparison  │
        │ • Pre-Flight Check      │                                                   │ • Private Staff Notes   │
        │ • Application Passport  │                                                   │ • Custom Mail Composer  │
        └─────────────────────────┘                                                   └─────────────────────────┘
                     │                                                                             │
                     └──────────────────────────────────────┬──────────────────────────────────────┘
                                                            │ HTTPS / HttpOnly Cookie
                                                            ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                    API ROUTE LAYER                     │
                               │                                                        │
                               │ • Rate Limiting (Sliding Window: 5-120 req/min)        │
                               │ • Session Extraction (Better-Auth)                     │
                               │ • requireAuth() & requireAdmin() Guards                │
                               │ • Object-Level Ownership Enforcer (IDOR Defense)       │
                               │ • Input Sanitization & Anti-Spoofing Session Stamping  │
                               └────────────────────────────────────────────────────────┘
                                                            │
                                                            ▼
                               ┌────────────────────────────────────────────────────────┐
                               │               CANONICAL SCHEMA v2 LAYER                │
                               │                                                        │
                               │ • Deterministic ID: sub_<email>_<canonicalDeptUuid>    │
                               │ • Immutable Snapshot Answers:                          │
                               │     [{ questionId, questionText, version, type, val }] │
                               │ • Normalization Layer (normalizeSubmission)            │
                               └────────────────────────────────────────────────────────┘
                                                            │
                                                            ▼
                               ┌────────────────────────────────────────────────────────┐
                               │                   DATA STORAGE LAYER                   │
                               │                                                        │
                               │ • Firestore (Transactions & Security Rules Locked)     │
                               │ • formData: Atomic Writes (Max 2 depts/user quota)     │
                               │ • reviewNotes: Quarantined Staff Internal Notes        │
                               │ • LocalStorage: 500ms Debounced Offline Drafts         │
                               └────────────────────────────────────────────────────────┘
```

---

## 2. Key Product Features

### Applicant Experience
- **Multi-Step Wizard**: 4 progressive disclosure stages (`Personal Details` -> `General Motivation` -> `Department Questions` -> `Review & Confirm`).
- **Authentic Derived Progress**: Real-time progress bar calculated purely from answered fields without state desynchronization.
- **Continue Where You Left Off (`DraftResumeBanner`)**: Detects unfinished drafts in `localStorage` with completion percentage and 1-click resumption.
- **Smart Pre-Flight Quality Diagnostics**: Analyzes answer depth, warns on brief responses ($< 20$ chars) and duplicate text, and presents an explainable health status badge.
- **Application Passport (`/passport`)**: Verified applicant credential hub with stage tracking, deterministic SVG QR tokens, and printable PDF receipts.

### Recruiter Operations
- **High-Efficiency Operations Table (`/admin`)**: Server-side pagination, instant search, department filters, and operational KPI cards.
- **Dedicated Candidate Review Workspace (`/admin/review/[id]`)**: Full question-and-answer reader, response diagnostics (word count, average length), and structured evaluation checklists.
- **Private Internal Staff Notes (`/api/admin/notes/[id]`)**: Chronological reviewer comments categorized by `Technical`, `Culture Fit`, `Portfolio`, or `Interview Topic`, strictly quarantined from applicant payloads.
- **Side-by-Side Candidate Comparison (`/admin/compare`)**: Aligned question-by-question comparative evaluation preserving human reviewer autonomy with zero automated ranking bias.

---

## 3. Tech Stack

- **Framework**: Next.js 14.2.5 (App Router, Server Components, Route Handlers)
- **UI & Styling**: React 18, Tailwind CSS, Lucide React, Radix UI Primitives, Sonner Toasts
- **Form Management**: React Hook Form, Zod Validation Resolver
- **Authentication**: Better-Auth 1.6.25 (HttpOnly Session Cookies)
- **Database**: Google Cloud Firestore / Firebase Admin SDK 14.2.0
- **Testing**: Node.js Native Test Runner (`node:assert/strict`)

---

## 4. Local Setup & Environment Variables

### Prerequisites
- Node.js 18.x or higher
- NPM or PNPM

### Environment Configuration (`.env.local`)
```env
# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Better-Auth Secret
BETTER_AUTH_SECRET=your_better_auth_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Optional: Recruitment Deadline (ISO String)
# RECRUITMENT_DEADLINE=2026-10-01T00:00:00Z
```

### Installation & Run
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production build
npm run build
npm run start
```

---

## 5. Security & Threat Model

1. **Authentication & Authorization**:
   - Every protected API endpoint invokes `requireAuth()` or `requireAdmin()` on request headers before processing.
   - Client-side role spoofing is impossible because permissions are verified server-side via session cookies.
2. **Anti-Spoofing Session Binding**:
   - `validateSubmissionInput()` explicitly binds `applicant.Email` to the verified session email (`user.email`), ignoring any spoofed email supplied in request bodies.
3. **IDOR & Data Isolation**:
   - `enforceOwnershipOrAdmin()` ensures users can only read or query submissions matching their verified email address.
   - Private recruiter notes are stored in a dedicated `reviewNotes` collection and are completely stripped from applicant endpoints (`/api/get-submissions`).
4. **Rate Limiting**:
   - Sliding-window rate limiters prevent API spam and brute-force submissions.
5. **Direct Client Lockdown**:
   - Firestore security rules reject all direct client SDK reads and writes (`allow read, write: if false;`), routing 100% of data access through validated backend endpoints.

---

## 6. Automated Verification Suites (157 / 157 Tests Passing)

Execute all verification test suites:
```bash
node scripts/verify-phase1.mjs
node scripts/verify-phase2-security.mjs
node scripts/verify-phase3-perf.mjs
node scripts/verify-phase4-ux.mjs
node scripts/verify-phase5-innovation.mjs
node scripts/verify-phase6-backend-audit.mjs
```

### Test Coverage Summary:
- **Phase 1 (Response Architecture)**: 54 / 54 tests passed
- **Phase 2 (Security Hardening)**: 58 / 58 tests passed
- **Phase 3 (Performance Benchmark)**: 16 / 16 tests passed
- **Phase 4 (UI/UX & Wizard)**: 7 / 7 tests passed
- **Phase 5 (Innovation & Passport)**: 13 / 13 tests passed
- **Phase 6 (Deep Backend Audit & Storage Probes)**: 9 / 9 tests passed
- **Total**: **157 / 157 Tests Passed (100% Success Rate)**
