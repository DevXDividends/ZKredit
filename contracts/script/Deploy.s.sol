// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script, console} from "forge-std/Script.sol";
import {Halo2Verifier} from "../src/Verifier.sol";
import {LoanApplicationRegistry} from "../src/LoanApplicationRegistry.sol";

/// Deploys the EZKL verifier + registry and registers the verifier as model #1.
/// Local usage (Anvil), from the contracts/ folder:
///   forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
///     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
/// (that key is Anvil's PUBLIC test key; never use it on a real network)
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        Halo2Verifier verifier = new Halo2Verifier();
        LoanApplicationRegistry registry = new LoanApplicationRegistry();
        registry.registerModel(1, address(verifier));

        vm.stopBroadcast();

        console.log("Halo2Verifier            :", address(verifier));
        console.log("LoanApplicationRegistry  :", address(registry));
        console.log("Model #1 registered. Put the registry address in backend .env as REGISTRY_ADDRESS");
    }
}
