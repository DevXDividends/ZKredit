// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {LoanApplicationRegistry} from "../src/LoanApplicationRegistry.sol";
import {Halo2Verifier} from "../src/Verifier.sol";
import {RealProofFixture} from "./fixtures/RealProofFixture.sol";

/// @title RealProofIntegrationTest
/// @notice Unlike LoanApplicationRegistry.t.sol (which uses MockVerifier),
/// this test exercises the REAL EZKL-generated Halo2Verifier with a REAL ZK
/// proof produced by the actual training/generate_proof.py pipeline against
/// the actual trained model. This is the test that proves the whole system
/// — model -> circuit -> proof -> on-chain verification -> registry — works
/// end to end, not just that the plumbing compiles.
contract RealProofIntegrationTest is Test {
    LoanApplicationRegistry registry;
    Halo2Verifier verifier;

    address bank = address(0xB1);
    uint256 constant MODEL_ID = 1;

    function setUp() public {
        registry = new LoanApplicationRegistry();
        verifier = new Halo2Verifier();
    }

    function test_RealVerifierAcceptsRealProof_Directly() public {
        // Sanity check: the raw verifier contract accepts the proof on its own,
        // independent of the registry wrapper.
        bool ok = verifier.verifyProof(RealProofFixture.proof(), RealProofFixture.instances());
        assertTrue(ok, "real proof failed to verify against the real verifier");
    }

    function test_RealVerifierRejectsTamperedProof() public {
        bytes memory tampered = RealProofFixture.proof();
        // Flip a byte in the middle of the proof — should invalidate it.
        tampered[100] = tampered[100] == 0x00 ? bytes1(0x01) : bytes1(0x00);
        vm.expectRevert();
        verifier.verifyProof(tampered, RealProofFixture.instances());
    }

    function test_SubmitRealProof_ThroughRegistry() public {
        registry.registerModel(MODEL_ID, address(verifier));

        bytes32 appId = keccak256("real-proof-integration-test");
        bytes32 appHash = keccak256("customer-commitment-placeholder");

        // Last instance is the circuit's public output, scaled by 4096 (2^12).
        uint256[] memory instances = RealProofFixture.instances();
        uint256 scaledOutput = instances[instances.length - 1];
        uint256 outputDecision = scaledOutput * 2 >= RealProofFixture.outputScale() ? 1 : 0; // >=0.5 -> Approved

        registry.submitProof(appId, MODEL_ID, RealProofFixture.proof(), instances, appHash, outputDecision);

        LoanApplicationRegistry.Application memory app = registry.getApplication(appId);
        assertTrue(app.verified, "application should be marked verified");
        assertEq(app.modelVersionId, MODEL_ID);
        assertEq(app.outputDecision, outputDecision);
        assertEq(app.applicationHash, appHash);

        // With scaledOutput = 162 out of 4096 (~3.96%), this real sample should be Rejected.
        assertEq(outputDecision, 0, "expected this specific real proof to represent a Rejected decision");
    }
}