# Changelog

All notable changes to the Assimilate One platform will be documented in this file.

## [1.2.0] - 2026-05-07
### Added
- **Structured CRF Support:** Standard case presentations in text+images format structured around industry CRF standards.
- **Clinical Wizard v2:** Expanded 5-phase submission workflow for detailed clinical entry (Differential Diagnosis, Management Protocols, Outcome Observations).
- **Peer Review System:** Mandatory reviewer assignment and credential validation for clinical integrity.
- **Policy Sign-off:** Interactive clinical data policy verification to ensure PII redaction and institutional compliance.
- **Asset Referencing:** Integrated investigative reference linking for DICOM views, audio logs, and external evidence.

### Fixed
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
- **Connectivity Fix:** Enforced `experimentalForceLongPolling: true` on both client and server to resolve "Could not reach Cloud Firestore backend" timeouts in restrictive network environments.
