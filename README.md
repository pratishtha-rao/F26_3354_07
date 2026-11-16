# Comet Care: Patient Recovery & Follow-Up System

**Course: CE/CS/SE 3354 – Software Engineering (Fall 2026)  
**Team: Team 7  


---

## Overview

Comet Care is a cross-platform mobile application (iOS and Android) designed to help patients manage their post-treatment recovery at home. It provides a centralized space to track daily vitals, medication schedules, recovery symptoms, diet restrictions, follow-up appointments, and lab/test results—enabling patients to generate and share comprehensive PDF recovery summaries with their healthcare providers.

Medical Disclaimer:Comet Care is designed strictly for patient self-tracking and organization. It does not diagnose conditions, recommend treatments, or adjust medication dosages, and does not replace professional medical advice.

---

## Key Features

- Authentication & Privacy (FR-1):Secure account creation and sign-in via email/password (salted password hashing) or Google OAuth 2.0, with automatic 15-minute inactivity session timeouts and HIPAA-aligned data safeguards.
- Medication & Dose Reminders (FR-2): Create, edit, and delete medication schedules with local device push notifications delivered within 1 minute of scheduled times, plus offline reminder reliability and 30-day soft-delete recovery.
- Daily Recovery Journal & Vitals (FR-3, FR-4): Log time-stamped recovery notes, symptoms, pain levels (0–10), and daily vitals (heart rate, blood pressure, temperature, SpO2) with automatic range validation to prevent input errors and date-based search.
- Diet & Health Restrictions (FR-5): Record and reference post-discharge dietary guidelines and health restrictions.
- Appointment Tracking (FR-6): Manage upcoming medical appointments with automated device notifications.
- Test Results Storage (FR-7): Upload, organize, and view past diagnostic and lab test results (up to 10 MB per file).
- Provider Summary Export (FR-8):Generate and download customizable PDF recovery summaries (≤ 5 MB) covering up to 12 months of medications, test results, and daily notes to share at clinical visits.

---

## System Architecture & Tech Stack

- Architectural Pattern:Repository Architecture — All feature modules (Medications, Recovery Logs, Vitals, Appointments, Test Results, Summary Generator) interact with a centralized Patient Data Repository interface, ensuring data consistency, offline local caching/syncing, and simplified testing.
- Frontend:React Native, TypeScript
- Backend & Database:Node.js, Supabase (PostgreSQL), AWS S3 (document storage)
- Authentication: Google OAuth 2.0 & Salted Hash Credentials
- Testing:Jest (Automated Unit Testing)

---

## Implementation

The runnable application is in `implementation/` and uses Expo, React Native, and TypeScript. Its feature screens use a shared `PatientDataRepository` backed by local device/browser storage. It includes:

- Recovery journal and validated vitals with date filtering.
- Medication schedules, local reminders, and 30-day soft-delete recovery.
- Appointment tracking and reminders.
- Diet guidance and health restrictions.
- Local test-result file storage (up to 10 MB per file).
- Configurable provider-summary PDFs for a date range of up to 12 months (native PDF limit: 5 MB).

The report's Supabase/PostgreSQL backend, AWS S3 storage, sign-in/OAuth, account security, and cross-device sync are not configured. Browser notifications only work while the app page is open; browser print-to-PDF file size cannot be verified by the app. This is a local self-tracking prototype, not a medical device or a HIPAA-compliant service. Do not store real patient information in it.

## Project Structure

```text
F26_3354_07/
├── implementation/         # Expo React Native TypeScript app and repository layer
├── unit-test/               # Jest tests for shared validation and repository behavior
├── *.pdf                    # Project scope, final report, and presentation
└── README.md               # Project documentation
```

## Getting Started

From the repository root, install dependencies and open the app in your browser:

```powershell
cd implementation
npm install
npm run web
```

The browser preview runs locally. To start the iOS/Android development server instead, use `npm start` from `implementation/`. Run the type check with `npm run typecheck`; run the Jest suite with `npm test`.

## AI Assistance & Attribution

GitHub Copilot (OpenAI/GitHub) was utilized during the development of this project implementation under the following scope:

- **Purpose & Scope:** Used as an intelligent code-completion and boilerplate-generation assistant only within the `implementation/` directory.
- **Human Verification & Authorship:** All AI-suggested snippets were manually reviewed, edited, debugged, and integrated by the team members. The underlying software design, architectural decisions, business logic, and test cases were formulated and validated by the team in accordance with the project specification.
- **Acceptable AI use was verified and used with permission from the professor, Dr. Barbara Maweu.**

### Citation Format (IEEE Style)
[1] GitHub, Inc., GitHub Copilot, large language model-based code completion tool, 2026. [Online]. Available: https://github.com/features/copilot. [Accessed: Nov. 15, 2026]
