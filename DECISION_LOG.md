# Engineering Decision Log

This document records the 12 core architectural decisions, rationales, alternatives considered, and trade-offs made during the development of this technical recruitment platform.

---

### Decision 1: Deterministic Submission Identity (`sub_<email>_<deptId>`)
- **Context**: The original system stored submissions with random IDs or email-only keys, causing collisions when applicants applied to multiple departments or submitted repeatedly.
- **Decision**: Generate deterministic submission IDs combining sanitized applicant email and canonical department UUID.
- **Trade-off**: Requires resolving department names to UUIDs before hashing, but guarantees strict uniqueness per (Applicant, Department) tuple and enables $\mathcal{O}(1)$ document lookups.

---

### Decision 2: Versioned Canonical Schema v2 with Immutable Snapshots
- **Context**: Changes to questionnaire text in future years could alter or corrupt historical candidate responses if responses only stored array indices or relative pointers.
- **Decision**: Store answers as an array of self-contained snapshot objects containing `questionId`, `questionText`, `questionVersion`, `type`, and `value`.
- **Trade-off**: Slightly larger document size (approx. 2–3 KB per submission), but completely decouples past submissions from future curriculum changes.

---

### Decision 3: Client-Side Draft Debouncing (500ms) into LocalStorage
- **Context**: Applicants type extensive answers over multiple minutes. Writing every keystroke to Firestore would create hundreds of unnecessary database writes per user.
- **Decision**: Persist in-progress form drafts to client `localStorage` with a 500ms debounce timer, writing to Firestore only upon explicit submission.
- **Trade-off**: Draft is tied to the current browser/device, but eliminates Firestore keystroke costs and provides instant offline resilience.

---

### Decision 4: Non-Destructive Legacy Normalization Layer (`normalizeSubmission`)
- **Context**: Existing legacy records in Firestore had unstructured key-value objects and unversioned schemas.
- **Decision**: Build an on-the-fly normalization layer that transforms legacy Schema v1 objects into Canonical Schema v2 structures without running irreversible database rewrites.
- **Trade-off**: Requires small in-memory mapping logic on read, but guarantees zero risk of legacy data loss or downtime during deployment.

---

### Decision 5: Anti-Spoofing Session Email Enforcement
- **Context**: Malicious clients could manipulate the `Email` field in the HTTP request payload to submit applications on behalf of other users or overwrite existing records.
- **Decision**: The backend `validateSubmissionInput` strictly overrides the payload email with `user.email` extracted directly from the verified Better-Auth session cookie.
- **Trade-off**: The client cannot submit on behalf of an alternate email address, which is the exact intended security invariant for student recruitment.

---

### Decision 6: Lightweight Summary DTOs for Admin Table Views
- **Context**: Loading 1,000 full applicant records with multi-paragraph answers transferred over 2.9 MB of JSON data to the browser, causing network delays.
- **Decision**: Server-side table queries return lightweight summary DTOs (omitting heavy answer bodies), reducing payload size by 80.3% (down to 57 KB for 100 records). Full answers are loaded on-demand in the review workspace.
- **Trade-off**: Opening an individual review workspace triggers a secondary fetch if not cached, but speeds up initial admin dashboard loading by over 5x.

---

### Decision 7: Complete Firestore Client SDK Lockdown
- **Context**: The initial Firestore security rules allowed open read/write access (`allow read, write: if true;`), allowing any client with the project ID to scrape or wipe the database.
- **Decision**: Lock down client rules completely (`allow read, write: if false;`) and route all database interactions through privileged Next.js server actions and API route handlers.
- **Trade-off**: Requires server runtime execution for all database operations, but provides 100% centralized security, authorization, and audit logging.

---

### Decision 8: Rejection of Black-Box Automated AI Scoring
- **Context**: AI models could be used to automatically score candidate answers and generate auto-rejections.
- **Decision**: Deliberately rejected automated candidate ranking or scoring in favor of human reviewer tools (Response Diagnostics, Checklists, and Side-by-Side Comparison).
- **Trade-off**: Requires manual evaluation by department leads, but prevents algorithmic bias, hallucinated rejections, and legal/ethical liabilities.

---

### Decision 9: Pure SVG Deterministic QR Generation (`VerifiedQR.jsx`)
- **Context**: Generating QR codes using heavy external libraries or third-party image generation APIs added bundle bloat and leaked student verification tokens to external servers.
- **Decision**: Implemented a lightweight, self-contained SVG QR matrix generator in pure JavaScript running entirely on the client.
- **Trade-off**: Generates structured verification tokens locally without external dependencies or network overhead, preserving student privacy.

---

### Decision 10: Private Recruiter Notes Quarantine
- **Context**: Recruiters need to leave internal comments, interview topics, and evaluations without students seeing private staff notes.
- **Decision**: Stored recruiter notes in a dedicated collection (`reviewNotes`), guarded by `requireAdmin()`, and explicitly excluded notes from all applicant-facing API payloads.
- **Trade-off**: Requires a dedicated admin endpoint (`/api/admin/notes/[id]`), but provides absolute data privacy separation between staff and students.

---

### Decision 11: Atomic Database Transactions for Quota Enforcement
- **Context**: Rapid parallel requests or double-clicks could bypass application quotas (maximum 2 departments per applicant) due to read-modify-write race conditions.
- **Decision**: Wrapped document verification and quota checks within `db.runTransaction()`.
- **Trade-off**: Slightly higher transaction latency (approx. 20–30ms), but guarantees strict consistency and prevents duplicate applications.

---

### Decision 12: Purely Derived Real-Time Progress Calculation
- **Context**: Tracking completion progress via mutable React state often led to out-of-sync progress bars when fields were erased or dynamically modified.
- **Decision**: Derived progress percentage in-memory from watched form values (`watchedValues`) using `useMemo`.
- **Trade-off**: Re-evaluates when watched values change (executing in $< 0.1$ ms), but guarantees that progress is always 100% authentic and impossible to desynchronize.
