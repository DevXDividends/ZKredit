"""
ZKredit — Local EZKL Proof Pipeline (run this on your own machine)
---------------------------------------------------------------------
Picks up where the sandbox got blocked: downloads the KZG trusted-setup file,
runs setup -> witness -> prove -> verify, then generates the Solidity verifier
contract. Everything up to this point (settings.json, model.compiled) was
already validated in the sandbox and is included as-is.

REQUIREMENTS:
  - Run this from inside circuits/loan_model/ (this script expects to find
    model.onnx, input.json, settings.json, model.compiled right next to it).
  - Your `training` venv active (has `ezkl` installed). If not:
        pip install ezkl
  - `solc` available on PATH (needed for create_evm_verifier). If missing:
        pip install solc-select && solc-select install 0.8.20 && solc-select use 0.8.20
  - Open internet access — this step specifically needs to reach kzg.ezkl.xyz,
    which is what was blocked in the sandbox.

USAGE:
    cd circuits/loan_model
    python3 ../../training/generate_proof.py

OUTPUTS (all written into circuits/loan_model/):
    kzg.srs           - trusted setup file (large, ~few hundred MB — don't commit to git)
    vk.key            - verifying key
    pk.key            - proving key
    witness.json      - circuit witness for the sample input
    proof.json         - the actual ZK proof
    Verifier.sol      - auto-generated Solidity verifier contract
    Verifier.abi      - its ABI

Once this succeeds, send back (or copy into contracts/):
    - Verifier.sol  -> deploy this, then call registerModel() on
                       LoanApplicationRegistry with its address
    - proof.json + verify() result -> confirms the whole pipeline works
"""

import asyncio
import os
import sys
import time

import ezkl

REQUIRED_FILES = ["model.onnx", "input.json", "settings.json", "model.compiled"]


def check_prereqs():
    missing = [f for f in REQUIRED_FILES if not os.path.exists(f)]
    if missing:
        print(f"ERROR: missing required files in current directory: {missing}")
        print("Run this script from inside circuits/loan_model/")
        sys.exit(1)


async def download_srs():
    """get_srs is the one ezkl call that needs a running event loop — it
    returns an awaitable even though inspect.iscoroutinefunction says False
    (pyo3-asyncio quirk). Confirmed by testing: calling it outside asyncio.run
    raises 'no running event loop'; calling it without awaiting inside one
    silently does nothing useful. This wrapper is required."""
    return await ezkl.get_srs("settings.json")


def main():
    check_prereqs()
    t0 = time.time()

    print("=" * 60)
    print("1/6  Downloading KZG trusted setup (kzg.ezkl.xyz)...")
    print("=" * 60)
    res = asyncio.run(download_srs())
    print(f"  -> {res}")

    print("\n" + "=" * 60)
    print("2/6  Running setup (generating proving + verifying keys)...")
    print("=" * 60)
    res = ezkl.setup("model.compiled", "vk.key", "pk.key")
    print(f"  -> {res}")

    print("\n" + "=" * 60)
    print("3/6  Generating witness...")
    print("=" * 60)
    res = ezkl.gen_witness("input.json", "model.compiled", "witness.json")
    print(f"  -> {res}")

    print("\n" + "=" * 60)
    print("4/6  Generating proof...")
    print("=" * 60)
    res = ezkl.prove("witness.json", "model.compiled", "pk.key", "proof.json")
    print(f"  -> proof generated: {res}")

    print("\n" + "=" * 60)
    print("5/6  Verifying proof...")
    print("=" * 60)
    res = ezkl.verify("proof.json", "settings.json", "vk.key")
    print(f"  -> VERIFIED: {res}")
    if not res:
        print("  !! Verification returned False — something is wrong. Stopping before verifier generation.")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("6/6  Generating Solidity verifier contract...")
    print("=" * 60)
    res = ezkl.create_evm_verifier(
        vk_path="vk.key",
        settings_path="settings.json",
        sol_code_path="Verifier.sol",
        abi_path="Verifier.abi",
    )
    print(f"  -> {res}")

    elapsed = time.time() - t0
    print("\n" + "=" * 60)
    print(f"DONE in {elapsed:.1f}s")
    print("=" * 60)
    print("Files produced in this directory:")
    for f in ["vk.key", "pk.key", "witness.json", "proof.json", "Verifier.sol", "Verifier.abi"]:
        exists = "✓" if os.path.exists(f) else "✗ MISSING"
        print(f"  {exists}  {f}")
    print("\nNext steps:")
    print("  1. Copy Verifier.sol into contracts/src/")
    print("  2. forge create it and note the deployed address")
    print("  3. Call LoanApplicationRegistry.registerModel(1, <verifier address>)")
    print("  4. Send proof.json back for backend integration")


if __name__ == "__main__":
    main()
