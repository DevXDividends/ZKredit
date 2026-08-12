# ZKredit

Zero-Knowledge Proof Based Fair Lending Verification System. A bank proves a loan decision
came from its real, unmodified model — without revealing the model weights or the
applicant's private data.

## Project status

| Phase | Status |
|---|---|
| 1 — Environment & scaffold | ✅ Done |
| 2 — Data preprocessing + model training | ✅ Done (89.6% accuracy on real Kaggle data) |
| 3 — EZKL circuit compilation | ✅ Done. Proof generation (setup/prove/verify) blocked on network access to `kzg.ezkl.xyz` in some environments — see [Known blocker](#known-blocker-ezkl-proof-generation) |
| 4 — Solidity verifier + registry contract | ✅ Contract + 7/7 tests passing (against a mock verifier — swap in the real EZKL-generated verifier once Phase 3 unblocks) |
| 5 — Backend API | ✅ Done — FastAPI, SQLite, real ONNX inference wired in |
| 6 — Frontend | ✅ Done — React + Tailwind, 4 pages (Home, Apply, Status, Bank Dashboard) |
| 7 — ZK proof ↔ backend/frontend integration | ⏳ Pending Phase 3 unblock |

## Project structure

```
zkredit/
├── data/
│   └── raw/loan_data.csv        # Kaggle loan-approval dataset (45k rows)
├── training/                    # Model training — own venv, heavy ML deps (torch, sklearn)
│   ├── requirements.txt
│   ├── train_model.py           # trains + exports ONNX -> ../backend/models/
│   └── fairness_check.py        # writes ../backend/models/fairness_report.json
├── backend/                     # FastAPI app — own venv, lightweight (onnxruntime only)
│   ├── requirements.txt
│   ├── models/                  # trained model artifacts (committed — see below)
│   │   ├── loan_model.onnx
│   │   ├── feature_columns.json
│   │   ├── scaler.json
│   │   ├── metrics.json
│   │   ├── fairness_report.json
│   │   └── sample_input.json
│   └── app/
│       ├── main.py
│       ├── inference.py         # loads loan_model.onnx, runs predictions
│       ├── db_models.py
│       ├── database.py
│       ├── schemas.py
│       └── routers/
│           ├── applications.py
│           ├── bank.py
│           └── fairness.py
├── frontend/                    # React + Vite + Tailwind
│   └── src/
│       ├── pages/                (Home, Apply, Status, BankDashboard)
│       ├── components/
│       └── api.js
├── circuits/                    # EZKL circuit build (settings, compiled model)
├── contracts/                   # Foundry — LoanApplicationRegistry.sol + tests
└── docs/
```

**Why two Python venvs?** `training/` needs `torch` + `scikit-learn` (~1GB of deps) just to
produce a 4KB ONNX file. `backend/` only ever *reads* that ONNX file via `onnxruntime`, which
is much lighter. Keeping them separate means the backend stays fast to install and deploy,
and you don't need `torch` on a server that's just serving predictions.

**Why is `backend/models/` committed to git?** The trained model is tiny (a logistic
regression exports to ~4KB of ONNX). Committing it means anyone who clones the repo gets a
working backend immediately — no training required unless they want to retrain on new data.

## Setup

### 1. Clone and get the dataset

```bash
git clone <this-repo-url>
cd zkredit
```

`data/raw/loan_data.csv` is committed, so no separate download needed.

### 2. (Optional) Retrain the model

Only needed if you want to retrain — `backend/models/` already has a trained model committed.

```bash
cd training
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

python3 train_model.py --csv ../data/raw/loan_data.csv --epochs 300
python3 fairness_check.py --csv ../data/raw/loan_data.csv
```

Writes to `../backend/models/`: `loan_model.onnx`, `feature_columns.json`, `scaler.json`,
`metrics.json`, `sample_input.json`, `fairness_report.json`. Expected accuracy: ~89-90%.

### 3. Backend

```bash
cd backend
python3 -m venv venv            # separate venv from training/
source venv/bin/activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`. Loads `backend/models/loan_model.onnx` on startup.

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env            # points to http://localhost:8000 by default
npm run dev
```

Opens at `http://localhost:5173`.

### 5. Contracts

```bash
git submodule update --init --recursive   # fetches forge-std (tracked as a git submodule)
cd contracts
forge test -vv
```

> If you cloned with `git clone --recursive <url>` originally, the submodule is already
> there and you can skip straight to `forge test`.

Tests `LoanApplicationRegistry` against `MockVerifier` (a test double). Once the real
EZKL-generated verifier is available, deploy it and call `registerModel()` with its address
— no changes needed to the registry contract itself.

## Known blocker: EZKL proof generation

EZKL's `get_srs()` needs to download the KZG trusted-setup file from `kzg.ezkl.xyz`. If your
environment can reach that domain, the remaining EZKL pipeline (from inside `circuits/loan_model/`,
with the `training` venv active — it has `ezkl` installed) is a straight run:

```python
import ezkl
ezkl.get_srs('settings.json')
ezkl.setup('model.compiled', 'vk.key', 'pk.key')
ezkl.gen_witness('input.json', 'model.compiled', 'witness.json')
ezkl.prove('witness.json', 'model.compiled', 'pk.key', 'proof.json')
ezkl.verify('proof.json', 'settings.json', 'vk.key')
ezkl.create_evm_verifier(vk_path='vk.key', settings_path='settings.json',
                          sol_code_path='Verifier.sol', abi_path='Verifier.abi')
```

Everything up to `get_srs()` was already validated in `circuits/loan_model/` — settings
generation, calibration, and circuit compilation all succeeded there.
