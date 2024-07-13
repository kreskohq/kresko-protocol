// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/s/Tested.t.sol";
import {Log} from "kresko-lib/utils/s/LibVm.s.sol";
import {ShortAssert} from "kresko-lib/utils/s/ShortAssert.t.sol";
import {IKrMulticall, KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MulticallUpdate is Tested, ArbScript {
    using Log for *;
    using ShortAssert for *;

    function setUp() public {
        ArbScript.initialize(231869463);
        useMnemonic("MNEMONIC_DEPLOY");

        sender = vm.createWallet("sender").addr;
        deal(sender, 100 ether);
        deal(usdcAddr, sender, 100e6);
        deal(wbtcAddr, sender, 1e8);

        prank(sender);
        multicall = KrMulticall(payable(0xFFc08195d17c16a0585f2DA72210e1059f60C306));

        USDC.approve(address(multicall), type(uint256).max);
        krETH.approve(address(multicall), type(uint256).max);
        WBTC.approve(krBTCAddr, type(uint256).max);
        krBTC.approve(address(multicall), type(uint256).max);
        WBTC.approve(address(multicall), type(uint256).max);
        approvals();

        prank(safe);
        updatePyth();
        kresko.grantRole(Role.MANAGER, address(multicall));
    }

    function testSynthwrapsNative() public pranked(sender) {
        uint256 amount = 1 ether;

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthwrapNative,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: uint96(amount),
                tokensInMode: IKrMulticall.TokensInMode.Native,
                tokenOut: krETHAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSenderNative,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        exec(amount, ops);
        sender.balance.lt(100 ether, "krETH-bal-1");
        sender.balance.gt(99.9 ether, "krETH-bal-2");
    }

    function testSynthunwrapsNative() public pranked(sender) {
        uint256 amount = 1 ether;

        (bool s, ) = krETHAddr.call{value: amount}("");
        s.eq(true, "wrap-in");

        amount = krETH.balanceOf(sender);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: uint96(amount),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthwrapNative,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceNative,
                tokenOut: krETHAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        exec(0, ops);
        krETH.balanceOf(sender).gt(0.95 ether, "krETH-bal");
        krETH.balanceOf(sender).lt(1 ether, "krETH-bal");
    }

    function testSynthwraps() public pranked(sender) {
        uint256 amount = 1e8;

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthWrap,
            data: IKrMulticall.Data({
                tokenIn: wbtcAddr,
                amountIn: uint96(amount),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: krBTCAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrap,
            data: IKrMulticall.Data({
                tokenIn: krBTCAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wbtcAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        exec(amount, ops);
        krBTC.balanceOf(sender).eq(0, "krBTC-bal-1");
        WBTC.balanceOf(sender).gt(0.98e8, "krETH-bal-2");
        WBTC.balanceOf(sender).lt(1e8, "krETH-bal-2");
    }

    function testSynthunwraps() public pranked(sender) {
        krBTC.wrap(sender, 1e8);

        uint256 amount = krBTC.balanceOf(sender);

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);

        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrap,
            data: IKrMulticall.Data({
                tokenIn: krBTCAddr,
                amountIn: uint96(amount),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wbtcAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthWrap,
            data: IKrMulticall.Data({
                tokenIn: wbtcAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: krBTCAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        exec(0, ops);
        krBTC.balanceOf(sender).gt(0, "krBTC-bal-1");
        WBTC.balanceOf(sender).eq(0, "WBTC-bal-1");
    }

    function testAMMToWNativeToNative() public pranked(sender) {
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: usdcAddr,
                amountIn: uint96(100e6),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: abi.encodePacked(usdcAddr, uint24(500), wethAddr),
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthwrapNative,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceUnwrapNative,
                tokenOut: krETHAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        exec(0, ops);
        USDC.balanceOf(sender).eq(0, "USDC-bal-1");
        krETH.balanceOf(sender).gt(0, "krETH-bal-1");
    }

    function testNativeToWnative() public pranked(sender) {
        uint256 amount = 1 ether;

        (bool s, ) = krETHAddr.call{value: amount}("");
        s.eq(true, "wrap-in");

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: uint96(krETH.balanceOf(sender)),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthWrap,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceWrapNative,
                tokenOut: krETHAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });

        exec(0, ops);
        krETH.balanceOf(sender).gt(0, "krETH-bal-1");
        weth.balanceOf(sender).eq(0, "WETH-bal-1");
    }

    function testNativeToWnativeToAMM() public pranked(sender) {
        uint256 amount = 1 ether;

        (bool s, ) = krETHAddr.call{value: amount}("");
        s.eq(true, "wrap-in");

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: uint96(krETH.balanceOf(sender)),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceWrapNative,
                tokenOut: usdcAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: abi.encodePacked(wethAddr, uint24(500), usdcAddr),
                index: 0
            })
        });
        exec(0, ops);
        krETH.balanceOf(sender).eq(0, "krETH-bal-1");
        USDC.balanceOf(sender).gt(0, "USDC-bal-1");
    }

    function testVaultEntryToNativeExit() public pranked(sender) {
        uint256 amount = 1 ether;

        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](5);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: uint96(amount),
                tokensInMode: IKrMulticall.TokensInMode.Native,
                tokenOut: usdcAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: abi.encodePacked(wethAddr, uint24(500), usdcAddr),
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultDeposit,
            data: IKrMulticall.Data({
                tokenIn: usdcAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: kissAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[2] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: kissAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: krETHAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[3] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[4] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceWrapNative,
                tokenOut: usdcAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: abi.encodePacked(wethAddr, uint24(500), usdcAddr),
                index: 0
            })
        });
        exec(amount, ops);
        USDC.balanceOf(sender).gt(100e6, "USDC-bal-1");
    }

    function testNativeEntryToVaultExit() public pranked(sender) {
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](5);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: usdcAddr,
                amountIn: uint96(100e6),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: abi.encodePacked(usdcAddr, uint24(500), wethAddr),
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthwrapNative,
            data: IKrMulticall.Data({
                tokenIn: wethAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalanceUnwrapNative,
                tokenOut: krETHAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[2] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SCDPTrade,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: kissAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[3] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultRedeem,
            data: IKrMulticall.Data({
                tokenIn: kissAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: usdcAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        ops[4] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: usdcAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSenderNative,
                amountOutMin: 0,
                path: abi.encodePacked(usdcAddr, uint24(500), wethAddr),
                index: 0
            })
        });
        exec(0, ops);
        USDC.balanceOf(sender).eq(0, "USDC-bal-1");
        sender.balance.gt(100 ether, "ETH-bal-1");
    }

    function exec(uint256 val, IKrMulticall.Operation[] memory ops) internal returns (IKrMulticall.Result[] memory results) {
        results = multicall.execute{value: val}(ops, new bytes[](0));
        for (uint256 i = 0; i < results.length; i++) {
            Log.hr();
            uint8(ops[i].action).clg("action");
            results[i].tokenIn.clg("token-in");
            results[i].amountIn.clg("amount-in");
            results[i].tokenOut.clg("token-out");
            results[i].amountOut.clg("amount-out");
        }
    }
}
