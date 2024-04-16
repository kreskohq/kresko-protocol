// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {IKrMulticall, KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MulticallUpdate is Tested, ArbScript {
    using Log for *;
    using Help for *;
    using ShortAssert for *;
    address sender;

    function setUp() public {
        ArbScript.initialize();
        sender = vm.createWallet("sender").addr;
        deal(sender, 100 ether);
        deal(USDCAddr, sender, 100e6);

        prank(sender);
        multicall = new KrMulticall(kreskoAddr, kissAddr, address(swap), wethAddr, address(pythEP), safe);

        USDC.approve(address(multicall), type(uint256).max);
        krETH.approve(address(multicall), type(uint256).max);
        approvals();

        prank(safe);
        fetchPythAndUpdate();
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
        exec(amount, ops, new bytes[](0));
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
        exec(0, ops, new bytes[](0));
        krETH.balanceOf(sender).eq(994005248750000000, "krETH-bal");
    }

    function testAMMToWNativeToNative() public pranked(sender) {
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](2);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: USDCAddr,
                amountIn: uint96(100e6),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: abi.encodePacked(USDCAddr, uint24(500), wethAddr),
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
        exec(0, ops, new bytes[](0));
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
        exec(0, ops, new bytes[](0));
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
                tokenOut: USDCAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: abi.encodePacked(wethAddr, uint24(500), USDCAddr),
                index: 0
            })
        });
        exec(0, ops, new bytes[](0));
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
                tokenOut: USDCAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: abi.encodePacked(wethAddr, uint24(500), USDCAddr),
                index: 0
            })
        });
        ops[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.VaultDeposit,
            data: IKrMulticall.Data({
                tokenIn: USDCAddr,
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
                tokenOut: USDCAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: abi.encodePacked(wethAddr, uint24(500), USDCAddr),
                index: 0
            })
        });
        exec(amount + 5, ops, pythUpdate);
        USDC.balanceOf(sender).gt(100e6, "USDC-bal-1");
    }

    function testNativeEntryToVaultExit() public pranked(sender) {
        IKrMulticall.Operation[] memory ops = new IKrMulticall.Operation[](5);
        ops[0] = IKrMulticall.Operation({
            action: IKrMulticall.Action.AMMExactInput,
            data: IKrMulticall.Data({
                tokenIn: USDCAddr,
                amountIn: uint96(100e6),
                tokensInMode: IKrMulticall.TokensInMode.PullFromSender,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.LeaveInContract,
                amountOutMin: 0,
                path: abi.encodePacked(USDCAddr, uint24(500), wethAddr),
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
                tokenOut: USDCAddr,
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
                tokenIn: USDCAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSenderNative,
                amountOutMin: 0,
                path: abi.encodePacked(USDCAddr, uint24(500), wethAddr),
                index: 0
            })
        });
        exec(5, ops, pythUpdate);
        USDC.balanceOf(sender).eq(0, "USDC-bal-1");
        sender.balance.gt(100 ether, "ETH-bal-1");
    }

    function exec(
        uint256 val,
        IKrMulticall.Operation[] memory ops,
        bytes[] memory _updateData
    ) internal returns (IKrMulticall.Result[] memory results) {
        results = multicall.execute{value: val}(ops, _updateData);
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
