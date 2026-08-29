# ZKredit

**Zero-Knowledge Proof Based Fair Lending Verification System.**

A bank proves that a loan decision came from its real, unmodified credit model — without
ever revealing the model's internal weights, and without ever exposing the applicant's
private financial data. This is done using a real zero-knowledge proof (ZK-SNARK, via EZKL
and Halo2), not a simulation.

## How it works, in plain terms

1. **An applicant submits a loan application** (income, credit history, loan details) through
   the web app, after logging in.
2. **The bank's model evaluates it** and returns a decision (Approved/Rejected) with a
   confidence score — this is a normal, instant machine-learning inference.
3. **A zero-knowledge proof can then be generated** for that specific decision. This proof
   mathematically demonstrates: *"this exact decision was produced by evaluating the bank's
   real, registered model on some input"* — without revealing what that input was, and
   without revealing the model's weights.
4. **Anyone can verify the proof** — locally, or (once deployed) on a public blockchain —
   without needing to trust the bank's word for it. If someone tampers with the proof even
   slightly, verification fails. This is demonstrated directly in the app via a "tamper demo."

This addresses a real regulatory problem in lending: banks are legally required to make fair,
non-discriminatory, and *consistent* credit decisions, but today there's no way for a
regulator or applicant to verify a decision came from the bank's actual approved model rather
than being overridden, faked, or quietly changed. ZKredit makes that verifiable.

---

## Project status

| Area | Status |
|---|---|
| Model training (real Kaggle loan-approval dataset, 45k rows) | ✅ Done — 89.6% accuracy |
| Fairness analysis (statistical parity across demographic groups) | ✅ Done |
| EZKL circuit compilation | ✅ Done |
| Real ZK proof generation | ✅ Done — verified both locally and on-chain (local Anvil testnet) |
| Solidity verifier + on-chain registry contract | ✅ Done — real EZKL-generated verifier, 10/10 Foundry tests passing |
| Backend API (FastAPI) | ✅ Done |
| Frontend (React) | ✅ Done |
| ZK proof pipeline wired into the backend | ✅ Done — real per-application proof generation, not a stub |
| "Tamper demo" (lets users see verification actually fail) | ✅ Done |
| Docker | ✅ Done — 3 containers: Postgres, backend, frontend |
| Authentication (JWT, email/password + Google OAuth) | ✅ Done — applicants must log in to apply |
| Database (PostgreSQL) | ✅ Done — SQLite remains the default for local dev without Docker |
| On-chain proof submission triggered from the app itself | ⏳ Not yet wired — proven to work manually (see `contracts/README.md`), but the backend doesn't submit to a chain automatically yet |
| Testnet deployment (e.g. Sepolia) | ⏳ Not started |
| Bank-side authentication / roles | ⏳ Not started — the `/bank/*` dashboard is currently open and unauthenticated |

---

## Project structure

```
zkredit/
├── data/raw/loan_data.csv        # Kaggle loan-approval dataset (45k rows)
├── training/                     # Model training — own Python venv (torch, sklearn, ezkl)
│   ├── requirements.txt
│   ├── train_model.py            # trains + exports the model to ONNX
│   ├── fairness_check.py         # statistical fairness report
│   └── generate_proof.py         # the real EZKL proof pipeline (one-time circuit setup)
├── backend/                      # FastAPI app — own Python venv (onnxruntime + ezkl)
│   ├── requirements.txt
│   ├── .env.example              # JWT_SECRET_KEY, GOOGLE_CLIENT_ID, DATABASE_URL
│   ├── Dockerfile
│   ├── models/                   # trained model artifacts (committed to git)
│   └── app/
│       ├── main.py
│       ├── auth.py               # JWT issuing/verification + password hashing
│       ├── google_auth.py        # Google OAuth ID token verification
│       ├── database.py
│       ├── db_models.py          # User, Application, ProofRecord (SQLAlchemy)
│       ├── schemas.py            # Pydantic request/response models
│       ├── inference.py          # loads the ONNX model, runs predictions
│       ├── proof_pipeline.py     # real per-application ZK proof generation
│       └── routers/
│           ├── auth.py           # /auth/signup, /auth/login, /auth/google, /auth/me
│           ├── applications.py   # protected routes — require login
│           ├── bank.py           # bank dashboard — NOT auth-protected yet
│           └── fairness.py
├── frontend/                     # React + Vite + Tailwind
│   ├── .env.example              # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── App.jsx
│       ├── api.js                # API client, attaches JWT automatically
│       ├── context/AuthContext.jsx
│       ├── components/
│       │   ├── Layout.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── GoogleSignInButton.jsx
│       │   └── ProofSeal.jsx
│       └── pages/
│           ├── Home.jsx
│           ├── Login.jsx
│           ├── Signup.jsx
│           ├── Apply.jsx
│           ├── Status.jsx
│           └── BankDashboard.jsx
├── circuits/loan_model/          # EZKL circuit artifacts — see "What's committed" below
├── contracts/                    # Foundry project — LoanApplicationRegistry.sol + tests
│   ├── src/
│   │   ├── LoanApplicationRegistry.sol
│   │   ├── IHalo2Verifier.sol
│   │   └── Verifier.sol          # the real EZKL-generated verifier
│   ├── test/
│   └── README.md                 # contracts-specific docs (build flags, real-proof testing)
├── docker-compose.yml            # 3 services: db (Postgres), backend, frontend
└── .gitignore / .dockerignore
```

---

## 0. Prerequisites

Install these before you start:

| Tool | Needed for | Check with |
|---|---|---|
| [Git](https://git-scm.com/) | Cloning the repo | `git --version` |
| [Python 3.11+](https://www.python.org/downloads/) | Backend, model training | `python --version` (Windows) or `python3 --version` (Mac/Linux) |
| [Node.js 20+](https://nodejs.org/) | Frontend | `node --version` |
| [Foundry](https://book.getfoundry.sh/getting-started/installation) | Smart contracts | `forge --version` |
| [Docker Desktop](https://docs.docker.com/get-docker/) | Optional — one-command run of all 3 services | `docker --version` |

**Windows-specific notes:**
- Use `python`, not `python3`.
- If `ezkl` ever throws `RuntimeError: ... NotPresent`, run `set HOME=%USERPROFILE%` first,
  in the same terminal, before running Python/ezkl commands.

---

## 1. Clone the repository

```bash
git clone --recursive https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
```

**`--recursive` is required.** The `contracts/` folder depends on `forge-std`, which is
tracked as a git submodule rather than committed as plain files (keeps the repo small). If
you forgot `--recursive`, or `contracts/lib/` turns out empty, fix it after the fact with:

```bash
git submodule update --init --recursive
```

**Common mistake to avoid:** don't run `git clone <url>` from *inside* a folder that already
shares the repo's name (e.g. running it inside `D:\ZKredit\`) — that creates a confusing
nested `ZKredit\ZKredit\...` structure. Clone into a clean parent directory instead.

After cloning, confirm you see all of these top-level folders — if any are missing, something
didn't get pushed or pulled correctly (see Troubleshooting at the bottom):

```
backend/  circuits/  contracts/  data/  frontend/  training/
```

---

## 2. What's committed to git vs what you generate yourself

Several things are **intentionally not** committed, because they're either large or
environment-specific:

| File / folder | Committed? | Why |
|---|---|---|
| `backend/models/loan_model.onnx` | ✅ Yes | Small (~4KB) — the trained model itself |
| `circuits/loan_model/settings.json`, `model.compiled` | ✅ Yes | Small, needed to reproduce the circuit |
| `circuits/loan_model/vk.key` | ✅ Yes | Small (~75KB) — the verifying key |
| `circuits/loan_model/proof.json` | ✅ Yes | Small — one real, committed example proof |
| `circuits/loan_model/pk.key` | ❌ **No** | 150MB+ proving key — you generate this locally (Step 5) |
| `contracts/lib/forge-std` | ❌ No (submodule) | Fetched via `git submodule`, not committed as files |
| The KZG trusted-setup file (SRS) | ❌ No | A few hundred MB — downloaded automatically the first time it's needed |
| `backend/.env`, `frontend/.env`, root `.env` | ❌ No | Contain secrets (JWT signing key, Google OAuth client ID) — never commit these |

**Practical effect of this:** loan-decision inference works immediately after cloning with no
extra setup. Generating a *new* ZK proof for an application does **not** work until you
generate `pk.key` yourself (Step 5) — this is expected, not a bug.

---

## 3. Set up the contracts (Foundry)

```bash
cd contracts
forge test -vv
```

You should see **10 tests pass**: 7 against a mock verifier (fast, no real cryptography), and
3 against the real EZKL-generated verifier using a committed real proof — including one test
that deliberately corrupts a proof byte and confirms verification correctly rejects it.

If `contracts/lib/` is empty, go back to Step 1 and run
`git submodule update --init --recursive` from the repo root.

See `contracts/README.md` for build-flag details (the real verifier needs specific Solidity
compiler settings to compile — this is already configured in `foundry.toml`, but documented
there in case you need to reproduce it elsewhere).

---

## 4. Set up the backend and run inference

This gets loan-decision inference working — no ZK proof setup needed yet for this step.

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows. Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` to see the interactive API docs. SQLite is used by default
for local (non-Docker) dev — no database setup required.

(Optional) copy `backend/.env.example` to `backend/.env` if you want to set a custom JWT
secret or enable Google sign-in now — see Step 7 below for the full walkthrough.

---

## 5. Generate `pk.key` so real proof generation works

The backend's "Generate proof" feature needs a proving key (`pk.key`) that isn't committed to
git due to its size. Generate it once:

```bash
cd training
python -m venv venv
venv\Scripts\activate          # Windows. Mac/Linux: source venv/bin/activate
pip install -r requirements.txt

cd ../circuits/loan_model
python ../../training/generate_proof.py
```

This runs, in order: KZG trusted-setup download → circuit setup (generates `pk.key` and
`vk.key`) → witness generation → proof generation → proof verification → Solidity verifier
generation. It can take a few minutes the first time (mostly the SRS download); subsequent
runs are fast since the SRS gets cached locally.

You only need to re-run this if you retrain the model or otherwise change the circuit —
`pk.key`/`vk.key` are tied to the circuit's structure, not to any individual application's data.

**If `solc` isn't found** during the Solidity verifier generation step:
```bash
pip install solc-select
solc-select install 0.8.24
solc-select use 0.8.24
```
then re-run the script.

---

## 6. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

(Optional) copy `frontend/.env.example` to `frontend/.env` if you want to point at a
different backend URL, or to enable Google sign-in (Step 7 below).

---

## 7. Set up authentication (JWT + Google OAuth)

Applicants must log in to submit a loan application (`/apply` is a protected route in the
frontend, and the corresponding backend endpoints require a valid JWT). Two sign-in methods
are supported: **email/password** and **Google**.

### Email/password

Works out of the box — nothing to configure. Passwords are hashed with bcrypt; sessions use
JWTs valid for 7 days.

### Google sign-in — complete setup steps

Google sign-in requires creating OAuth credentials in Google Cloud Console. Full walkthrough:

**Step 1 — Create a Google Cloud project** (skip if you already have one you want to use)
1. Go to [console.cloud.google.com](https://console.cloud.google.com/).
2. Click the project dropdown at the top left (next to the "Google Cloud" logo) → **New
   Project**.
3. Give it a name (e.g. `ZKredit`) → **Create**. Wait a few seconds for it to be created, then
   select it from the project dropdown so it becomes the active project.

**Step 2 — Configure the OAuth consent screen** (required before you can create credentials)
1. In the left sidebar, or via the top search bar, go to **APIs & Services → OAuth consent
   screen**.
2. Choose **External** as the user type (unless you have a Google Workspace organization and
   specifically want Internal) → **Create**.
3. Fill in the required fields:
   - **App name**: e.g. `ZKredit`
   - **User support email**: your email address
   - **Developer contact information**: your email address again
   → **Save and Continue**.
4. On the **Scopes** page, you don't need to add any scopes for this project — click **Save
   and Continue**.
5. On the **Test users** page (this appears because new apps start in "Testing" mode): click
   **+ Add users** and add the Google account(s) you want to be able to sign in with while
   testing → **Save and Continue**.
6. Review the summary and finish. Your app remains in "Testing" mode, which is completely
   fine for development — anyone not added as a test user simply can't sign in yet (Google
   will show them a warning instead of letting them through).

**Step 3 — Create the OAuth Client ID**
1. Go to **APIs & Services → Credentials**.
2. Click **+ Create Credentials → OAuth client ID**.
3. **Application type**: select **Web application**.
4. **Name**: anything descriptive, e.g. `ZKredit Web Client`.
5. Under **Authorized JavaScript origins**, click **+ Add URI** and enter:
   ```
   http://localhost:5173
   ```
   (When you eventually deploy the frontend somewhere public, add that URL here too.)
6. Leave **Authorized redirect URIs** empty. This project uses Google Identity Services'
   button/popup flow (`google.accounts.id`), which authenticates entirely client-side and
   sends a signed ID token to the backend for verification — it does not use the
   redirect-based OAuth flow, so no redirect URI is needed.
7. Click **Create**. A dialog appears showing your **Client ID** (a long string ending in
   `.apps.googleusercontent.com`) and a Client Secret. **This project only needs the Client
   ID** — the secret is not used, since the backend verifies the ID token's cryptographic
   signature directly against Google's public keys rather than doing a server-side code
   exchange.
8. Copy the **Client ID**.

**Step 4 — Add the Client ID to the project**

The same Client ID value goes in **two places**:

In `backend/.env` (copy from `backend/.env.example` first if you haven't already):
```
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

In `frontend/.env` (copy from `frontend/.env.example` first if you haven't already):
```
VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
```

**Restart both the backend and frontend dev servers** after adding these — environment
variables are only read at process startup.

**Step 5 — Test it**
1. Go to `http://localhost:5173/signup` (or `/login`).
2. You should now see an actual "Continue with Google" button, instead of a placeholder
   message saying it isn't configured.
3. Click it, pick the Google account you added as a test user in Step 2.5, and you should be
   redirected to `/apply`, already logged in.

**If you skip this whole section:** the app still works completely fine. The Google button
just shows a small placeholder message, and email/password sign-in remains fully available —
Google sign-in is an addition, not a requirement.

### JWT secret

The default value in `backend/.env.example` (`dev-secret-change-in-production`) is fine for
local development on your own machine. For anything beyond that, generate a real random
secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
and set the result as `JWT_SECRET_KEY` in `backend/.env`.

---

## Option: Run everything with Docker (3 containers)

Once Step 5 has produced `circuits/loan_model/pk.key` (optional, but needed for real proof
generation to work inside the containers too), you can run the whole stack with:

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend / API docs: `http://localhost:8000/docs`
- Postgres: `localhost:5432` (user `zkredit`, database `zkredit`)

This starts **three containers**:
- `db` — Postgres 16, with a persistent named volume so data survives restarts
- `backend` — the FastAPI app, connected to `db` (Postgres tables are created automatically
  on first startup — there's no separate migration step to run)
- `frontend` — the React app, built and served via nginx

`./circuits` on your host machine is mounted into the backend container automatically, so
whatever's on your disk (including `pk.key`, once you've generated it) is exactly what the
container uses — nothing needs to be copied into the image itself.

**To enable Google sign-in when running via Docker**, set the same environment variables
before starting the stack:
```bash
export GOOGLE_CLIENT_ID=<your client id>
export JWT_SECRET_KEY=<a real random secret>
docker compose up --build
```
(Alternatively, put these in a `.env` file at the repo root — Docker Compose picks that up
automatically.) Google's origin check is based on the browser origin, not which container
serves the page, so the same `http://localhost:5173` entry from the manual setup (Step 7,
Step 3.5) covers the Docker setup too — no separate Google Cloud configuration needed.

**To completely reset the database** (wipes all users and applications):
```bash
docker compose down -v
```

**To rebuild after changing code:**
```bash
docker compose up --build
```

---

## Troubleshooting

**`contracts/` folder is missing entirely after cloning.**
This means it was never pushed to the remote repository in the first place. In your
*original* working copy (the one that actually has the folder), run `git status`. If
`contracts/` shows up as untracked, run:
```bash
git add contracts
git commit -m "Add contracts directory"
git push origin main
```
If `git status` is already clean but the folder still isn't visible on GitHub, run
`git log --oneline -- contracts` — if that shows commits, you just need to `git push`.

**`git submodule update --init --recursive` does nothing / `contracts/lib` stays empty.**
Confirm a `.gitmodules` file exists at the repo root containing a
`[submodule "contracts/lib/forge-std"]` block. If it's missing entirely, the submodule was
never registered — from inside `contracts/`, run `forge install foundry-rs/forge-std`, then
commit the resulting `.gitmodules` file from the repo root.

**Frontend/backend shows "Missing circuit artifact(s): .../pk.key, .../vk.key".**
`pk.key` missing is expected until you complete Step 5. If `vk.key` is *also* missing, it
likely failed to get committed — check that your `.gitignore` doesn't accidentally exclude
it (it should only exclude `pk.key`, not `vk.key`), then
`git add circuits/loan_model/vk.key && git commit && git push`.

**A nested folder like `ZKredit/ZKredit/...` appeared after cloning.**
You ran `git clone` from inside a folder that already shared the repository's name. Delete
the nested copy, move to the parent directory, and re-clone into a clean location.

**Google button shows "Google sign-in isn't configured".**
`VITE_GOOGLE_CLIENT_ID` isn't set in `frontend/.env`, or the frontend dev server wasn't
restarted after you added it.

**Google sign-in fails with "Invalid Google token", or a popup error about an unauthorized
origin.**
The origin `http://localhost:5173` isn't listed in the OAuth client's **Authorized JavaScript
origins** in Google Cloud Console (see Step 7, Step 3.5) — add it there and wait a minute or
two for the change to propagate.

**Google shows "This app isn't verified" or your account can't sign in at all.**
Your OAuth consent screen is in "Testing" mode, which is normal and expected for local
development — only accounts explicitly added as **Test users** (Step 7, Step 2.5) are allowed
to sign in. Add the account you're testing with there.

**`ezkl` throws `RuntimeError: ... NotPresent` on Windows.**
Run `set HOME=%USERPROFILE%` in the same terminal, before running any Python/ezkl commands.

**Solidity compiler fails with "stack too deep" when running `forge test`.**
This is already worked around in the committed `contracts/foundry.toml`
(`via_ir = true` plus `optimizer_details.yul = false`, and a pinned `solc = "0.8.24"`). If you
still hit this after modifying the contracts, see the detailed explanation in
`contracts/README.md`.

---

## Notes on scope and design decisions

- **Bank dashboard (`/bank`) is currently unauthenticated.** The auth system covers the
  applicant-facing side (signing up, logging in, submitting applications) since that was the
  requested scope. A bank employee login/role system would be a natural next addition.
- **On-chain proof submission isn't wired into the app yet.** The full pipeline — model →
  circuit → proof → on-chain verification — has been manually proven to work end-to-end (see
  `contracts/README.md` for the exact commands), but the backend doesn't yet automatically
  submit generated proofs to a blockchain. Currently, proofs are generated and verified
  locally (off-chain) as part of the applicant-facing flow.
- **SQLite vs Postgres:** local development without Docker defaults to SQLite for simplicity
  (zero setup). Docker Compose uses Postgres, matching the intended production database. Both
  are supported via the same `DATABASE_URL` environment variable.