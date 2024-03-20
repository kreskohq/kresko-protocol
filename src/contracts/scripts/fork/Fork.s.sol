// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable state-visibility, quotes

import {PLog} from "kresko-lib/utils/PLog.s.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";

contract ArbFork is ArbScript {
    using Deployed for string;
    using PLog for *;

    struct Balance {
        uint32 user;
        address asset;
        uint256 amount;
        address assetsFrom;
    }
    address sender;

    function updatePrices() public mnemonic("MNEMONIC_DEVNET") {
        sender = getAddr(0);
        initFork(sender);
    }

    function check() public fork("localhost") {
        block.timestamp.clg("timestamp");
        IPyth.Price memory pythPrice = pythEP.getPriceUnsafe(
            0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a
        );
        pythPrice.price.clg("pythPrice.price");
        pythPrice.timestamp.clg("pythPrice.timestamp");
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = IAggregatorV3(
            0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3
        ).latestRoundData();

        updatedAt.clg("updatedAt");
        answer.clg("clPrice");
    }

    function withDefaultBalances(string memory mnemonicEnv) public mnemonic(mnemonicEnv) {
        sender = getAddr(0);
        initFork(sender);
        broadcastWith(safe);

        manager.whitelist(getAddr(0), true);
        manager.whitelist(getAddr(1), true);
        manager.whitelist(getAddr(2), true);

        broadcastWith(binance);
        payable(wethHolder).transfer(1e18);

        high(0);
        low(1);
        high(2);
        low(3);
        high(4);
    }

    function high(uint32 idx) internal {
        Balance[] memory balances = new Balance[](5);
        balances[0] = Balance({user: idx, asset: USDCAddr, amount: 100_000e6, assetsFrom: binance});
        balances[1] = Balance({user: idx, asset: USDCeAddr, amount: 100_000e6, assetsFrom: binance});
        balances[2] = Balance({user: idx, asset: wethAddr, amount: 50e18, assetsFrom: wethHolder});
        balances[3] = Balance({user: idx, asset: DAIAddr, amount: 100_000e18, assetsFrom: binance});
        balances[4] = Balance({user: idx, asset: WBTCAddr, amount: 5e8, assetsFrom: wbtcholder});

        for (uint256 i = 0; i < balances.length; i++) {
            setupBalance(balances[i]);
        }
    }

    function low(uint32 idx) internal {
        Balance[] memory balances = new Balance[](5);
        balances[0] = Balance({user: idx, asset: USDCAddr, amount: 100e6, assetsFrom: binance});
        balances[1] = Balance({user: idx, asset: USDCeAddr, amount: 200e6, assetsFrom: binance});
        balances[2] = Balance({user: idx, asset: wethAddr, amount: 0.025e18, assetsFrom: wethHolder});
        balances[3] = Balance({user: idx, asset: DAIAddr, amount: 184.44e18, assetsFrom: binance});
        balances[4] = Balance({user: idx, asset: WBTCAddr, amount: 0.0015e8, assetsFrom: wbtcholder});

        for (uint256 i = 0; i < balances.length; i++) {
            setupBalance(balances[i]);
        }
    }

    function setupBalance(Balance memory bal) internal {
        _transfer(bal.assetsFrom, getAddr(uint32(bal.user)), bal.asset, bal.amount);
    }

    function _transfer(address from, address to, address token, uint256 amount) internal broadcasted(from) {
        token.clg("TokenAddress");
        IERC20(token).transfer(to, amount);
    }

    function _maybeApprove(address token, address spender, uint256 amount) internal {
        if (IERC20(token).allowance(peekSender(), spender) < amount) {
            IERC20(token).approve(spender, type(uint256).max);
        }
    }

    bytes[] exampleUpdate;
}

address constant binance = 0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D;
address constant wethHolder = 0xC3E5607Cd4ca0D5Fe51e09B60Ed97a0Ae6F874dd;
address constant wbtcholder = 0x4bb7f4c3d47C4b431cb0658F44287d52006fb506;
