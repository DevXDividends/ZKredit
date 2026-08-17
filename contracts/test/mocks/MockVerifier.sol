// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IHalo2Verifier} from "../../src/IHalo2Verifier.sol";

/// @title MockVerifier
/// @notice Test-only stand-in for the real EZKL-generated Halo2 verifier.
/// Lets us test LoanApplicationRegistry's logic (registration, storage,
/// event emission, error paths) before the real proving pipeline is unblocked.
/// NEVER deploy this to a real network — it does not actually check cryptography.
contract MockVerifier is IHalo2Verifier {
    bool public shouldVerify;

    constructor(bool _shouldVerify) {
        shouldVerify = _shouldVerify;
    }

    function setShouldVerify(bool _shouldVerify) external {
        shouldVerify = _shouldVerify;
    }

    function verifyProof(bytes calldata, uint256[] calldata) external view override returns (bool) {
        return shouldVerify;
    }
}