// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
// solhint-disable var-name-mixedcase
// solhint-disable max-states-count
// solhint-disable no-global-import

import {LocalSetup, ArbitrumSetup} from "./Setup.s.sol";
import {addr} from "kresko-lib/info/Arbitrum.sol";

contract ArbitrumOne is ArbitrumSetup("MNEMONIC_DEVNET") {
    function run() external broadcastWithMnemonic(0) {
        deployCore();
        setupVault();
        setupProtocol();
        setupVaultAssets();

        setupUsers();
    }
}

contract Local is LocalSetup("MNEMONIC_DEVNET") {
    function run() external {
        vm.startPrank(getAddr(0));
        config();
        kresko = deployDiamond(deployArgs);
        proxyFactory = deployProxyFactory(deployArgs.admin);
        mockSeqFeed.setAnswers(0, 0, 0);
        setupSpecialTokens();
        setupProtocol();
        setupVault();
        vm.stopPrank();
    }
}
