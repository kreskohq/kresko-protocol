// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ArbScript} from "scripts/utils/ArbScript.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {toWad} from "common/funcs/Math.sol";
import {IKrMulticall, KrMulticall} from "periphery/KrMulticall.sol";
import {Role} from "common/Constants.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";

// solhint-disable no-empty-blocks, reason-string, state-visibility

contract MulticallUpdate is Tested, ArbScript {
    using Log for *;
    using Help for *;
    using ShortAssert for *;
    address sender;

    function setUp() public {
        ArbScript.initialize();
        fetchPythAndUpdate();
        sender = vm.createWallet("sender").addr;

        prank(sender);
        approvals();
        multicall = new KrMulticall(kreskoAddr, kissAddr, address(swap), wethAddr, address(pythEP), safe);
        prank(safe);
        kresko.grantRole(Role.MANAGER, address(multicall));
    }

    function testSynthwrapsNative() public pranked(sender) {
        IKreskoAsset.Wrapping memory info = krETH.wrappingInfo();
        uint256 amount = 1 ether;

        IKrMulticall.Operation[] memory opsShort = new IKrMulticall.Operation[](2);
        opsShort[0] = IKrMulticall.Operation({
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
        opsShort[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        IKrMulticall.Result[] memory results = multicall.execute(opsShort, new bytes[](0));
        results[0].amountIn.clg("SynthwrapNative-1");
        results[0].amountOut.clg("SynthwrapNative-2");
        results[1].amountIn.clg("SynthUnwrapNative-3");
        results[1].amountOut.clg("SynthUnwrapNative-4");
    }

    function testSynthwrapsNative() public pranked(sender) {
        IKreskoAsset.Wrapping memory info = krETH.wrappingInfo();
        uint256 amount = 1 ether;

        IKrMulticall.Operation[] memory opsShort = new IKrMulticall.Operation[](2);
        opsShort[0] = IKrMulticall.Operation({
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
        opsShort[1] = IKrMulticall.Operation({
            action: IKrMulticall.Action.SynthUnwrapNative,
            data: IKrMulticall.Data({
                tokenIn: krETHAddr,
                amountIn: 0,
                tokensInMode: IKrMulticall.TokensInMode.UseContractBalance,
                tokenOut: wethAddr,
                amountOut: 0,
                tokensOutMode: IKrMulticall.TokensOutMode.ReturnToSender,
                amountOutMin: 0,
                path: "",
                index: 0
            })
        });
        IKrMulticall.Result[] memory results = multicall.execute(opsShort, new bytes[](0));
        results[0].amountIn.clg("SynthwrapNative-1");
        results[0].amountOut.clg("SynthwrapNative-2");
        results[1].amountIn.clg("SynthUnwrapNative-3");
        results[1].amountOut.clg("SynthUnwrapNative-4");
    }

    function test_slot1() public {
        uint256 amount = 1 ether;
        ValQueryRes memory res = getValuePrice(krETHAddr, amount);
        res.value.clg("Value");
        res.price.clg("Price");
        toWad(amount, 18).mulWad(res.price).clg("Calculated");
    }

    function test_slot2() public pranked(sender) {
        peekAsset(krETHAddr, true);
    }
}
