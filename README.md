# LYDO Compliance System — Setup & Architecture Guide

Welcome to the **LYDO Compliance System**. This repository contains the source code for both the client dashboard application (Frontend) and the serverless backend services (Firebase Cloud Functions).

This platform acts as a secure compliance portal for **SK (Sangguniang Kabataan) Officials** to upload mandatory reports, and **LYDO (Local Youth Development Office) Administrators** to inspect, approve, deny, and monitor compliance trends across barangays.

---

## 🏗️ System Architecture & Tech Stack

The system is built on a type-safe, serverless stack split into two primary workspaces:

*   **Frontend (Root Directory)**
    *   **Framework**: React 19 (TypeScript) with Vite 6.
    *   **Styling**: React-Bootstrap 2.10 (built with standard Bootstrap 5 custom classes).
    *   **State & Queries**: Custom state-decoupled hooks using the Firebase Client SDK.
    *   **Visualizations**: Charts rendered via Chart.js and React-Chartjs-2.
*   **Backend Services (`/functions` Directory)**
    *   **Engine**: Firebase Cloud Functions v2 (Node.js 22 target, TypeScript).
    *   **Region**: Global region locked to Singapore (`asia-southeast1`).
    *   **SMTP Service**: Brevo SMTP API, invoked via zero-dependency native `fetch` requests (avoiding heavy third-party emailer libraries to minimize cold-start latency).
*   **Database & Storage**
    *   **Authentication**: Firebase Auth.
    *   **Database**: Cloud Firestore (default database instance in `nam5` location).
    *   **Storage**: Cloud Storage bucket for uploading official SK IDs and compliance proof files.

---

## 🌟 System Features & Functional Workflows

This section outlines the primary functional modules of the LYDO Compliance System, detailing how they operate and coordinate between the client-side React frontend and serverless backend triggers.

### 1. Login & Registration Workflow

The onboarding and authentication flow guarantees security and administration verification for all SK Officials:
1. **Registration**: 
   * An SK Official submits their registration details (name, email, selected barangay, and uploads an image of their Official ID) on the welcome screen.
   * This action saves a record in the `pending_users` Firestore collection and uploads the ID image to Cloud Storage.
2. **Admin Verification & Approval**:
   * A LYDO Admin reviews the registration request within the **Admin Dashboard Approval Queue**.
   * If approved, the admin triggers the `approveUser` Cloud Function. This function runs inside a Firestore Transaction, creating a Firebase Auth credential for the user, moving the profile record to the `users` collection, deleting the pending record, and generating a transactional invitation email.
   * If rejected, the request is purged, and the ID image is wiped from Storage.
3. **Outbound Email Invitation**:
   * The system sends a transactional email via the Brevo SMTP API containing a secure, signed password setup link.
4. **Password Setup & First Log-in**:
   * The user clicks the link, lands on the `SetupPasswordPage.tsx` interface, sets their password, and is then redirected to log in.

### 2. Dashboard Workflows

The platform serves two primary dashboards, separated by role-based authorization guards:
*   **SK Official Dashboard (`UserDashboard.tsx`)**
    *   **Overview Stats**: Displays personal/barangay status summaries (approved documents, pending review, due files, and compliance rate).
    *   **Notice Board**: Displays active event/deadline announcements published by LYDO Admins.
    *   **Submissions Upload Portal**: Features a file-drop zone where officials select the target document type, choose the applicable period (quarter/month), run client-side PDF verification, and confirm upload.
    *   **Barangay History**: Lists all past uploads (approved, pending, and denied with remarks).
*   **LYDO Admin Dashboard (`AdminDashboard.tsx`)**
    *   **Compliance Matrix Grid**: Renders a complete grid of all barangays and their status (approved, pending, missing, or not due) for the selected calendar year.
    *   **Verification Queue**: Real-time inspection queue where admins open submitted PDFs, check metadata, and click approve or deny (with a mandatory text reason for rejection).
    *   **Notice Composer**: Allows admins to write notice bulletins to post announcements directly to all SK dashboards.
    *   **Maintenance & Reminders**: Lets admins trigger reminder emails for upcoming compliance deadlines.

### 3. Submission Process

The upload and inspection flow protects storage integrity while avoiding concurrent duplicates:
1. **Selection & Validation**:
   * The user selects a document type (Scheduled, ASAP, or Perennial).
   * The system checks the database to verify if that specific type/period has already been submitted.
2. **Client-Side PDF Screening**:
   * The PDF file is run through `pdfScreening.ts` (using `pdf-lib`). This checks for file header structure, page count, and metadata, blocking corrupted files before transmission.
3. **Upload & Transactional Lock**:
   * The file is uploaded to a structured Cloud Storage path: `submission_files/{userId}/{year}/{barangay}/{docTypeId}/{timestamp}_{fileName}`.
   * A Firestore record is saved in `pending_submissions` using a deterministic ID (`{safeBarangay}_{year}_{docTypeId}_{safePeriod}`) to prevent double-submissions.
4. **Approval/Denial Execution**:
   * Upon admin action, the `approveSubmission` or `denySubmission` Cloud Function runs inside a Firestore transaction.
   * It deletes the record from `pending_submissions`, writes the result into `submissions` (setting the status to `approved` or `denied`), and triggers an immediate email notification via Brevo to inform the SK Official of the review outcome.

### 4. Data Analytics & Compliance Computation

To avoid massive database read charges from scanning Firestore collections, the analytics system runs on a **client-side computation model**:
*   **Zero-Server Aggregation**: No Firestore Cloud Functions or server-side scripts scan documents to compute statistics.
*   **Live Stream Processing**: The dashboards subscribe to a real-time query stream of raw `submissions` and `pending_submissions` documents.
*   **Memoized Aggregations (`useComplianceData.ts`)**:
    *   Calculates overall compliance rates, barangay compliance rankings, and monthly trend graphs.
    *   Combines the raw submissions with calendar timelines (configured in `submissionTypes.ts`) to determine which files are "missing", "approved", or "not due" for any given period.
    *   All calculations are memoized via React `useMemo`, re-evaluating only when the underlying raw streams change, keeping the app fast and database costs to a minimum.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
1. **Node.js** (v18.x, v20.x, or v22.x matching the backend engine).
2. **npm** (Node Package Manager).
3. **Firebase CLI**: Installed globally via:
   ```bash
   npm install -g firebase-tools
   ```

---

## 🚀 Getting Started & Local Installation

Follow these steps to clone the repository and configure it for local execution.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd lydo-compliance-system
```

### 2. Install Dependencies
This project is split into the frontend client and the backend functions. Dependencies must be installed in both workspaces.

**Install Frontend Dependencies (Root):**
```bash
npm install
```

**Install Backend Dependencies (Functions):**
```bash
cd functions
npm install
cd ..
```

---

## 🔐 Environment Variables Configuration

Both workspaces require a local `.env` configuration file to communicate with the Firebase services and SMTP servers. **These files are git-ignored for safety.**

### A. Frontend Environment Configuration
1. In the **root directory**, create a file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the Firebase client SDK credentials for your web app:
   ```env
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MEASUREMENT_ID=
   ```
   > 💡 **How to obtain Firebase credentials:**
   > 1. Go to the [Firebase Console](https://console.firebase.google.com/).
   > 2. Select your Firebase project.
   > 3. Click the gear icon next to **Project Overview** in the left navigation sidebar and select **Project settings**.
   > 4. Scroll down to the **Your apps** section (register a Web App if you haven't already).
   > 5. Select the **Config** option under *SDK setup and configuration*.
   > 6. Copy the values of the config object and paste them into your `.env` matching the variables above.

### B. Backend Environment Configuration
1. Navigate into the **functions directory** and create a file named `.env`:
   ```bash
   cd functions
   cp .env.example .env
   ```
2. Open `functions/.env` and add your Brevo API key and verified sender address:
   ```env
   BREVO_API_KEY=YOUR_BREVO_API_KEY
   BREVO_SENDER_EMAIL=YOUR_VERIFIED_SENDER_EMAIL
   ```
   > 💡 **How to obtain Brevo credentials:**
   > 1. **BREVO_API_KEY**: Log into your [Brevo Dashboard](https://brevo.com/), click your account name in the top right, go to **SMTP & API** (or navigate to `https://smtp-api.brevo.com/`), and click **Generate a new API key**.
   > 2. **BREVO_SENDER_EMAIL**: In your Brevo account, navigate to **Senders & IPs > Senders** (or `https://sender.brevo.com/`), and copy one of your verified sender email addresses.
3. Return to the root directory:
   ```bash
   cd ..
   ```

---

## 💻 Local Development Workflow

### 1. Running the React Frontend
To start the local Vite development server, run:
```bash
npm run dev
```
Open your browser and navigate to the port displayed (usually `http://localhost:5173`).

### 2. Compiling Backend Cloud Functions
The cloud functions are written in TypeScript and **must be compiled** to JavaScript before deployment.

Whenever you update files inside `functions/src/`, compile them by running:
```bash
cd functions
npm run build
cd ..
```
*Note: Compiled outputs are placed in `functions/lib/` (git-ignored).*

---

## 📐 System Architecture & Coding Standards

This codebase enforces strict constraints from [ARCHITECTURE.md](file:///d:/lydo-compliance-system/ARCHITECTURE.md) to guarantee structural safety, prevent database overheads, and maintain code cleanliness.

### A. Strict Layer-First Directory Map
To prevent syntax drift, all new files must fit within flat directories. Do not nest custom folders.

```
lydo-compliance-system/ (Project Root)
├── firebase.json                 # Firebase services configuration
├── firestore.rules               # Firestore Database security rules
├── storage.rules                 # Cloud Storage access rules
├── public/                       # Static assets
├── functions/                    # Cloud Functions Workspace
│   └── src/                      # Backend Source (STRICTLY FLAT)
│       ├── index.ts              # HTTPS Callable API re-exports
│       ├── users.ts              # Callable endpoints for user accounts
│       ├── submissions.ts        # Callable endpoints for compliance uploads
│       └── notifications.ts      # Pruning queue helper & trigger functions
└── src/                          # Frontend Workspace
    ├── firebase.ts               # Firebase Client initialization
    ├── components/               # UI Layout (STRICTLY 6 DOMAIN SUB-FOLDERS)
    │   ├── analytics/            # Graph rendering and trend matrices
    │   ├── auth/                 # Login and password setup forms
    │   ├── common/               # Shared widgets (DataTables, Badges, Dropzones)
    │   ├── layout/               # Navbars, Sidebars, Shells
    │   ├── settings/             # Profiles and credential changes
    │   └── submissions/          # Upload modules and verification interfaces
    ├── hooks/                    # Stateful API hooks (STRICTLY FLAT)
    ├── pages/                    # Router-level views (STRICTLY FLAT)
    └── utils/                    # Pure operations utilities (STRICTLY FLAT)
```

### B. Anti-Monolith Coding Caps
1. **Registry Cap**: `functions/src/index.ts` is strictly capped at **100 lines**. It must only initialize Firebase Admin and re-export callable API endpoints. No business logic is allowed.
2. **Source File Cap**: Sibling domain files in `functions/src/` (e.g. `users.ts`, `submissions.ts`) are capped at **500 lines**.
3. **Helper File Cap**: Utility code files are capped at **300 lines**.
4. **Function Size Target**: Individual functions must aim to remain under **30 lines** of execution logic (hard cap at **50 lines**). Indentation and complexity nesting depth must not exceed **3 levels**.

### C. Client-Side Heavy Aggregation Rule
To prevent expensive database queries scanning entire collections for compliance reports:
*   **Rule**: Never write backend functions or Firestore database queries that scan documents dynamically to calculate rates or summaries.
*   **Standard**: Fetch raw compliance documents in a single stream, and execute all compliance metrics, rates, cells, and trend calculations client-side in the `useComplianceData.ts` hook using a React `useMemo` block.

---

## 🗄️ Database & Storage Security Schema

### A. Firestore Collections Map
*   `users`: Active profiles containing credentials, roles (`admin` or `sk_official`), and barangay assignments.
*   `pending_users`: Newly registered SK Official accounts awaiting LYDO Admin validation.
*   `submissions`: Confirmed, approved, or denied compliance documents.
*   `pending_submissions`: Active PDF uploads awaiting LYDO Admin approval.
*   `perennial_counts`: Aggregated performance metrics for long-term document compliance.
*   `cms_bulletins`: Notice board bulletins displayed on the home page dashboard.
*   `notifications/{uid}/items`: User-specific in-app notification alerts.

### B. Notification Queue Cap (FIFO)
To prevent database bloating and keep read/write fees low:
*   User notifications are strictly limited to the latest **20 records** per user.
*   Older notifications are automatically pruned via batch operations.
*   Documents carry a Time-to-Live (TTL) that purges alerts older than **30 days**.

### C. Storage Security & Path Traversal Prevention
*   **PDF Validation**: Incoming PDF streams are checked for valid header structures and metadata using the `pdfScreening.ts` utility.
*   **Path Verification**: To prevent directory traversal attacks, application and submission IDs are checked using `validateApplicationId` to reject paths containing slash (`/`) characters.
*   **Safe Deletion**: On denial/deletion, associated proof files are removed from Cloud Storage using `safeDeleteStorageFile` restricted to the `ALLOWED_STORAGE_PREFIXES`.

---

## 🔍 Pre-Submission Verification Protocol

Before submitting pull requests, committing modifications, or deploying to the cloud, the workspace must compile cleanly without linting warnings:

1. **Lint Check**: Run the root linter to verify syntax correctness:
   ```bash
   npm run lint
   ```
2. **Frontend Type-Check**: Compile the React client code:
   ```bash
   npm run build
   ```
3. **Backend Type-Check**: Compile the Cloud Functions workspace:
   ```bash
   cd functions && npm run build && cd ..
   ```

*Note: All warnings and errors raised by ESLint or TypeScript compiler must be resolved before proceeding. Avoid `as any` type assertions.*

---

## 🌐 Deployment Commands

Ensure you are authenticated and target the correct environment first:
```bash
# Log in to your Firebase account
firebase login

# Target the active Firebase project
firebase use lydo-compliance-system-ce8c3
```

### 1. Complete Deployment (Frontend + Cloud Functions) [FOOLPROOF]
When deploying updates to both the React UI and Functions, run this single-line command from the root directory:
```bash
npm run build && cd functions && npm run build && cd .. && firebase deploy
```
*Why this works:* It builds the React static files, moves into `functions/` to compile the TypeScript files, returns to the root, and pushes everything to Firebase Hosting and Functions simultaneously.

### 2. Deploy Frontend hosting Only
```bash
npm run build
firebase deploy --only hosting
```

### 3. Deploy Cloud Functions Only
```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 4. Check Backend Server Logs
```bash
firebase functions:log
```

---

## 🛠️ Troubleshooting

*   **Error: Database Connection Refused**
    *   Verify you are authenticated with Firebase (`firebase login`).
    *   Check that your current IP address has permission, and Firestore rules defined in `firestore.rules` are deployed.
*   **Error: Content Security Policy (CSP) Exceptions**
    *   If the browser blocks connections to callable Cloud Functions, check the CSP headers defined under `hosting.headers` inside [firebase.json](file:///d:/lydo-compliance-system/firebase.json). Ensure the URL `https://asia-southeast1-lydo-compliance-system-ce8c3.cloudfunctions.net` is allowed in the `connect-src` directive.
*   **Error: Functions Not Triggering or Cold Start Errors**
    *   Check functions logs using `firebase functions:log`.
    *   Ensure the local `.env` inside `/functions` has the valid `BREVO_API_KEY` and `BREVO_SENDER_EMAIL`.
