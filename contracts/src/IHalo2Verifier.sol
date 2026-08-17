// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @title IHalo2Verifier
/// @notice Interface matching EZKL's auto-generated Halo2 verifier contract.
/// EZKL's `create_evm_verifier` produces a contract with this exact function
/// signature. We depend on the interface, not the generated contract, so the
/// registry below can be written/tested before the real verifier is compiled
/// (which requires the KZG SRS trusted setup file).
interface IHalo2Verifier {
    /// @param proof The serialized zero-knowledge proof bytes.
    /// @param instances The public inputs/outputs of the circuit
    ///        (for ZKredit: the model's public output — Approved/Rejected —
    ///        and any public commitment to the input, depending on how
    ///        input_visibility/output_visibility were set in settings.json).
    /// @return True if the proof is valid for the given public instances.
    /// @dev NOT `view`: EZKL's generated Halo2 verifier is declared `nonpayable`
    /// in its ABI (its assembly implementation isn't staticcall-safe), so the
    /// interface must match that exactly or Solidity will refuse to treat the
    /// generated contract as implementing this interface.
    function verifyProof(bytes calldata proof, uint256[] calldata instances) external returns (bool);
}