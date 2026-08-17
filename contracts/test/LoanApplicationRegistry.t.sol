// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {LoanApplicationRegistry} from "../src/LoanApplicationRegistry.sol";
import {MockVerifier} from "./mocks/MockVerifier.sol";

contract LoanApplicationRegistryTest is Test {
    // Re-declared locally: solc 0.8.18 doesn't support qualified `emit Contract.Event(...)`
    // syntax (needs 0.8.22+). vm.expectEmit matches by signature, so this works fine.
    event ApplicationVerified(
        bytes32 indexed applicationId,
        address indexed bank,
        uint256 indexed modelVersionId,
        uint256 outputDecision,
        bytes32 applicationHash
    );

    LoanApplicationRegistry registry;
    MockVerifier verifierOk;
    MockVerifier verifierBad;

    address bank = address(0xB1);
    uint256 modelId = 1;

    function setUp() public {
        registry = new LoanApplicationRegistry();
        verifierOk = new MockVerifier(true);
        verifierBad = new MockVerifier(false);
    }

    function test_RegisterModel() public {
        vm.prank(bank);
        registry.registerModel(modelId, address(verifierOk));

        assertEq(registry.modelVerifiers(modelId), address(verifierOk));
        assertEq(registry.modelOwner(modelId), bank);
    }

    function test_RevertWhen_RegisterSameModelTwice() public {
        vm.prank(bank);
        registry.registerModel(modelId, address(verifierOk));

        vm.prank(bank);
        vm.expectRevert(LoanApplicationRegistry.ModelAlreadyRegistered.selector);
        registry.registerModel(modelId, address(verifierOk));
    }

    function test_SubmitProof_Success() public {
        vm.prank(bank);
        registry.registerModel(modelId, address(verifierOk));

        bytes32 appId = keccak256("application-1");
        bytes32 appHash = keccak256("customer-data-commitment-1");
        uint256[] memory instances = new uint256[](1);
        instances[0] = 1; // Approved

        vm.prank(bank);
        registry.submitProof(appId, modelId, hex"1234", instances, appHash, 1);

        LoanApplicationRegistry.Application memory app = registry.getApplication(appId);
        assertEq(app.bank, bank);
        assertEq(app.outputDecision, 1);
        assertEq(app.modelVersionId, modelId);
        assertTrue(app.verified);
        assertEq(registry.totalApplications(), 1);
    }

    function test_RevertWhen_ProofInvalid() public {
        vm.prank(bank);
        registry.registerModel(modelId, address(verifierBad));

        bytes32 appId = keccak256("application-2");
        uint256[] memory instances = new uint256[](1);
        instances[0] = 0;

        vm.prank(bank);
        vm.expectRevert(LoanApplicationRegistry.ProofVerificationFailed.selector);
        registry.submitProof(appId, modelId, hex"1234", instances, keccak256("x"), 0);
    }

    function test_RevertWhen_VerifierNotRegistered() public {
        bytes32 appId = keccak256("application-3");
        uint256[] memory instances = new uint256[](1);
        instances[0] = 1;

        vm.expectRevert(LoanApplicationRegistry.VerifierNotRegistered.selector);
        registry.submitProof(appId, 999, hex"1234", instances, keccak256("x"), 1);
    }

    function test_RevertWhen_DuplicateApplication() public {
        vm.prank(bank);
        registry.registerModel(modelId, address(verifierOk));

        bytes32 appId = keccak256("application-4");
        uint256[] memory instances = new uint256[](1);
        instances[0] = 1;

        vm.prank(bank);
        registry.submitProof(appId, modelId, hex"1234", instances, keccak256("x"), 1);

        vm.prank(bank);
        vm.expectRevert(LoanApplicationRegistry.ApplicationAlreadyExists.selector);
        registry.submitProof(appId, modelId, hex"1234", instances, keccak256("x"), 1);
    }

    function test_EmitsApplicationVerifiedEvent() public {
        vm.prank(bank);
        registry.registerModel(modelId, address(verifierOk));

        bytes32 appId = keccak256("application-5");
        bytes32 appHash = keccak256("x");
        uint256[] memory instances = new uint256[](1);
        instances[0] = 1;

        vm.expectEmit(true, true, true, true);
        emit ApplicationVerified(appId, bank, modelId, 1, appHash);

        vm.prank(bank);
        registry.submitProof(appId, modelId, hex"1234", instances, appHash, 1);
    }
}