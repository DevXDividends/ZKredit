# ZKredit Contracts

Foundry project for the on-chain proof-verification registry.

- `src/LoanApplicationRegistry.sol` — banks register a model version + verifier contract,
  then submit ZK proofs for loan decisions. Verified decisions are recorded permanently.
- `src/IHalo2Verifier.sol` — interface matching EZKL's auto-generated Halo2 verifier
  contract. The registry depends on this interface, not a concrete verifier, so it can be
  built/tested before the real verifier is compiled.
- `test/mocks/MockVerifier.sol` — test-only stand-in for the real verifier. **Never deploy
  this to a real network** — it doesn't check any cryptography.

`lib/forge-std` is tracked as a git submodule (see root `.gitmodules`), not committed as
plain files — run `git submodule update --init --recursive` from the repo root (or
`forge install` from here) if `lib/` is empty after cloning.

## Usage

```bash
forge test -vv
```

## Once the real EZKL verifier is ready

1. Generate it: `ezkl.create_evm_verifier(...)` (see root README's "Known blocker" section).
2. Deploy the generated `Verifier.sol` (e.g. via `forge create`).
3. Call `LoanApplicationRegistry.registerModel(modelVersionId, verifierAddress)`.

No changes to `LoanApplicationRegistry.sol` itself are needed.

## Note on solc version

Contracts are pinned to `pragma solidity ^0.8.18`. On a machine with normal internet
access, `forge test` will auto-download solc 0.8.18 the first time you run it — nothing
else to do.

If you're in a sandboxed environment that can't reach `binaries.soliditylang.org` (this
project's dev environment hit that), work around it like this:

```bash
mkdir -p ~/.solc
curl -sL -o ~/.solc/solc-0.8.18 \
  https://raw.githubusercontent.com/crytic/solc/master/linux/amd64/solc-linux-amd64-v0.8.18+commit.87f61d96
chmod +x ~/.solc/solc-0.8.18
```

Then add `solc = "~/.solc/solc-0.8.18"` (use the absolute path, Foundry doesn't expand `~`)
under `[profile.default]` in `foundry.toml`.
