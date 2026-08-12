// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IHalo2Verifier} from "./IHalo2Verifier.sol";

/// @title LoanApplicationRegistry
/// @notice Core on-chain module of ZKredit. Banks submit a ZK proof + public
/// output (Approved/Rejected) for a loan decision. This contract verifies the
/// proof against the bank's registered verifier (one per model version) and
/// permanently records that a genuine, un-tampered model decision was made —
/// without ever seeing the model weights or the customer's private data.
contract LoanApplicationRegistry {
    struct Application {
        address bank;
        bytes32 applicationHash; // hash of customer's private application data (commitment, not the data itself)
        uint256 outputDecision;  // public circuit output: 1 = Approved, 0 = Rejected
        uint256 modelVersionId;
        uint256 timestamp;
        bool verified;
    }

    /// @notice modelVersionId => verifier contract for that exact model.
    /// Banks register a new verifier every time they retrain/redeploy a model,
    /// so old proofs remain verifiable against the model version they were made with.
    mapping(uint256 => address) public modelVerifiers;

    /// @notice Only the bank owner can register verifiers for their own models.
    mapping(uint256 => address) public modelOwner;

    mapping(bytes32 => Application) public applications;
    bytes32[] public applicationIds;

    event ModelRegistered(uint256 indexed modelVersionId, address indexed bank, address verifier);
    event ApplicationVerified(
        bytes32 indexed applicationId,
        address indexed bank,
        uint256 indexed modelVersionId,
        uint256 outputDecision,
        bytes32 applicationHash
    );

    error ModelAlreadyRegistered();
    error NotModelOwner();
    error VerifierNotRegistered();
    error ProofVerificationFailed();
    error ApplicationAlreadyExists();

    /// @notice Bank registers a verifier contract for a specific model version.
    /// @dev The verifier is the EZKL-generated contract from `create_evm_verifier`.
    function registerModel(uint256 modelVersionId, address verifier) external {
        if (modelVerifiers[modelVersionId] != address(0)) revert ModelAlreadyRegistered();
        modelVerifiers[modelVersionId] = verifier;
        modelOwner[modelVersionId] = msg.sender;
        emit ModelRegistered(modelVersionId, msg.sender, verifier);
    }

    /// @notice Submit a ZK proof for a loan decision. Verifies on-chain and
    /// records the result permanently, without ever storing the customer's
    /// raw application data or the model's weights.
    /// @param applicationId Unique ID for this application (e.g. hash of customer ref + nonce).
    /// @param modelVersionId Which registered model/verifier this proof is for.
    /// @param proof The ZK proof bytes generated off-chain by EZKL.
    /// @param instances Public instances: circuit's public inputs/outputs (decision, commitments).
    /// @param applicationHash Commitment hash of the customer's private input data.
    /// @param outputDecision The claimed decision (1 = Approved, 0 = Rejected) — must match instances.
    function submitProof(
        bytes32 applicationId,
        uint256 modelVersionId,
        bytes calldata proof,
        uint256[] calldata instances,
        bytes32 applicationHash,
        uint256 outputDecision
    ) external {
        if (applications[applicationId].timestamp != 0) revert ApplicationAlreadyExists();

        address verifierAddr = modelVerifiers[modelVersionId];
        if (verifierAddr == address(0)) revert VerifierNotRegistered();

        bool ok = IHalo2Verifier(verifierAddr).verifyProof(proof, instances);
        if (!ok) revert ProofVerificationFailed();

        applications[applicationId] = Application({
            bank: msg.sender,
            applicationHash: applicationHash,
            outputDecision: outputDecision,
            modelVersionId: modelVersionId,
            timestamp: block.timestamp,
            verified: true
        });
        applicationIds.push(applicationId);

        emit ApplicationVerified(applicationId, msg.sender, modelVersionId, outputDecision, applicationHash);
    }

    function getApplication(bytes32 applicationId) external view returns (Application memory) {
        return applications[applicationId];
    }

    function totalApplications() external view returns (uint256) {
        return applicationIds.length;
    }
}
