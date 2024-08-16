// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Result, KISSUpgrade} from "scripts/tasks/KISSUpgrade.s.sol";
import {Tested} from "kresko-lib/utils/s/Tested.t.sol";
import {Log, Help} from "kresko-lib/utils/s/LibVm.s.sol";
import {ShortAssert} from "kresko-lib/utils/s/ShortAssert.t.sol";
import {WadRay} from "libs/WadRay.sol";

contract TestKISSUpgrade is KISSUpgrade, Tested {
    using Log for *;
    using Help for *;
    using WadRay for *;
    using ShortAssert for *;

    uint256 vaultBalBefore;
    mapping(address => uint256) public amountsOut;

    function setUp() public override {
        super.setUp();
        vaultBalBefore = USDC.balanceOf(vaultAddr);

        user0 = makeAddr("test-user");
        deal(usdceAddr, user0, 10_000e6);

        prank(user0);

        USDCe.approve(kissAddr, type(uint256).max);
        USDC.approve(kissAddr, type(uint256).max);

        kiss.vaultMint(usdceAddr, 1000 ether, user0);
    }

    function testInitializers() public {
        (, Result[] memory results) = getMintData();
        Result[] memory before = new Result[](results.length);
        for (uint256 i; i < results.length; i++) {
            before[i].account = results[i].account;
            before[i].amount = kiss.balanceOf(results[i].account);
        }

        upgrade();
        Result[] memory rows = executor.rows();
        for (uint256 i; i < rows.length; i++) {
            amountsOut[rows[i].account] += rows[i].amount;
        }
        for (uint256 i; i < rows.length; i++) {
            rows[i].account.eq(before[i].account, "Account should be equal");

            uint256 balAfter = kiss.balanceOf(rows[i].account);
            uint256 mintedAmount = amountsOut[rows[i].account];

            uint256 expectedBalance = before[i].amount + mintedAmount;

            balAfter.eq(expectedBalance, "Balance should be equal to amount");
        }
    }
    function testVaultRedeemUnderflow() public {
        uint256 redeemAmount = 100 ether;

        // burns more kiss than vkiss
        _testBefore(redeemAmount);

        // reset
        (uint256 resetAmount, ) = vault.previewDeposit(usdcAddr, vaultBalBefore);
        deal(usdcAddr, user0, resetAmount);
        vm.prank(user0);
        kiss.vaultMint(usdcAddr, resetAmount, user0);

        // new impl
        upgrade();

        // reverts
        _testAfter(redeemAmount);

        // succeeds
        vm.prank(user0);
        kiss.vaultRedeem(usdcAddr, resetAmount, user0, user0);
    }

    function _testBefore(uint256 amount) internal pranked(user0) {
        (uint256 usdcRequired, uint256 usdcActual) = _redeem(amount);
        vaultBalBefore.lt(usdcRequired, "USDC balance should be less than required");
        usdcRequired.dlg("Required USDC", 6);
        usdcActual.eq(vaultBalBefore, "Actual USDC should be equal to vault balance");
    }

    function _testAfter(uint256 amount) internal pranked(user0) {
        (uint256 maxShares, ) = vault.previewDeposit(usdcAddr, vaultBalBefore);
        vm.expectRevert(
            abi.encodeWithSignature("NOT_ENOUGH_BALANCE(address,uint256,uint256)", usdcAddr, amount, maxShares + 1)
        );
        kiss.vaultRedeem(usdcAddr, amount, user0, user0);
    }

    function _redeem(uint256 amount) internal returns (uint256 usdcRequired, uint256 usdcActual) {
        (usdcRequired, ) = vault.previewRedeem(usdcAddr, amount);

        (uint256 usdcIn, uint256 feeIn) = kiss.vaultRedeem(usdcAddr, amount, user0, user0);
        usdcActual = usdcIn + feeIn;
    }

    function _toDec(uint256 _amount, uint8 _fromDecimal, uint8 _toDecimal) internal pure returns (uint256) {
        if (_fromDecimal == _toDecimal) return _amount;
        return
            _fromDecimal < _toDecimal
                ? _amount * (10 ** (_toDecimal - _fromDecimal))
                : _amount / (10 ** (_fromDecimal - _toDecimal));
    }
}
