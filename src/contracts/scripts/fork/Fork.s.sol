// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable state-visibility, quotes

import {Scripted} from "kresko-lib/utils/Scripted.s.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import "scripts/deploy/JSON.s.sol" as JSON;

import {PLog} from "kresko-lib/utils/PLog.s.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IGatingManager} from "periphery/IGatingManager.sol";

contract ArbFork is Scripted {
    using Deployed for string;
    using PLog for *;

    IVault vault = IVault(0x2dF01c1e472eaF880e3520C456b9078A5658b04c);
    IGatingManager gating = IGatingManager(0x00000000685B935476005E6A7ed5E1Bf3C000B12);
    address kresko = 0x0000000000177abD99485DCaea3eFaa91db3fe72;

    IWETH9 nativew = IWETH9(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
    address USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address USDCe = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address krETH = 0x24dDC92AA342e92f26b4A676568D04d2E3Ea0abc;
    address KISS = 0x6A1D6D2f4aF6915e6bBa8F2db46F442d18dB5C9b;

    function withDefaultBalances(string memory mnemonicEnv) external {
        vm.rpc("anvil_setChainId", "[42161]");
        useMnemonic(mnemonicEnv);
        broadcastWith(0x266489Bde85ff0dfe1ebF9f0a7e6Fed3a973cEc3);

        gating.whitelist(getAddr(0), true);
        gating.whitelist(getAddr(1), true);
        gating.whitelist(getAddr(2), true);

        high(0);
        low(1);
        high(2);
        low(3);
        high(4);
        vm.rpc("anvil_setChainId", "[41337]");
    }

    function high(uint32 idx) internal {
        JSON.Balance[] memory balances = new JSON.Balance[](5);
        balances[0] = JSON.Balance({user: idx, symbol: "USDC", amount: 100_000e6, assetsFrom: binance});
        balances[1] = JSON.Balance({user: idx, symbol: "USDC.e", amount: 100_000e6, assetsFrom: binance});
        balances[2] = JSON.Balance({user: idx, symbol: "WETH", amount: 50e18, assetsFrom: balancer});
        balances[3] = JSON.Balance({user: idx, symbol: "DAI", amount: 100_000e18, assetsFrom: binance});
        balances[4] = JSON.Balance({user: idx, symbol: "WBTC", amount: 5e8, assetsFrom: wbtcholder});

        for (uint256 i = 0; i < balances.length; i++) {
            setupBalance(balances[i]);
        }
    }

    function low(uint32 idx) internal {
        JSON.Balance[] memory balances = new JSON.Balance[](5);
        balances[0] = JSON.Balance({user: idx, symbol: "USDC", amount: 100e6, assetsFrom: binance});
        balances[1] = JSON.Balance({user: idx, symbol: "USDC.e", amount: 200e6, assetsFrom: binance});
        balances[2] = JSON.Balance({user: idx, symbol: "WETH", amount: 0.025e18, assetsFrom: balancer});
        balances[3] = JSON.Balance({user: idx, symbol: "DAI", amount: 184.44e18, assetsFrom: binance});
        balances[4] = JSON.Balance({user: idx, symbol: "WBTC", amount: 0.0015e8, assetsFrom: wbtcholder});

        for (uint256 i = 0; i < balances.length; i++) {
            setupBalance(balances[i]);
        }
    }

    function setupBalance(JSON.Balance memory bal) internal {
        _transfer(bal.assetsFrom, getAddr(uint32(bal.user)), bal.symbol.addr(), bal.amount);
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
}

address constant binance = 0xB38e8c17e38363aF6EbdCb3dAE12e0243582891D;
address constant balancer = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
address constant wbtcholder = 0x4bb7f4c3d47C4b431cb0658F44287d52006fb506;
