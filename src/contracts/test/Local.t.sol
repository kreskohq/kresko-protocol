// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {TestBase} from "kresko-lib/utils/TestBase.t.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {KISS} from "kiss/KISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {KrMulticall} from "periphery/KrMulticall.sol";
import {RedstoneScript} from "kresko-lib/utils/Redstone.sol";
import {IKresko} from "periphery/IKresko.sol";
import {Role} from "common/Constants.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Addr, Tokens} from "kresko-lib/info/Arbitrum.sol";
import {DataV1} from "periphery/DataV1.sol";
import {PType} from "periphery/PTypes.sol";
import {GatingManager} from "periphery/GatingManager.sol";
import {IDataV1} from "periphery/IDataV1.sol";

string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8,XAU:1981.68:8,WTI:77.5:8";

contract NewTest is TestBase("MNEMONIC_DEVNET"), RedstoneScript("./utils/getRedstonePayload.js") {
    address internal addr;
    uint256 internal value;
    using Log for *;
    bytes internal redstoneCallData;
    KrMulticall internal multicall;
    DataV1 internal dataV1;
    KISS kiss;
    IVault vault;
    IERC20 usdc;
    IKresko kresko;

    function setUp() public fork("localhost") {
        addr = address(0x123);
        value = 1;
        redstoneCallData = getRedstonePayload(rsPrices);
    }

    function testLocalnet() public {
        prank(getAddr(0));
        multicall = new KrMulticall(address(kresko), address(kiss), address(vault));
        kresko.grantRole(Role.MANAGER, address(multicall));
        kiss = KISS(0x43e53A48Ee932BbB1D09180a2bF02bBe70020449);
        vault = IVault(0x6a35d47B9139C6390bE8487836E54AB56eB4135B);
        usdc = IERC20(0xF5A0D69303a45D71c96d8414e3591393e393C64A);
        kresko = IKresko(0x0885bfab3E1BbD423494FA9492962a67154b0c8C);

        prank(getAddr(0));
        KrMulticall.Operation[] memory opsWithdraw = new KrMulticall.Operation[](2);
        IERC20(0x63A177DB01AE8DA5f5D60b0E0b2898bBA42Ed9f7).approve(address(multicall), 100000000000000000);
        opsWithdraw[0] = KrMulticall.Operation({
            action: KrMulticall.Action.SynthWrap,
            data: KrMulticall.Data({
                tokenIn: 0x63A177DB01AE8DA5f5D60b0E0b2898bBA42Ed9f7,
                amountIn: 10000000000000000,
                tokensInMode: KrMulticall.TokensInMode.PullFromSender,
                tokenOut: 0xE867a0A27bd72053941fF5D863Cfd476Fc8Fd9c1,
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        opsWithdraw[1] = KrMulticall.Operation({
            action: KrMulticall.Action.SCDPTrade,
            data: KrMulticall.Data({
                tokenIn: 0xE867a0A27bd72053941fF5D863Cfd476Fc8Fd9c1,
                amountIn: 0,
                tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
                tokenOut: 0x9300166288bde15D3FC4803240E7D003CF35F598,
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        KrMulticall.Result[] memory results = multicall.execute(opsWithdraw, redstoneCallData);

        for (uint256 i; i < results.length; i++) {
            results[i].tokenIn.clg("res-tokenIn");
            results[i].amountIn.clg("res-amountIn");
            results[i].tokenOut.clg("res-tokenOut");
            results[i].amountOut.clg("res-amountOut");
        }
        usdc.balanceOf(getAddr(0)).clg("usdc-bal-after");
    }

    function testPeripheryData() public {
        IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8)
            .allowance(getAddr(0), 0x23ab08d87BBAe90e8BDe56F87ad6e53683E08279)
            .clg("allowance");
        // kresko = IKresko(getDeployed(".Kresko"));
        // kiss = KISS(getDeployed(".KISS"));
        // vault = IVault(getDeployed(".Vault"));
        // __current_kresko = address(kresko);

        // address gatingManager = IKresko(getDeployed(".Kresko")).getGatingManager();
        // gatingManager.clg("gatingManager");

        // dataV1 = DataV1(getDeployed(".DataV1"));

        // uint8 phase = GatingManager(gatingManager).phase();
        // address kreskian = address(GatingManager(gatingManager).kreskian());
        // address questForKresk = address(GatingManager(gatingManager).questForKresk());

        // phase.clg("phase");
        // kreskian.clg("kreskian");
        // questForKresk.clg("questForKresk");

        // DataV1.DVault memory vaultData = dataV1.getVault();
        // redstoneCallData.blg("rs-calldata");

        // address user = getAddr(0);
        // prank(user);
        // // call(kresko.mintKreskoAsset.selector, user, getDeployed(".krBTC"), 0.05 ether, user, rsPrices);
        // // call(kresko.mintKreskoAsset.selector, user, getDeployed(".krEUR"), 50 ether, user, rsPrices);
        // // call(kresko.mintKreskoAsset.selector, user, getDeployed(".krXAU"), 0.2 ether, user, rsPrices);
        // // call(kresko.mintKreskoAsset.selector, user, getDeployed(".krWTI"), 1 ether, user, rsPrices);
        // // call(kresko.mintKreskoAsset.selector, user, getDeployed(".krJPY"), 10000 ether, user, rsPrices);
        // // call(kresko.mintKreskoAsset.selector, user, getDeployed(".krETH"), 0.2 ether, user, rsPrices);
        // PType.Protocol memory protocol = dataV1.getGlobals(redstoneCallData).protocol;
        // DataV1.DAccount memory account = dataV1.getAccount(user, redstoneCallData);
        // account.phase.clg("phase");
        // account.eligible.clg("eephase");
    }

    function testArbitrumUniswapV3MulticallX() public {
        prank(getAddr(0));

        kresko = IKresko(getDeployed(".Kresko"));
        kiss = KISS(getDeployed(".KISS"));
        vault = IVault(getDeployed(".Vault"));
        multicall = new KrMulticall(address(kresko), address(kiss), address(Addr.V3_Router02));

        __current_kresko = address(kresko);

        Tokens.USDCe.balanceOf(getAddr(0)).clg("usdc-bal-before");
        Tokens.USDT.balanceOf(getAddr(0)).clg("usdt-bal-before");

        Tokens.USDT.approve(address(multicall), 1000e6);
        KrMulticall.Operation[] memory ops = new KrMulticall.Operation[](2);
        ops[0] = KrMulticall.Operation({
            action: KrMulticall.Action.AMMExactInput,
            data: KrMulticall.Data({
                tokenIn: Addr.USDT,
                amountIn: 1000e6,
                tokensInMode: KrMulticall.TokensInMode.PullFromSender,
                tokenOut: Addr.USDCe,
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: bytes.concat(bytes20(Addr.USDT), bytes3(uint24(100)), bytes20(Addr.USDCe)),
                index: 0
            })
        });
        ops[1] = KrMulticall.Operation({
            action: KrMulticall.Action.AMMExactInput,
            data: KrMulticall.Data({
                tokenIn: Addr.USDCe,
                amountIn: 0,
                tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
                tokenOut: Addr.USDT,
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: bytes.concat(bytes20(Addr.USDCe), bytes3(uint24(100)), bytes20(Addr.USDT)),
                index: 0
            })
        });

        multicall.execute(ops, redstoneCallData);

        Tokens.USDCe.balanceOf(getAddr(0)).clg("usdc-bal-after");
        Tokens.USDT.balanceOf(getAddr(0)).clg("usdt-bal-after");
    }

    function testArbitrumUniswapV3MulticallToDeposit() public {
        prank(getAddr(0));

        kresko = IKresko(getDeployed(".Kresko"));
        kiss = KISS(getDeployed(".KISS"));
        vault = IVault(getDeployed(".Vault"));
        multicall = new KrMulticall(address(kresko), address(kiss), address(Addr.V3_Router02));

        __current_kresko = address(kresko);

        Tokens.WETH.balanceOf(getAddr(0)).clg("weth-bal-before");
        Tokens.USDC.balanceOf(getAddr(0)).clg("usdc-bal-before");
        bytes.concat(bytes20(Addr.WETH), bytes3(uint24(500)), bytes20(Addr.USDC)).blg("path");

        Tokens.WETH.approve(address(multicall), 1 ether);
        KrMulticall.Operation[] memory ops = new KrMulticall.Operation[](3);
        ops[0] = KrMulticall.Operation({
            action: KrMulticall.Action.AMMExactInput,
            data: KrMulticall.Data({
                tokenIn: Addr.WETH,
                amountIn: 1 ether,
                tokensInMode: KrMulticall.TokensInMode.PullFromSender,
                tokenOut: Addr.USDC,
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: bytes.concat(bytes20(Addr.WETH), bytes3(uint24(500)), bytes20(Addr.USDC)),
                index: 0
            })
        });
        ops[1] = KrMulticall.Operation({
            action: KrMulticall.Action.VaultDeposit,
            data: KrMulticall.Data({
                tokenIn: Addr.USDC,
                amountIn: 0,
                tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
                tokenOut: getDeployed(".KISS"),
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[2] = KrMulticall.Operation({
            action: KrMulticall.Action.SCDPDeposit,
            data: KrMulticall.Data({
                tokenIn: getDeployed(".KISS"),
                amountIn: 0,
                tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(0),
                amountOut: 0,
                tokensOutMode: KrMulticall.TokensOutMode.None,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        multicall.execute(ops, redstoneCallData);
        Tokens.WETH.balanceOf(getAddr(0)).clg("weth-bal-after");
        Tokens.USDC.balanceOf(getAddr(0)).clg("usdc-bal-after");
        kresko.getAccountDepositSCDP(getAddr(0), getDeployed(".KISS")).clg("deposits-after");
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum.json"));
        return vm.parseJsonAddress(json, key);
    }
}

// {
//       "action": 9,
//       "data": {
//         "tokenIn": "0x63A177DB01AE8DA5f5D60b0E0b2898bBA42Ed9f7",
//         "amountIn": "12000000000000000000",
//         "tokensInMode": 1,
//         "tokenOut": "0x43e53A48Ee932BbB1D09180a2bF02bBe70020449",
//         "amountOut": "0",
//         "tokensOutMode": 2,
//         "index": "0",
//         "path": "0x",
//         "amountOutMin": "0",
//         "deadline": "0"
//       }
//     },
//     {
//       "action": 5,
//       "data": {
//         "tokenIn": "0x43e53A48Ee932BbB1D09180a2bF02bBe70020449",
//         "amountIn": "0",
//         "tokensInMode": 2,
//         "tokenOut": "0x43e53A48Ee932BbB1D09180a2bF02bBe70020449",
//         "amountOut": "0",
//         "tokensOutMode": 1,
//         "index": "0",
//         "path": "0x",
//         "amountOutMin": "0",
//         "deadline": "0"
//       }
//     }
