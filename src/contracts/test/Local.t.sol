// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {KISS} from "kiss/KISS.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {IKrMulticall} from "periphery/KrMulticall.sol";
import {IKresko} from "periphery/IKresko.sol";
import {ArbitrumSepolia} from "scripts/deploy/run/ArbitrumSepolia.s.sol";
import {IDataV1} from "../core/periphery/IDataV1.sol";

string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8,XAU:1981.68:8,WTI:77.5:8";

contract NewTest is ArbitrumSepolia, Test {
    using Log for *;

    address internal addr;
    uint256 internal value;
    bytes internal redstoneCallData;
    IKrMulticall internal multicall;
    IDataV1 internal dataV1;
    IERC20 usdc;
    IERC20 dai;

    function setUp() public {
        vm.createSelectFork("arbitrumSepolia");
        addr = address(0x123);
        value = 1;
        redstoneCallData = getRedstonePayload(rsPrices);
        super.run();
        usdc = IERC20(getDeployed(".USDC"));
        dai = IERC20(getDeployed(".DAI"));
        kresko = IKresko(getDeployed(".Kresko"));
        kiss = KISS(getDeployed(".KISS"));
        vkiss = IVault(getDeployed(".Vault"));
        multicall = IKrMulticall(payable(getDeployed(".Multicall")));
    }

    function testStuff() public {
        usdc.balanceOf(getAddr(0)).clg("usdc-bal-before");
    }

    function testArbitrumUniswapV3MulticallX() public {
        prank(getAddr(0));

        // multicall = new KrMulticall(address(kresko), address(kiss), address(Addr.V3_Router02));

        __current_kresko = address(kresko);

        usdc.balanceOf(getAddr(0)).clg("usdc-bal-before");
        dai.balanceOf(getAddr(0)).clg("dai-bal-before");

        dai.approve(address(multicall), 1000e18);
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: address(dai),
                amountIn: 1000e18,
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: address(usdc),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: bytes.concat(bytes20(address(dai)), bytes3(uint24(100)), bytes20(address(usdc))),
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: address(usdc),
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: address(dai),
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: bytes.concat(bytes20(address(usdc)), bytes3(uint24(100)), bytes20(address(dai))),
                index: 0
            })
        });

        multicall.execute(ops, redstoneCallData);

        usdc.balanceOf(getAddr(0)).clg("usdc-bal-after");
        dai.balanceOf(getAddr(0)).clg("usdt-bal-after");
    }

    // function testArbitrumUniswapV3MulticallToDeposit() public {
    //     prank(getAddr(0));

    //     kresko = IKresko(getDeployed(".Kresko"));
    //     kiss = KISS(getDeployed(".KISS"));
    //     vault = IVault(getDeployed(".Vault"));
    //     multicall = new KrMulticall(address(kresko), address(kiss), address(Addr.V3_Router02));

    //     __current_kresko = address(kresko);

    //     Tokens.WETH.balanceOf(getAddr(0)).clg("weth-bal-before");
    //     Tokens.USDC.balanceOf(getAddr(0)).clg("usdc-bal-before");
    //     bytes.concat(bytes20(Addr.WETH), bytes3(uint24(500)), bytes20(Addr.USDC)).blg("path");

    //     Tokens.WETH.approve(address(multicall), 1 ether);
    //     KrMulticall.Operation[] memory ops = new KrMulticall.Operation[](3);
    //     ops[0] = KrMulticall.Operation({
    //         action: KrMulticall.Action.AMMExactInput,
    //         data: KrMulticall.Data({
    //             tokenIn: Addr.WETH,
    //             amountIn: 1 ether,
    //             tokensInMode: KrMulticall.TokensInMode.PullFromSender,
    //             tokenOut: Addr.USDC,
    //             amountOut: 0,
    //             tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
    //             amountOutMin: 0,
    //             path: bytes.concat(bytes20(Addr.WETH), bytes3(uint24(500)), bytes20(Addr.USDC)),
    //             index: 0
    //         })
    //     });
    //     ops[1] = KrMulticall.Operation({
    //         action: KrMulticall.Action.VaultDeposit,
    //         data: KrMulticall.Data({
    //             tokenIn: Addr.USDC,
    //             amountIn: 0,
    //             tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
    //             tokenOut: getDeployed(".KISS"),
    //             amountOut: 0,
    //             tokensOutMode: KrMulticall.TokensOutMode.LeaveInContract,
    //             amountOutMin: 0,
    //             path: "",
    //             index: 0
    //         })
    //     });
    //     ops[2] = KrMulticall.Operation({
    //         action: KrMulticall.Action.SCDPDeposit,
    //         data: KrMulticall.Data({
    //             tokenIn: getDeployed(".KISS"),
    //             amountIn: 0,
    //             tokensInMode: KrMulticall.TokensInMode.UseContractBalance,
    //             tokenOut: address(0),
    //             amountOut: 0,
    //             tokensOutMode: KrMulticall.TokensOutMode.None,
    //             amountOutMin: 0,
    //             path: "",
    //             index: 0
    //         })
    //     });

    //     multicall.execute(ops, redstoneCallData);
    //     Tokens.WETH.balanceOf(getAddr(0)).clg("weth-bal-after");
    //     Tokens.USDC.balanceOf(getAddr(0)).clg("usdc-bal-after");
    //     kresko.getAccountDepositSCDP(getAddr(0), getDeployed(".KISS")).clg("deposits-after");
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
