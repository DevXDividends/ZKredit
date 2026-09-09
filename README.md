<div align="center">

# ⚖️ ZKredit

### Zero-Knowledge Proof Based Fair Lending Verification System

*A bank proves a loan decision came from its real, unmodified model — without revealing the
model's weights or the applicant's private data.*

[![CI/CD](https://github.com/DevXDividends/ZKredit/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/DevXDividends/ZKredit/actions/workflows/ci-cd.yml)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Solidity](https://img.shields.io/badge/Solidity-Foundry-363636?logo=solidity&logoColor=white)
![EZKL](https://img.shields.io/badge/ZK--SNARKs-EZKL%20%2F%20Halo2-8A2BE2)
![Cloud Run](https://img.shields.io/badge/Backend-Google%20Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)

**[🚀 Live App](https://z-kredit-one.vercel.app) &nbsp;·&nbsp; [📘 API Docs](https://zkredit-backend-723874192075.us-central1.run.app/docs) &nbsp;·&nbsp; [📂 Repo](https://github.com/DevXDividends/ZKredit)**

</div>

> The backend runs on Google Cloud Run's free tier and scales to zero when idle — the first
> request after a period of inactivity may take a few extra seconds (cold start).

---

## Table of Contents

- [How it works](#how-it-works-in-plain-terms)
- [Features](#-features)
- [Project status](#-project-status)
- [Architecture](#-architecture)
- [Repository structure](#-repository-structure)
- [Setup](#-setup)
  - [0. Prerequisites](#0-prerequisites)
  - [1. Clone](#1-clone-the-repository)
  - [2. What's committed vs generated](#2-whats-committed-to-git-vs-what-you-generate-yourself)
  - [3. Contracts](#3-set-up-the-contracts-foundry)
  - [4. Backend](#4-set-up-the-backend-and-run-inference)
  - [5. ZK proving key](#5-generate-pkkey-so-real-proof-generation-works-locally)
  - [6. Frontend](#6-set-up-the-frontend)
  - [7. Authentication](#7-set-up-authentication-jwt--google-oauth)
- [Testing](#-testing)
- [CI/CD](#-cicd)
- [Deployment](#-deployment-cloud)
- [Troubleshooting](#-troubleshooting)
- [Design notes](#-notes-on-scope-and-design-decisions)

---

## How it works, in plain terms

1. **An applicant submits a loan application** (income, credit history, loan details) through
   the web app, after logging in — either typed in, or auto-filled by uploading a scanned/
   printed application PDF via the OCR scanner.
2. **The bank's model evaluates it** and returns a decision (Approved/Rejected) with a
   confidence score — instant, real machine-learning inference.
3. **A zero-knowledge proof can then be generated** for that decision. It mathematically
   demonstrates: *"this exact decision was produced by evaluating the bank's real, registered
   model on some input"* — without revealing the input or the model's weights.
4. **Anyone can verify the proof** — locally, or on-chain — without trusting the bank's word.
   Tamper with the proof even slightly and verification fails, demonstrated directly in the
   app via a "tamper demo."

This addresses a real regulatory gap in lending: banks must make fair, consistent credit
decisions, but there's currently no way for a regulator or applicant to verify a decision
came from the bank's actual approved model rather than being overridden or quietly changed.
ZKredit makes that mathematically verifiable.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Authentication** | Email/password (bcrypt) and Google OAuth, JWT sessions |
| 📝 **Loan application flow** | Submit → real ONNX inference → Approved/Rejected + confidence |
| 📄 **OCR application scanner** | Upload a PDF; a vision model (Groq) extracts and pre-fills all fields. Falls back to a fixed demo extraction with no `GROQ_API_KEY` configured |
| 🔒 **Real ZK proof generation** | Per-application, on-demand genuine EZKL/Halo2 witness → proof → verification |
| 🧪 **Tamper demo** | Corrupt a copy of a real proof and watch verification correctly reject it |
| ⛓️ **On-chain verification** | Real EZKL-generated Solidity verifier + registry, tested end-to-end on a local testnet |
| 📊 **Fairness reporting** | Disparate Impact Ratio across demographic groups, shown on the bank dashboard |
| 🏦 **Bank dashboard** | Aggregate stats + fairness report |

---

## 📊 Project status

| Area | Status |
|---|---|
| Model training (real Kaggle dataset, 45k rows) | ✅ Done — 89.6% accuracy |
| Fairness analysis | ✅ Done |
| EZKL circuit compilation | ✅ Done |
| Real ZK proof generation | ✅ Done — verified locally **and** on-chain (local Anvil) |
| Solidity verifier + registry contract | ✅ Done — real verifier, 10/10 Foundry tests passing |
| Backend API (FastAPI) | ✅ Done |
| Frontend (React + Vite + Tailwind + Three.js) | ✅ Done |
| ZK proof pipeline wired into the backend | ✅ Done — real per-application proving, not a stub |
| Tamper demo | ✅ Done |
| OCR loan-application scanner | ✅ Done — with graceful mock-mode fallback |
| Authentication (JWT + Google OAuth) | ✅ Done |
| Automated backend test suite (33 tests) | ✅ Done |
| CI/CD (GitHub Actions) | ✅ Done — tests gate every deploy |
| Cloud deployment | ✅ Done — Cloud Run + Vercel + Neon |
| Docker (local, 3 containers) | ✅ Done |
| On-chain proof submission from the app itself | ⏳ Proven manually, not yet automatic |
| Testnet deployment (e.g. Sepolia) | ⏳ Not started |
| Bank-side authentication / roles | ⏳ Not started — `/bank/*` is currently open |
| Frontend automated tests | ⏳ Not started |

---

## 🏗️ Architecture

```
Applicant (browser)
   │
   ▼
Frontend  ──  React + Vite  ──  Vercel (auto-deploys via git integration)
   │  REST/JSON, JWT-authenticated
   ▼
Backend   ──  FastAPI  ──  Google Cloud Run (auto-deploys via GitHub Actions)
   ├── Auth            JWT · bcrypt · Google OAuth verification
   ├── Inference       ONNX Runtime — real trained model
   ├── OCR             Groq vision model, with mock-mode fallback
   ├── Proof pipeline  EZKL — real witness / prove / verify
   └── Database        Postgres (Neon, production) / SQLite (local default)

Offline / one-time setup
   Kaggle dataset → training (PyTorch) → ONNX model
                  → EZKL circuit compilation → proving/verifying keys
                  → Solidity verifier generation

Validated independently (not yet wired into the live app flow)
   Proof + registry contract → local Ethereum testnet (Anvil) → on-chain verification
```

---

## 📁 Repository structure

<details>
<summary><b>Click to expand full tree</b></summary>

```
zkredit/
├── .github/workflows/ci-cd.yml   # GitHub Actions: tests + auto-deploy pipeline
├── data/raw/loan_data.csv        # Kaggle loan-approval dataset (45k rows)
├── training/                     # Model training — own venv (torch, sklearn, ezkl)
│   ├── train_model.py            # trains + exports the model to ONNX
│   ├── fairness_check.py         # statistical fairness report
│   └── generate_proof.py         # the real EZKL proof pipeline (one-time circuit setup)
├── backend/                      # FastAPI app — own venv (onnxruntime + ezkl + groq)
│   ├── requirements.txt          # production dependencies
│   ├── requirements-dev.txt      # + pytest/httpx, for running the test suite
│   ├── .env.example
│   ├── Dockerfile
│   ├── models/                   # trained model artifacts (committed to git)
│   ├── scripts/entrypoint.sh     # downloads pk.key at container startup
│   ├── tests/                    # 33 automated tests
│   └── app/
│       ├── main.py
│       ├── auth.py               # JWT issuing/verification + password hashing
│       ├── google_auth.py        # Google OAuth ID token verification
│       ├── database.py, db_models.py, schemas.py
│       ├── inference.py          # loads the ONNX model, runs predictions
│       ├── proof_pipeline.py     # real per-application ZK proof generation
│       ├── ocr.py                # Groq-vision loan-application field extraction
│       └── routers/
│           ├── auth.py           # /auth/signup, /login, /google, /me
│           ├── applications.py   # protected — requires login
│           ├── ocr.py            # /ocr/extract-application, /ocr/generate-test-pdf
│           ├── bank.py           # NOT auth-protected yet
│           └── fairness.py
├── frontend/                     # React + Vite + Tailwind + Three.js/Framer Motion
│   ├── .env.example
│   ├── vercel.json                # SPA rewrite rule (required for direct-URL routing)
│   ├── Dockerfile, nginx.conf     # local Docker Compose only — Vercel handles prod
│   └── src/
│       ├── App.jsx, api.js
│       ├── context/AuthContext.jsx
│       ├── components/            # Layout, ProtectedRoute, GoogleSignInButton, ProofSeal,
│       │                          # NetworkGraph3D, Sketchfab3D, ui/ (Button, Spinner, ...)
│       └── pages/                 # Home, Login, Signup, Apply, Status, BankDashboard, Network
├── circuits/loan_model/          # EZKL circuit artifacts
├── contracts/                    # Foundry — LoanApplicationRegistry.sol + tests
│   ├── src/ (LoanApplicationRegistry.sol, IHalo2Verifier.sol, Verifier.sol)
│   ├── test/
│   └── README.md
└── docker-compose.yml            # local-only: db (Postgres), backend, frontend
```

</details>

---

## 🛠️ Setup

### 0. Prerequisites

| Tool | Needed for | Check with |
|---|---|---|
| [Git](https://git-scm.com/) | Cloning the repo | `git --version` |
| [Python 3.11+](https://www.python.org/downloads/) | Backend, model training | `python --version` |
| [Node.js 20+](https://nodejs.org/) | Frontend | `node --version` |
| [Foundry](https://book.getfoundry.sh/getting-started/installation) | Smart contracts | `forge --version` |
| [Docker Desktop](https://docs.docker.com/get-docker/) | Optional — local 3-container run | `docker --version` |

> **Windows:** use `python`, not `python3`. If `ezkl` throws `RuntimeError: ... NotPresent`,
> run `set HOME=%USERPROFILE%` first, in the same terminal.

### 1. Clone the repository

```bash
git clone --recursive https://github.com/DevXDividends/ZKredit.git
cd ZKredit
```

**`--recursive` is required** — `contracts/lib/forge-std` is a git submodule. If forgotten:
```bash
git submodule update --init --recursive
```

> Avoid cloning from inside a folder that already shares the repo's name — that creates a
> confusing nested `ZKredit/ZKredit/...` structure.

### 2. What's committed to git vs what you generate yourself

| File / folder | Committed? | Why |
|---|---|---|
| `backend/models/loan_model.onnx` | ✅ | Small (~4KB) — the trained model itself |
| `circuits/loan_model/settings.json`, `model.compiled` | ✅ | Small, needed to reproduce the circuit |
| `circuits/loan_model/vk.key` | ✅ | Small (~75KB) — the verifying key |
| `circuits/loan_model/proof.json` | ✅ | Small — one real, committed example proof |
| `circuits/loan_model/pk.key` | ❌ | 150MB+ proving key — generate locally (Step 5), or fetched automatically in cloud deployments |
| `contracts/lib/forge-std` | ❌ (submodule) | Fetched via `git submodule` |
| KZG trusted-setup file (SRS) | ❌ | Few hundred MB — downloaded automatically on first use |
| `backend/.env`, `frontend/.env`, root `.env` | ❌ | Secrets — never commit these |

Inference works immediately after cloning. Generating a *new* ZK proof needs `pk.key`
(Step 5, or automatically in the deployed cloud environment).

### 3. Set up the contracts (Foundry)

```bash
cd contracts
forge test -vv
```

**10 tests should pass**: 7 against a mock verifier, 3 against the real EZKL-generated
verifier using a committed real proof. See `contracts/README.md` for the Solidity build-flag
details needed to compile the real verifier (already configured in `foundry.toml`).

### 4. Set up the backend and run inference

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows. Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs`. SQLite is the local default — no DB setup required.

### 5. Generate `pk.key` so real proof generation works locally

```bash
cd training
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

cd ../circuits/loan_model
python ../../training/generate_proof.py
```

Runs: SRS download → circuit setup → witness → prove → verify → Solidity verifier
generation. Only needs re-running after retraining or changing the circuit.

> **`solc` not found?** `pip install solc-select && solc-select install 0.8.24 && solc-select use 0.8.24`

### 6. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### 7. Set up authentication (JWT + Google OAuth)

**Email/password** works out of the box, zero config.

<details>
<summary><b>Google sign-in setup (click to expand)</b></summary>

1. [console.cloud.google.com](https://console.cloud.google.com/) → create/select a project.
2. **APIs & Services → OAuth consent screen** → External → fill in app name + your email →
   Save through Scopes and Test Users (add your own account) → Done. "Testing" mode is fine
   for development.
3. **APIs & Services → Credentials → + Create Credentials → OAuth client ID** → Web
   application → under **Authorized JavaScript origins**, add every origin you'll open the
   app from:
   ```
   http://localhost:5173
   https://z-kredit-one.vercel.app
   ```
   Leave **Authorized redirect URIs** empty (client-side popup flow, no redirect needed).
   Copy the **Client ID**.
4. Set the same Client ID in both:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=...`
5. Restart both dev servers.

> Google matches origins **exactly** — no wildcards. Vercel preview URLs (unique per deploy)
> will never match; only the stable production URL works for Google sign-in. Vite env vars
> are also baked into the bundle at **build** time — a config change needs a rebuild/redeploy.

If skipped, the app still works — the Google button shows a placeholder and email/password
remains fully available.

</details>

---

## 🧪 Testing

The backend has a **33-test** automated suite (`backend/tests/`) covering:

- **Auth** — signup success/duplicate-email/weak-password, login success/failure, `/auth/me`
  with valid/missing/garbage tokens
- **Applications** — submission, validation, ownership isolation (verified with two separate
  accounts), list-scoping
- **Proof pipeline** — auth/ownership checks, and a deterministic simulation of the
  "missing `pk.key`" path (via `monkeypatch`, so it's identical in CI and locally)
- **OCR** — auth requirements, PDF validation, test-PDF-generator shape, mock-mode extraction

```bash
cd backend
venv\Scripts\activate
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

Every test that creates a user uses a fresh, randomly-generated email, against an isolated
throwaway SQLite database created fresh per run — never a real dev/production database.

---

## 🔄 CI/CD

`.github/workflows/ci-cd.yml` runs on every push and PR to `main`:

| Job | Runs | Purpose |
|---|---|---|
| `backend-tests` | Always | The 33-test `pytest` suite |
| `frontend-build` | Always | `npm ci` + lint + `vite build` |
| `contracts-tests` | Always | The 10-test Foundry suite |
| `deploy-backend` | Only on push to `main`, only if both test jobs pass | Builds, pushes, and deploys the Docker image to Cloud Run |

**Frontend deploys via Vercel's own git integration** (production on `main`, previews on
PRs) — independent of this workflow.

**View test output:** Actions tab → a workflow run → any job → expand "Run tests" for the
full output, same as running locally.

**Get notified on failure:** GitHub → profile → Settings → Notifications → Actions → enable
"Failed workflows only." Zero code changes needed.

<details>
<summary><b>GitHub Secrets required for <code>deploy-backend</code></b></summary>

| Secret | Value |
|---|---|
| `GCP_PROJECT_ID` | Your Google Cloud project ID |
| `GCP_SA_KEY` | Full JSON of a service account key (see Deployment) |
| `JWT_SECRET_KEY` | A random secret |
| `GOOGLE_CLIENT_ID` | Same value as `backend/.env` |
| `DATABASE_URL` | Production Postgres connection string |
| `ALLOWED_ORIGINS` | Production frontend URL |
| `PK_KEY_URL` | Public URL to a hosted `pk.key` (see Deployment) |
| `GROQ_API_KEY` | Optional — OCR falls back to mock mode without it |

</details>

---

## ☁️ Deployment (cloud)

| Component | Platform | Notes |
|---|---|---|
| Backend | Google Cloud Run | Free tier — scales to zero, real vCPU during active requests |
| Frontend | Vercel | Free tier — auto-deploys via git |
| Database | Neon (Postgres) | Free tier, no expiry |
| `pk.key` (150MB+) | GitHub Releases | Downloaded at container startup |

<details>
<summary><b>Why Cloud Run, not Render (click to expand)</b></summary>

This project initially deployed to Render's free tier, but real ZK proof generation is
CPU-bound and Render's free tier throttles CPU so heavily that proof generation regularly
exceeded Render's ~60s request-proxy timeout. Cloud Run's free tier allocates a full vCPU
during active request handling, making proof generation fast enough to complete within a
single request — no architecture changes needed. Cloud Run's "Always Free" tier (2M
requests/month, 180,000 vCPU-seconds/month) is separate from, and outlasts, the $300/90-day
trial credit new accounts get.

</details>

<details>
<summary><b>One-time Google Cloud setup (click to expand)</b></summary>

```bash
gcloud init
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create zkredit-repo --repository-format=docker --location=us-central1
gcloud auth configure-docker us-central1-docker.pkg.dev
```

Create a least-privilege service account for GitHub Actions:
```bash
gcloud iam service-accounts create github-actions-deployer --display-name="GitHub Actions Deployer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions-deployer@YOUR_PROJECT_ID.iam.gserviceaccount.com
```
Paste the full contents of `github-actions-key.json` into the `GCP_SA_KEY` GitHub secret,
then delete the local file — never commit it.

</details>

<details>
<summary><b>Manual deploy, for the first deploy or ad-hoc redeploys (click to expand)</b></summary>

```bash
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/zkredit-repo/zkredit-backend -f backend/Dockerfile .
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/zkredit-repo/zkredit-backend

gcloud run deploy zkredit-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/zkredit-repo/zkredit-backend \
  --region us-central1 --allow-unauthenticated --memory 1Gi \
  --env-vars-file=env-vars.yaml
```
`env-vars.yaml` (add to `.gitignore`, never commit) holds the same keys as the GitHub Secrets
table above, as plain YAML. After the first deploy, pushes to `main` redeploy automatically
via CI/CD.

</details>

<details>
<summary><b>Hosting <code>pk.key</code> for cloud deployments (click to expand)</b></summary>

Cloud Run has no volume-mount mechanism, and `pk.key` is too large for git:

1. GitHub repo → **Releases → Create a new release** → tag it (e.g. `circuit-v1`) → attach
   `circuits/loan_model/pk.key` as a binary asset → publish.
2. `backend/scripts/entrypoint.sh` runs on every container start: downloads `pk.key` from
   `PK_KEY_URL` if not already present locally; skips the download if it already is (e.g. a
   warm instance handling a later request).
3. Set `PK_KEY_URL` to `https://github.com/OWNER/REPO/releases/download/TAG/pk.key`.

> **Cold-start caveat:** every scale-from-zero re-downloads `pk.key` (~150MB) against the free
> tier's 1GB/month egress. Fine for low-traffic personal projects; a high-traffic deployment
> might want a CDN-fronted copy instead.

</details>

<details>
<summary><b>Cloud Run + Docker port requirement (click to expand)</b></summary>

Cloud Run injects its own `PORT` env var and requires the container to listen on it —
`backend/Dockerfile`'s `CMD` handles this without breaking local/Docker Compose:
```dockerfile
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
```

</details>

<details>
<summary><b>Frontend (Vercel) setup (click to expand)</b></summary>

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the GitHub repo.
2. Set **Root Directory** to `frontend` (required — this is a monorepo).
3. Framework preset: Vite (auto-detected).
4. Environment variables: `VITE_API_URL` (Cloud Run URL), `VITE_GOOGLE_CLIENT_ID`. Prefer
   **Config** type over **Secret** — secret-type vars are write-only and can't be edited
   later, and neither value is actually sensitive (both get baked into the public bundle).
5. Deploy. Future pushes to `main` auto-deploy to production; PRs get preview deploys.

**`vercel.json` is required** for direct-URL / refresh support on client-side routes:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

> Test Google sign-in against the **stable production URL** only, not a per-deployment
> preview URL — only production is in Google's authorized origins list.

</details>

<details>
<summary><b>Database (Neon) setup (click to expand)</b></summary>

1. [neon.tech](https://neon.tech) → sign up (free, no card) → create a project.
2. Dashboard → **Connect** → copy the connection string.
3. Use it as `DATABASE_URL` in the GitHub secret and (if testing locally against it)
   `backend/.env`.

</details>

---

## 🩹 Troubleshooting

<details>
<summary><b>Setup issues (click to expand)</b></summary>

**`contracts/` folder missing after cloning.**
Never pushed. In your original working copy: `git add contracts && git commit -m "Add contracts" && git push`.

**`git submodule update --init --recursive` does nothing.**
Confirm `.gitmodules` exists at the repo root. If missing, from `contracts/`, run
`forge install foundry-rs/forge-std`, then commit the resulting `.gitmodules`.

**"Missing circuit artifact(s): .../pk.key" (locally).**
Expected until Setup Step 5. If `vk.key` is *also* missing, check `.gitignore` only excludes
`pk.key`, not `vk.key`.

**Nested `ZKredit/ZKredit/...` folder after cloning.**
Cloned from inside a folder already named after the repo — re-clone into a clean parent.

**`ezkl` throws `RuntimeError: ... NotPresent` on Windows.**
`set HOME=%USERPROFILE%` first, same terminal.

**Solidity "stack too deep" compiling the real verifier.**
Already handled in the committed `foundry.toml`. See `contracts/README.md` if it recurs
after modifying the contracts.

</details>

<details>
<summary><b>Auth & deployment issues (click to expand)</b></summary>

**Google button shows "isn't configured".**
`VITE_GOOGLE_CLIENT_ID` isn't set, or the frontend wasn't rebuilt after adding it.

**"Invalid Google token" / "origin not allowed".**
The exact origin isn't in the OAuth client's Authorized JavaScript Origins. Confirm you're
on the stable production URL, not a preview URL.

**CORS error (`No 'Access-Control-Allow-Origin' header`).**
The backend's `ALLOWED_ORIGINS` doesn't exactly match the requesting origin (scheme + host,
no trailing slash). Redeploy after changing it.

**Direct navigation to `/signup` 404s on Vercel, but works when clicked from `/`.**
Missing `vercel.json` SPA rewrite rule.

**`ezkl.prove()` panics (`pyo3_runtime.PanicException`) in tests/background threads.**
A pyo3/Rust-runtime interaction issue, not a bug in this project's logic — the test suite
avoids ever making a real proving call and verifies the missing-`pk.key` path via
`monkeypatch` instead.

</details>

---

## 📝 Notes on scope and design decisions

- **Bank dashboard (`/bank`) is currently unauthenticated.** Auth covers the applicant-facing
  side; a bank-employee login/role system is a natural next addition.
- **On-chain proof submission isn't wired into the app yet.** The full pipeline is manually
  proven to work end-to-end (see `contracts/README.md`), but the backend doesn't yet
  automatically submit proofs to a chain.
- **OCR runs in mock mode without a Groq API key**, intentionally — the feature stays
  demoable without requiring every deployer to have a Groq account.
- **SQLite locally, Postgres in Docker/production** — both via the same `DATABASE_URL`.
- **Frontend and backend auto-deploy differently on purpose** — Vercel's native git
  integration is simpler and better-suited for frontend (instant PR previews) than
  reimplementing it in GitHub Actions; the backend needs GitHub Actions because Cloud Run
  deployment is a multi-step build→push→deploy sequence that benefits from explicit
  test-gating.