// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IMinterDepositWithdrawFacet} from "minter/interfaces/IMinterDepositWithdrawFacet.sol";
import {IMinterAccountStateFacet} from "minter/interfaces/IMinterAccountStateFacet.sol";
import {PLog} from "kresko-lib/utils/PLog.s.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IMinterMintFacet} from "minter/interfaces/IMinterMintFacet.sol";
import {MintArgs} from "common/Args.sol";
import {IKresko} from "periphery/IKresko.sol";

// solhint-disable state-visibility

contract BatchTest is Tested, Deploy {
    using Deployed for *;
    using PLog for *;
    using ShortAssert for *;

    MockERC20 USDC;
    MockERC20 DAI;
    address krETH;
    address krJPY;

    address user;

    function setUp() public mnemonic("MNEMONIC_DEVNET") {
        Deploy.deployTest(0);
        address deployer = getAddr(0);

        user = getAddr(100);
        vm.deal(user, 1 ether);

        USDC = MockERC20(("USDC").cached());
        DAI = MockERC20(("DAI").cached());

        krETH = ("krETH").cached();
        krJPY = ("krJPY").cached();

        prank(deployer);

        USDC.mint(user, 1000e6);
        DAI.mint(user, 1000 ether);

        prank(user);
        USDC.approve(address(kresko), type(uint256).max);
        DAI.approve(address(kresko), type(uint256).max);
    }

    function testBatchCall() public pranked(user) {
        bytes[] memory calls = new bytes[](4);
        calls[0] = abi.encodeCall(IMinterDepositWithdrawFacet.depositCollateral, (user, address(DAI), 400 ether));
        calls[1] = abi.encodeCall(IMinterDepositWithdrawFacet.depositCollateral, (user, address(USDC), 100e6));
        calls[2] = abi.encodeCall(IMinterMintFacet.mintKreskoAsset, (MintArgs(user, krETH, 0.1 ether, user), new bytes[](0)));
        calls[3] = abi.encodeCall(IMinterMintFacet.mintKreskoAsset, (MintArgs(user, krJPY, 10000 ether, user), new bytes[](0)));

        kresko.batchCall{value: updateFee}(calls, updateData);

        DAI.balanceOf(user).eq(600 ether, "user-dai-balance");
        USDC.balanceOf(user).eq(900e6, "user-usdc-balance");

        MockERC20(krETH).balanceOf(user).eq(0.1 ether, "user-krETH-balance");
        MockERC20(krJPY).balanceOf(user).eq(10000 ether, "user-krJPY-balance");
    }

    function testBatchStaticCall() public pranked(user) {
        kresko.depositCollateral(user, address(DAI), 400 ether);
        kresko.depositCollateral(user, address(USDC), 100e6);
        kresko.mintKreskoAsset{value: updateFee}(MintArgs(user, krETH, 0.1 ether, user), updateData);
        kresko.mintKreskoAsset{value: updateFee}(MintArgs(user, krJPY, 10000 ether, user), updateData);

        bytes[] memory staticCalls = new bytes[](4);
        staticCalls[0] = abi.encodeCall(IMinterAccountStateFacet.getAccountCollateralAmount, (user, address(DAI)));
        staticCalls[1] = abi.encodeCall(IMinterAccountStateFacet.getAccountCollateralAmount, (user, address(USDC)));
        staticCalls[2] = abi.encodeCall(IMinterAccountStateFacet.getAccountDebtAmount, (user, krETH));
        staticCalls[3] = abi.encodeCall(IMinterAccountStateFacet.getAccountDebtAmount, (user, krJPY));

        uint256 nativeBalBefore = user.balance;
        (uint256 time, bytes[] memory data) = kresko.batchStaticCall{value: updateFee}(staticCalls, updateData);

        abi.decode(data[0], (uint256)).eq(400 ether, "static-user-dai-collateral");
        abi.decode(data[1], (uint256)).eq(100e6, "static-user-usdc-collateral");
        abi.decode(data[2], (uint256)).eq(0.1 ether, "static-user-krETH-debt");
        abi.decode(data[3], (uint256)).eq(10000 ether, "static-user-krJPY-debt");

        time.eq(block.timestamp, "static-time");
        user.balance.eq(nativeBalBefore, "static-user-balance");
    }

    function testCantCallStaticCall() public pranked(user) {
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeCall(IMinterDepositWithdrawFacet.depositCollateral, (user, address(DAI), 400 ether));

        vm.expectRevert();
        kresko.batchStaticCall{value: updateFee}(calls, updateData);
    }

    function testReentry() public pranked(user) {
        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeCall(IMinterAccountStateFacet.getAccountCollateralAmount, (user, address(DAI)));

        Reentrant reentrant = new Reentrant(kresko, calls, updateData);

        vm.deal(address(kresko), 1 ether);
        vm.deal(address(reentrant), 0.001 ether);

        vm.expectRevert();
        reentrant.reenter();
    }
}

contract Reentrant {
    IKresko kresko;
    bytes[] updateData;
    bytes[] calls;
    uint256 count;

    constructor(IKresko _kresko, bytes[] memory _calls, bytes[] memory _updateData) {
        kresko = _kresko;
        updateData = _updateData;
        calls = _calls;
    }

    function reenter() public {
        kresko.batchStaticCall{value: 0.001 ether}(calls, updateData);
    }

    receive() external payable {
        if (count == 10) {
            return;
        }
        count++;
        reenter();
    }
}
