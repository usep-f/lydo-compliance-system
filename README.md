# LYDO Compliance System - Setup & Development Guide

Welcome to the **LYDO Compliance System**. This repository contains the source code for both the client application (Frontend) and the backend services (Firebase Cloud Functions). 

This guide is designed to help you and your co-developers clone, configure, run, and deploy the system locally.

---

## 🏗️ System Architecture & Tech Stack

- **Frontend:** React 19 (TypeScript), Vite, React-Bootstrap
- **Database & Auth:** Firebase Auth, Firebase Cloud Firestore
- **File Storage:** Firebase Cloud Storage (for validating SK Official IDs/proofs)
- **Backend Services:** Firebase Cloud Functions v2 (Node.js 20, TypeScript)
- **Email Delivery:** Brevo (formerly Sendinblue) via transactional SMTP API (zero-dependency `fetch` integration)

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
1. **Node.js** (v18.x or v20.x recommended)
2. **npm** (Node Package Manager)
3. **Firebase CLI:** Installed globally using:
   ```bash
   npm install -g firebase-tools
   ```

---

## 🚀 Getting Started (Step-by-Step)

### 1. Clone the Repository
Clone the project to your local machine:
```bash
git clone <repository-url>
cd lydo-compliance-system
```

### 2. Install Dependencies
This project is split into the **Frontend (Root)** and **Backend (Functions)**. You must install dependencies in both places:

**For Frontend (Root Directory):**
```bash
npm install
```

**For Backend (Functions Directory):**
```bash
cd functions
npm install
cd ..
```

---

## 🔐 Environment Variables Configuration

Both the frontend and backend require local `.env` files to communicate with Firebase and Brevo. **These files are ignored by Git for security reasons** (configured in `.gitignore` at both root and functions levels).

### A. Frontend Configuration
1. In the **root directory**, create a file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the Firebase client SDK credentials for your web app (obtain these from your Firebase Console > Project Settings):
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=lydo-compliance-system-ce8c3.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=lydo-compliance-system-ce8c3
   VITE_FIREBASE_STORAGE_BUCKET=lydo-compliance-system-ce8c3.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=918488276327
   VITE_FIREBASE_APP_ID=1:918488276327:web:c37fe...
   VITE_FIREBASE_MEASUREMENT_ID=G-1ETC238WB8
   ```

### B. Backend (Cloud Functions) Configuration
1. Navigate into the **functions directory** and create a file named `.env`:
   ```bash
   cd functions
   cp .env.example .env
   ```
2. Open `functions/.env` and enter your Brevo API key and your verified sender email:
   ```env
   # Get your API key from Brevo: https://brevo.com/settings/keys
   BREVO_API_KEY=xkeysib-your-actual-api-key-here

   # The verified personal email you registered in Brevo as a sender
   # Verify your email under Senders & IPs: https://brevo.com/senders
   BREVO_SENDER_EMAIL=your_verified_personal_email@gmail.com
   ```
3. Navigate back to the root:
   ```bash
   cd ..
   ```

---

## 💻 Local Development Workflow

### 1. Running the Frontend
To start the local Vite development server for the user and admin dashboard interfaces, run:
```bash
npm run dev
```
Open your browser and navigate to the local port displayed in the console (usually `http://localhost:5173`).

### 2. Modifying and Building Cloud Functions
The cloud functions are written in TypeScript and **must be compiled** to JavaScript before being tested or deployed.

Whenever you make changes to files under `functions/src/`, compile them by running:
```bash
cd functions
npm run build
cd ..
```
*Note: Compilation outputs are placed inside `functions/lib/` (which is correctly ignored by Git).*

---

## 🌐 Deploying to Production

When you are ready to deploy your updates (frontend pages, database rules, or Cloud Functions) to the live Firebase environment, follow these steps:

### 1. Authenticate with Firebase
Ensure you are logged into the correct Firebase account:
```bash
firebase login
```

### 2. Select the Active Firebase Project
Verify or switch to your active Firebase project:
```bash
firebase use lydo-compliance-system-ce8c3
```

### 3. Deploy Everything (Frontend + Backend) 🌟 [FOOLPROOF ONE-LINER]
If you have modified both frontend files and Cloud Functions (or updated `functions/.env` configurations), you must compile both and deploy everything simultaneously. Run this single command from the **root directory**:
```bash
npm run build && cd functions && npm run build && cd .. && firebase deploy
```
*Why this works:* It compiles the frontend React code, enters the `functions` directory to compile the TypeScript Cloud Functions, returns to the root, and pushes everything live to Firebase in one go safely.

### 4. Deploy Frontend Changes Only
If you only made changes to the React frontend (e.g. dashboards, pages, stylesheets) and do not need to update Cloud Functions:
```bash
# Build the frontend production bundle
npm run build

# Deploy only the static site
firebase deploy --only hosting
```

### 5. Deploy Backend (Cloud Functions) Only
If you only edited your backend Cloud Functions (e.g. `functions/src/index.ts` or `functions/.env` environment configs) and did not make changes to your frontend React pages:
```bash
# 1. Compile backend TypeScript
cd functions
npm run build
cd ..

# 2. Deploy only the Cloud Functions
firebase deploy --only functions
```

### 5. Checking Live Server Logs
If you want to view error messages, API response logs, or standard activity logs from the live cloud functions, run:
```bash
firebase functions:log
```
You can also view these live logs in your web browser via the **Firebase Console > Build > Functions > Logs** tab.

---

## 🔒 Security & Git Policies

- **Never commit `.env` files** to Git. Always use `.env.example` templates to guide other developers.
- **Never commit compiled folders** (`dist/` in root, `lib/` in functions) or dependencies (`node_modules/`).
- If you notice `.env` files being tracked by Git, run `git rm --cached .env` or `git rm --cached functions/.env` to stop tracking them immediately.
