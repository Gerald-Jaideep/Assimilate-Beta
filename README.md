# Assimilate One | Advanced Medical Education Platform

Assimilate One is a high-performance clinical education platform designed for peer-to-peer knowledge transfer through immersive video cases. Built for speed, SEO, and professional reliability.

## 🚀 Core Features

### 🎬 Clinical Content Formats
- **Clinical Video Cases:** Immersive playback with progress persistence and "Hype" tracking.
- **Structured CRF Presentations:** Detailed text+image case presentations based on industry-standard Case Report Forms.
- **Investigative Supporting Material:** Support for DICOM links, audio evidence, and clinical scans.
- **Peer Review Workflow:** Integrated clinical validation and presenter/reviewer credentialing.

### 🛡️ Internal Management (Dashboard)
- **Case Submission Wizard:** Multi-step wizard for Live Sessions or Recorded Cases.
- **Role-Based Access:** Admin and speaker validation logic.
- **Accreditation System:** Dynamic CPD/CME point assignment and watch-time gating.

### 🔍 SEO & Technical Architecture
- **Server Side Rendering (SSR):** Dynamic meta tag injection for social sharing (OG tags).
- **Automated Sitemap:** Real-time generation of `sitemap.xml` from Firestore data.
- **Internal Wiki:** Server-rendered technical documentation at `/wiki`.
- **Performance Optimized:** Parallelized data fetching and sub-second load times.

### 🌓 Design System
- **Hardened Dark Mode:** Consistent UI across all modals and complex dashboards.
- **Motion Orchestration:** Fluid transitions using `motion/react`.
- **Responsive Layout:** Locked 70:30 desktop configuration for professional information density.

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, Motion.
- **Backend:** Node.js (Express), Firebase (Firestore, Auth).
- **Security:** ABAC-based Firestore rules, Environment variable management.

## 📦 Deployment
The application is optimized for Cloud Run containers with dual Vite/Express middleware handling.
