# Changelog

All notable changes to the Assimilate One platform will be documented in this file.

## [0.5.0] - 2026-05-12
### Snapshot Major Release
- **Platform Snapshot:** Created a snapshot of the current stage as a major v0.5 release. Any changes made subsequently will minimally affect the core functionality of this stage.
- **Fixed:** Resolved `Related cases` and `Presenter cases` fetch errors ("Missing or insufficient permissions") by updating the queries to explicitly filter for `status` `in` `['published', 'scheduled']` to satisfy Firestore security rules.

## [1.3.1] - 2026-05-13
### Fixed
- **Certificate Designer Layouts:** Fixed drag & drop positioning mechanics for brand logos, sponsor logos, and custom text elements. Added proper z-layer rendering to prevent elements from vanishing behind the background.
- **Certificate Designer:** Added capability to freely drag and position default elements (Name, Title, QR Code, CME details, Date, etc.).
- **Certificate Signatures:** New options to upload signature logos, edit signatory name & designation, and adjust scale within the Certificate Designer.
- **Certificate CME Compliance:** Updated the language defining CME credit points on issued certificates to strictly adhere to ACCME guidelines.

## [1.3.0] - 2026-05-13
### Added
- **Assessment Engine:** Implemented comprehensive objective-style assessments for all recorded and live cases with configurable difficulty (Simple/Moderate/Difficult). Includes 5 min limits, 5 attempts max, and 70% passing criteria.
- **Certification Engine:** Automated certificate issuance upon successful assessment completion with CME credit assignments.
- **Certificate Designer CMS:** Super Admin tool to create and manage 'Default', 'Custom', or 'Sponsored' certificate templates with custom sponsor logos and layouts.
- **Certificate Verification:** Public verification portal via QR codes embedded on generated certificates.
- **Certificate Export & Sharing:** Added functionality for users to Download (PDF), Print, and Share (Socials/Link) their earned certificates from the User Profile.
- **Micro-interactions:** Integrated confetti celebrations for correct answers and successfully unlocking certificates.

## [1.2.0] - 2026-05-07
### Added
- **Structured CRF Support:** Standard case presentations in text+images format structured around industry CRF standards.
- **Clinical Wizard v2:** Expanded 5-phase submission workflow for detailed clinical entry (Differential Diagnosis, Management Protocols, Outcome Observations).
- **Peer Review System:** Mandatory reviewer assignment and credential validation for clinical integrity.
- **Policy Sign-off:** Interactive clinical data policy verification to ensure PII redaction and institutional compliance.
- **Asset Referencing:** Integrated investigative reference linking for DICOM views, audio logs, and external evidence.

### Fixed
- **Security Patch [HIGH]:** Hardened `user_progress` and `user_interactions` rules to prevent arbitrary `userId` smuggling and unauthorized deletions. Explicitly partitioned all writes to strictly verify caller identity against resource ownership.
- **Security Patch [CRITICAL]:** Migrated all Gemini AI service logic to the Express backend (server-side) and implemented an AI proxy API. This prevents `GEMINI_API_KEY` from being bundled in the client-side code and ensures it remains securely hidden in the server environment.
- **Security Patch [MEDIUM]:** Enforced deterministic document IDs for `user_credits`, `user_progress`, and `user_interactions` in Firestore rules to prevent duplicate credit earning and interaction smuggling.
- **Security Patch [HIGH]:** Restricted unauthenticated `get` access to medical cases; only published/scheduled cases are now publicly accessible, preventing unauthorized viewing of drafts or archived content.
- **Security Patch [HIGH]:** Enforced `hasOnly` for metadata and interaction updates across all collections (Cases, Series, Progress, Interactions, Credits) to fully eliminate "Shadow Update" vulnerabilities.
- **Security Patch [HIGH]:** Refactored medical case update rules to strictly isolate metadata modifications to presenters only, while restricting public interaction updates to specific counter fields via `hasOnly`.
- **Connectivity Fix:** Resolved `FirebaseError` caused by conflicting `experimentalForceLongPolling` and `experimentalAutoDetectLongPolling` settings.
- **Connectivity Fix:** Resolved single-quote syntax error in Firestore connection diagnostic logic.
- **SDK Reliability:** Optimized `initializeFirestore` settings with `experimentalForceLongPolling` for better stability in proxied preview environments.
- **Security Patch [CRITICAL]:** Reinforced Gemini AI safety filters by setting thresholds to `BLOCK_MEDIUM_AND_ABOVE` to prevent generation of harmful or inappropriate content.
- **Security Patch [CRITICAL]:** Prevented privilege escalation by locking down the `role` and `roles` fields in user profiles.
- **Security Patch [CRITICAL]:** Eliminated "Credit Fraud" vulnerability by making the `stats` (CME points) object immutable for self-updates.
- **Speaker Profile UI:** Reorganized case grid for high-density information display, featuring glassmorphic overlays and prominent presenter branding.
- **Internal Dashboard Stability:** Fixed JSX syntax errors and wizard navigation logic for specialized case types.
- **Type Safety:** Corrected `import.meta.env` type resolution in `tsconfig.json` for Vite client environments.

## [1.1.0] - 2026-05-07
### Added
- **SSR Support:** Express middleware for dynamic meta tag injection (Title, Description, OG:Image).
- **Sitemap Generation:** Automated `/sitemap.xml` for case indexing.
- **Internal Wiki:** Technical overview at `/wiki`.
- **Changelog Tracker:** This file.

### Fixed
- **Dashboard UI:** Dark mode readability fixes for the Case Submission Wizard.
- **Layout Consistency:** Locked Case Detail page to 70:30 ratio on desktop.
- **Performance:** Parallelized Firestore queries on Case Detail page to improve load times.

### Security
- **Config Migration:** Preparation for moving Firebase JSON config to environment variables.
- **Firebase Robustness:** Improved initialization to handle default database IDs and improved connectivity error reporting.
- **Connectivity Fix:** Migrated to `experimentalAutoDetectLongPolling` and enforced explicit `host` and `ssl` settings to resolve "Could not reach Cloud Firestore backend" timeouts in restrictive network environments.
- **Credit Verification:** Hardened credit awarding logic by enforcing server-side `user_progress` status checks in Firestore rules, preventing client-side bypasses.
- **Hype Integrity:** Secured case interaction counters in Firestore rules with increment/decrement validation and record-existence checks; implemented unhyping support for users.
