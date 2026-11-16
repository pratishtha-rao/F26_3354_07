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

## Project Structure

```text
F26_3354_07/
├── docs/                   # Project scope, SRS, SDD, SPMP, and IEEE 829 test documentation
├── src/                    # Application source code and repository layer
├── tests/                  # Automated Jest unit test suites
└── README.md               # Project documentation
```
## Getting Started
1.Clone the repository to your local machine:
- git clone [https://github.com/pratishtha-rao/F26_3354_07.git](https://github.com/pratishtha-rao/F26_3354_07.git)
- cd F26_3354_07

2.Install all required Node.js, React Native, and Jest testing dependencies:
- npm install
3. Configure Environment Variables
- cp .env.example .env
4. Run the project locally
- npx expo start
