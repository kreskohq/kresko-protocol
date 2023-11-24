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

string constant rsPrices = "ETH:1911:8,BTC:35159.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8;XAU:1977.68:8;WTI:77.5:8";

contract NewTest is TestBase("MNEMONIC_DEVNET"), RedstoneScript("./utils/getRedstonePayload.js") {
    address internal addr;
    uint256 internal value;
    using Log for *;
    bytes internal redstoneCallData;
    KrMulticall internal multicall;
    KISS kiss;
    IVault vault;
    IERC20 usdc;
    IKresko kresko;

    function setUp() public fork("localhost") {
        addr = address(0x123);
        value = 1;
        redstoneCallData = getRedstonePayload(rsPrices);
        kiss = KISS(0x43e53A48Ee932BbB1D09180a2bF02bBe70020449);
        vault = IVault(0x6a35d47B9139C6390bE8487836E54AB56eB4135B);
        usdc = IERC20(0xF5A0D69303a45D71c96d8414e3591393e393C64A);
        kresko = IKresko(0x0885bfab3E1BbD423494FA9492962a67154b0c8C);
        prank(getAddr(0));

        multicall = new KrMulticall(address(kresko), address(kiss), address(vault));
        kresko.grantRole(Role.MANAGER, address(multicall));
    }

    // function testLocalnet() public {
    //     prank(getAddr(0));
    //     KrMulticall.Operation[] memory opsWithdraw = new KrMulticall.Operation[](2);
    //     IERC20(0x63A177DB01AE8DA5f5D60b0E0b2898bBA42Ed9f7).approve(address(multicall), 100000000000000000);
    //     opsWithdraw[0] = KrMulticall.Operation({
    //         action: KrMulticall.Action.SynthWrap,
    //         data: KrMulticall.Data({
    //             tokenIn: 0x63A177DB01AE8DA5f5D60b0E0b2898bBA42Ed9f7,
    //             amountIn: 100000000000000000,
    //             tokensInMode: KrMulticall.TokensInMode.PullFromSender,
    //             tokenOut: 0xE867a0A27bd72053941fF5D863Cfd476Fc8Fd9c1,
    //             amountOut: 0,
    //             tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
    //             amountOutMin: 0,
    //             deadline: 0,
    //             path: "",
    //             index: 0
    //         })
    //     });
    //     opsWithdraw[1] = KrMulticall.Operation({
    //         action: KrMulticall.Action.SCDPTrade,
    //         data: KrMulticall.Data({
    //             tokenIn: 0xE867a0A27bd72053941fF5D863Cfd476Fc8Fd9c1,
    //             amountIn: 0,
    //             tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
    //             tokenOut: 0x43e53A48Ee932BbB1D09180a2bF02bBe70020449,
    //             amountOut: 0,
    //             tokensOutMode: KrMulticall.TokensOutMode.ReturnToSender,
    //             amountOutMin: 0,
    //             deadline: 0,
    //             path: "",
    //             index: 0
    //         })
    //     });

    //     KrMulticall.Result[] memory results = multicall.execute(opsWithdraw, redstoneCallData);

    //     for (uint256 i; i < results.length; i++) {
    //         results[i].tokenIn.clg("res-tokenIn");
    //         results[i].amountIn.clg("res-amountIn");
    //         results[i].tokenOut.clg("res-tokenOut");
    //         results[i].amountOut.clg("res-amountOut");
    //     }
    //     usdc.balanceOf(getAddr(0)).clg("usdc-bal-after");
    //     // vault.maxRedeem(address(usdc), getAddr(0)).dlg("max-redeem", 18);
    //     // (uint256 preview, uint256 fees) = vault.previewRedeem(address(usdc), 1 ether);
    //     // preview.dlg("preview", 18);
    //     // assertEq(value, 1, "val-not-eq");
    //     // assertEq(addr, address(0x123), "addr-not-eq");
    // }
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
