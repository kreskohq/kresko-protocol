// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable state-visibility, avoid-low-level-calls, no-console, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Help, Log} from "kresko-lib/utils/Libs.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {MockOracle} from "mocks/MockOracle.sol";

contract AuditTest is Deploy {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using WadRay for *;
    using PercentageMath for *;
    uint256 constant ETH_PRICE = 2000;

    IERC20 internal vaultShare;
    string internal rs_price_eth = "ETH:2000:8,";
    string internal rs_prices_rest = "BTC:35159:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,XAU:1977:8,WTI:77.5:8,USDT:1:8,JPY:0.0067:8";

    KreskoAsset krETH;
    address krETHAddr;
    MockOracle ethFeed;
    MockERC20 usdc;
    MockERC20 usdt;

    struct FeeTestRebaseConfig {
        uint248 rebaseMultiplier;
        bool positive;
        uint256 ethPrice;
        uint256 firstLiquidationPrice;
        uint256 secondLiquidationPrice;
    }

    function setUp() public {
        Deploy.deployTest("MNEMONIC_DEVNET", "test-audit", 0);

        usdc = MockERC20(Deployed.addr("USDC"));
        usdt = MockERC20(Deployed.addr("USDT"));
        vaultShare = IERC20(address(vault));
        krETHAddr = Deployed.addr("krETH");
        ethFeed = MockOracle(Deployed.addr("ETH.feed"));
        krETH = KreskoAsset(payable(krETHAddr));

        prank(getAddr(0));

        _setETHPrice(ETH_PRICE);

        kresko.setAssetSwapFeesSCDP(address(krETH), 390, 390, 5000);
        vault.setDepositFee(address(usdt), 10e2);
        vault.setWithdrawFee(address(usdt), 10e2);

        usdc.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        // 1000 KISS -> 0.48 ETH
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, 1000e18, 0);
    }

    function testRebase() external {
        prank(getAddr(0));
        uint256 crBefore = rsStatic(kresko.getCollateralRatioSCDP.selector);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETHAddr);
        uint256 valDebtBefore = rsStatic(kresko.getDebtValueSCDP.selector, krETHAddr, false);
        amountDebtBefore.gt(0, "debt-zero");
        crBefore.gt(0, "cr-zero");
        valDebtBefore.gt(0, "valDebt-zero");
        _setETHPrice(1000);
        krETH.rebase(2e18, true, new address[](0));
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETHAddr);
        uint256 valDebtAfter = rsStatic(kresko.getDebtValueSCDP.selector, krETHAddr, false);
        amountDebtBefore.eq(amountDebtAfter / 2, "debt-not-gt-after-rebase");
        crBefore.eq(rsStatic(kresko.getCollateralRatioSCDP.selector), "cr-not-equal-after-rebase");
        valDebtBefore.eq(valDebtAfter, "valDebt-not-equal-after-rebase");
    }

    function testSharedLiquidationAfterRebaseOak1() external {
        prank(getAddr(0));
        // uint256 crBefore = rsStatic(kresko.getCollateralRatioSCDP.selector);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETHAddr);
        amountDebtBefore.clg("amount-debt-before");
        // rebase up 2x and adjust price accordingly
        _setETHPrice(1000);
        krETH.rebase(2e18, true, new address[](0));
        // 1000 KISS -> 0.96 ETH
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, 1000e18, 0);
        // previous debt amount 0.48 ETH, doubled after rebase so 0.96 ETH
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETHAddr);
        amountDebtAfter.eq(0.96e18 + (0.48e18 * 2), "amount-debt-after");
        // matches $1000 ETH valuation
        uint256 valueDebtAfter = rsStatic(kresko.getDebtValueSCDP.selector, krETHAddr, true);
        valueDebtAfter.eq(1920e8, "value-debt-after");
        // make it liquidatable
        _setETHPrice(20000);
        uint256 crAfter = rsStatic(kresko.getCollateralRatioSCDP.selector);
        crAfter.lt(paramsJSON.scdp.liquidationThreshold); // cr-after: 112.65%
        // this fails without the fix as normalized debt amount is 0.96 krETH
        // vm.expectRevert();
        _liquidate(krETHAddr, 0.96e18 + 1, address(kiss));
    }

    function testVaultDoubleFeesOak4() external {
        VaultAsset memory usdtConfig = vault.assets(address(usdt));
        usdt.balanceOf(vault.getConfig().feeRecipient).eq(0);
        uint256 depositAmount = 1000e6;
        uint256 actualWithdrawAmount = depositAmount.percentMul(1e4 - usdtConfig.depositFee) / 2;
        uint256 expectedOut = actualWithdrawAmount.percentMul(1e4 - usdtConfig.withdrawFee);
        expectedOut.clg("expected-usdt-out");
        // user setup
        address user = getAddr(20);
        prank(user);
        usdt.mint(user, depositAmount);
        usdt.approve(address(vault), depositAmount);
        vault.deposit(address(usdt), depositAmount, user);
        uint256 halfShares = vaultShare.balanceOf(user) / 2;
        // other user setup
        address otherUser = getAddr(0);
        prank(otherUser);
        usdt.transfer(address(0), usdt.balanceOf(otherUser));
        // other user withdraws half of usdt available
        kiss.vaultRedeem(address(usdt), halfShares, otherUser, otherUser);
        uint256 otherBal = usdt.balanceOf(otherUser);
        otherBal.eq(expectedOut, "other-user-usdt-bal-after-redeem");
        // user withdraws all shares, resulting in partial withdrawal
        prank(user);
        vault.redeem(address(usdt), vaultShare.balanceOf(user), user, user);
        /// @dev before fix, 400 usdt is received while 405 usdt is expected
        /// @dev usdt.balanceOf(user).lt(expectedOut, "user-usdt-bal-after-lt");
        usdt.balanceOf(user).eq(expectedOut, "user-usdt-bal-after-redeem");
        vaultShare.balanceOf(user).eq(halfShares, "user-vault-bal-after-redeem");
        otherBal.eq(usdt.balanceOf(user));
        usdt.balanceOf(vault.getConfig().feeRecipient).eq(
            depositAmount - (expectedOut * 2),
            "vault-usdt-bal-fee-recipient-after-withdraw"
        );
    }

    function testWithdrawPartialOak6() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(amount, "deposit-not-amount");
        kiss.balanceOf(userOther).eq(0, "bal-not-zero-after-deposit");
        uint256 withdrawAmount = amount / 2;
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), withdrawAmount, userOther);
        kiss.balanceOf(userOther).eq(withdrawAmount, "bal-not-initial-after-withdraw");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(withdrawAmount, "deposit-not-amount");
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), withdrawAmount, userOther);
        kiss.balanceOf(userOther).eq(amount, "bal-not-initial-after-withdraw");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(0, "deposit-not-amount");
    }

    function testDepositWithdrawLiquidationOak6() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(amount, "deposit-not-amount");
        kiss.balanceOf(userOther).eq(0, "bal-not-zero-after-deposit");
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), amount, userOther);
        kiss.balanceOf(userOther).eq(amount, "bal-not-initial-after-withdraw");
        vm.expectRevert();
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), 1, userOther);
        kresko.depositSCDP(userOther, address(kiss), amount);
        // Make it liquidatable
        _setETHPriceAndLiquidate(80000);
        _setETHPrice(ETH_PRICE);
        prank(userOther);
        uint256 deposits = kresko.getAccountDepositSCDP(userOther, address(kiss));
        deposits.dlg("deposits");
        vm.expectRevert();
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), amount, userOther);
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), deposits, userOther);
        kiss.balanceOf(userOther).eq(deposits, "bal-not-deposits-after-withdraw");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(0, "deposit-not-zero-after-withdarw");
    }

    function testClaimFeesOak6() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);
        _trades(10);
        prank(userOther);
        kresko.getAccountFeesSCDP(userOther, address(kiss)).gt(0, "no-fees");
        uint256 feesClaimed = kresko.claimFeesSCDP(userOther, address(kiss), userOther);
        kiss.balanceOf(userOther).eq(feesClaimed, "bal-not-zero");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-claim");
        uint256 withdrawAmount = amount / 2;
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), withdrawAmount, userOther);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(withdrawAmount, "deposit-should-be-half-after-withdraw");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-withdraw");
        kiss.balanceOf(userOther).eq(feesClaimed + withdrawAmount, "bal-not-zero-after-withdraw");
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), withdrawAmount, userOther);
        kiss.balanceOf(userOther).closeTo(feesClaimed + amount, 1);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(0, "deposit-should-be-zero-in-the-end");
    }

    function testClaimFeesDuringDeposit() external {
        uint256 amount = 4000e18;
        uint256 depositAmount = amount / 2;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), depositAmount);
        _trades(10);
        prank(userOther);
        uint256 feeAmount = kresko.getAccountFeesSCDP(userOther, address(kiss));
        feeAmount.gt(0, "no-fees");
        kresko.depositSCDP(userOther, address(kiss), depositAmount);
        kiss.balanceOf(userOther).eq(feeAmount, "bal-not-zero");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-claim");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(amount, "deposit-not-zero-after-withdraw");
    }

    function testClaimFeesDuringWithdrawOak6() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);
        _trades(10);
        prank(userOther);
        uint256 feeAmount = kresko.getAccountFeesSCDP(userOther, address(kiss));
        feeAmount.gt(0, "no-fees");
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), amount, userOther);
        kiss.balanceOf(userOther).eq(feeAmount + amount, "bal-not-zero");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-claim");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(0, "deposit-not-zero-after-withdraw");
    }

    function testClaimFeesAfterLiquidationOak6() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);
        _trades(10);
        prank(userOther);
        kresko.getAccountFeesSCDP(userOther, address(kiss)).gt(0, "no-fees");
        // Make it liquidatable
        _setETHPriceAndLiquidate(77000);
        _setETHPrice(ETH_PRICE);
        prank(userOther);
        uint256 depositsBeforeClaim = kresko.getAccountDepositSCDP(userOther, address(kiss));
        uint256 feesClaimed = kresko.claimFeesSCDP(userOther, address(kiss), userOther);
        kiss.balanceOf(userOther).eq(feesClaimed, "bal-not-zero");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(depositsBeforeClaim, "deposit-should-be-same-after-claim");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-claim");
        uint256 withdrawAmount = depositsBeforeClaim / 2;
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), withdrawAmount, userOther);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(withdrawAmount, "deposit-should-be-half-after-withdraw");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-withdraw");
        kiss.balanceOf(userOther).eq(feesClaimed + withdrawAmount, "bal-not-zero-after-withdraw");
        rsCall(kresko.withdrawSCDP.selector, userOther, address(kiss), withdrawAmount, userOther);
        kiss.balanceOf(userOther).closeTo(feesClaimed + depositsBeforeClaim, 1);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(0, "deposit-should-be-zero-in-the-end");
    }

    function testFeeDistributionAfterMultipleLiquidationsOak6() external {
        uint256 feePerSwapTotal = 16e18;
        uint256 feesStart = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        // Swap, 1000 KISS -> 0.96 ETH
        prank(getAddr(0));
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, 2000e18, 0);
        uint256 feesUserAfterFirstSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 totalSwapFees = feesUserAfterFirstSwap - feesStart;
        totalSwapFees.eq(feePerSwapTotal, "fees-should-equal-total");
        // Make it liquidatable
        _setETHPriceAndLiquidate(28000);
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(
            feesUserAfterFirstSwap,
            "fee-should-not-change-after-liquidation"
        );
        // Setup another user
        address userOther = getAddr(55);
        kiss.transfer(userOther, 5000e18);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), 5000e18);
        // Perform equal swap again
        _setETHPriceAndSwap(2000, 2000e18);
        uint256 feesUserAfterSecondSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feeDiff = feesUserAfterSecondSwap - feesUserAfterFirstSwap;
        uint256 feesOtherUser = kresko.getAccountFeesSCDP(userOther, address(kiss));
        totalSwapFees = (feesOtherUser + feeDiff);
        totalSwapFees.eq(feePerSwapTotal, "fees-should-not-change-after-second-swap");
        // Liquidate again
        _setETHPriceAndLiquidate(17500);
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(
            feesUserAfterSecondSwap,
            "fee-should-not-change-after-second-liquidation"
        );
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(
            feesOtherUser,
            "fee-should-not-change-after-second-liquidation-other-user"
        );
        uint256 feesUserBeforeSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feesOtherUserBeforeSwap = kresko.getAccountFeesSCDP(userOther, address(kiss));
        // Perform equal swap again
        _setETHPriceAndSwap(2000, 2000e18);
        uint256 feesUserAfterSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feesOtherUserAfterSwap = kresko.getAccountFeesSCDP(userOther, address(kiss));
        totalSwapFees = (feesUserAfterSwap - feesUserBeforeSwap) + (feesOtherUserAfterSwap - feesOtherUserBeforeSwap);
        totalSwapFees.eq(feePerSwapTotal, "fees-should-not-change-after-third-swap");
        // Test claims
        prank(getAddr(0));
        uint256 balBefore = kiss.balanceOf(getAddr(0));
        uint256 feeAmount = kresko.claimFeesSCDP(getAddr(0), address(kiss), getAddr(0));
        kiss.balanceOf(getAddr(0)).eq(balBefore + feeAmount, "balance-should-have-fees-after-claim");
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(0, "fees-should-be-zero-after-claim-user");
        prank(userOther);
        uint256 feeAmountUserOther = kresko.claimFeesSCDP(userOther, address(kiss), userOther);
        kiss.balanceOf(userOther).eq(feeAmountUserOther);
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-should-be-zero-after-claim-user-other");
    }

    function testFeeDistributionAfterMultipleLiquidationsPositiveRebaseOak6() external {
        uint256 feePerSwapTotal = 16e18;
        uint256 feesStart = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        // Setup
        FeeTestRebaseConfig memory test = _feeTestRebaseConfig(247, true);
        prank(getAddr(0));
        _setETHPrice(test.ethPrice);
        krETH.rebase(test.rebaseMultiplier, test.positive, new address[](0));
        // Swap, 1000 KISS -> 0.96 ETH
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, 2000e18, 0);
        uint256 feesUserAfterFirstSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 totalSwapFees = feesUserAfterFirstSwap - feesStart;
        totalSwapFees.eq(feePerSwapTotal, "fees-should-equal-total");
        // Make it liquidatable
        _setETHPriceAndLiquidate(test.firstLiquidationPrice);
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(
            feesUserAfterFirstSwap,
            "fee-should-not-change-after-liquidation"
        );
        // Setup another user
        address userOther = getAddr(55);
        kiss.transfer(userOther, 5000e18);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), 5000e18);
        // Perform equal swap again
        _setETHPriceAndSwap(test.ethPrice, 2000e18);
        uint256 feesUserAfterSecondSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feeDiff = feesUserAfterSecondSwap - feesUserAfterFirstSwap;
        uint256 feesOtherUser = kresko.getAccountFeesSCDP(userOther, address(kiss));
        totalSwapFees = (feesOtherUser + feeDiff);
        totalSwapFees.eq(feePerSwapTotal, "fees-should-not-change-after-second-swap");
        // Liquidate again
        _setETHPriceAndLiquidate(test.secondLiquidationPrice);
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(
            feesUserAfterSecondSwap,
            "fee-should-not-change-after-second-liquidation"
        );
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(
            feesOtherUser,
            "fee-should-not-change-after-second-liquidation-other-user"
        );
        uint256 feesUserBeforeThirdSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feesOtherUserBeforeThirdSwap = kresko.getAccountFeesSCDP(userOther, address(kiss));
        // Perform equal swap again
        _setETHPriceAndSwap(test.ethPrice, 2000e18);
        uint256 feesUserAfterThirdSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feesOtherUserAfterThirdSwap = kresko.getAccountFeesSCDP(userOther, address(kiss));
        totalSwapFees =
            (feesUserAfterThirdSwap - feesUserBeforeThirdSwap) +
            (feesOtherUserAfterThirdSwap - feesOtherUserBeforeThirdSwap);
        totalSwapFees.eq(feePerSwapTotal, "fees-should-not-change-after-third-swap");
        // Test claims
        prank(getAddr(0));
        uint256 balBefore = kiss.balanceOf(getAddr(0));
        uint256 feeAmount = kresko.claimFeesSCDP(getAddr(0), address(kiss), getAddr(0));
        kiss.balanceOf(getAddr(0)).eq(balBefore + feeAmount, "balance-should-have-fees-after-claim");
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(0, "fees-should-be-zero-after-claim-user");
        prank(userOther);
        uint256 feeAmountUserOther = kresko.claimFeesSCDP(userOther, address(kiss), userOther);
        kiss.balanceOf(userOther).eq(feeAmountUserOther);
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-should-be-zero-after-claim-user-other");
    }

    function testFeeDistributionAfterMultipleLiquidationsNegativeRebaseOak6() external {
        uint256 feePerSwapTotal = 16e18;
        uint256 feesStart = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        // Setup
        FeeTestRebaseConfig memory test = _feeTestRebaseConfig(41285418, false);
        prank(getAddr(0));
        _setETHPrice(test.ethPrice);
        krETH.rebase(test.rebaseMultiplier, test.positive, new address[](0));
        // Swap, 1000 KISS -> 0.96 ETH
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, 2000e18, 0);
        uint256 feesUserAfterFirstSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 totalSwapFees = feesUserAfterFirstSwap - feesStart;
        totalSwapFees.eq(feePerSwapTotal, "fees-should-equal-total");
        // Make it liquidatable
        _setETHPriceAndLiquidate(test.firstLiquidationPrice);
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(
            feesUserAfterFirstSwap,
            "fee-should-not-change-after-liquidation"
        );
        // Setup another user
        address userOther = getAddr(55);
        kiss.transfer(userOther, 5000e18);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), 5000e18);
        // Perform equal swap again
        _setETHPriceAndSwap(test.ethPrice, 2000e18);
        uint256 feesUserAfterSecondSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feeDiff = feesUserAfterSecondSwap - feesUserAfterFirstSwap;
        uint256 feesOtherUser = kresko.getAccountFeesSCDP(userOther, address(kiss));
        totalSwapFees = (feesOtherUser + feeDiff);
        totalSwapFees.eq(feePerSwapTotal, "fees-should-not-change-after-second-swap");
        // Liquidate again
        _setETHPriceAndLiquidate(test.secondLiquidationPrice);
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(
            feesUserAfterSecondSwap,
            "fee-should-not-change-after-second-liquidation"
        );
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(
            feesOtherUser,
            "fee-should-not-change-after-second-liquidation-other-user"
        );
        uint256 feesUserBeforeThirdSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feesOtherUserBeforeThirdSwap = kresko.getAccountFeesSCDP(userOther, address(kiss));
        // Perform equal swap again
        _setETHPriceAndSwap(test.ethPrice, 2000e18);
        uint256 feesUserAfterThirdSwap = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        uint256 feesOtherUserAfterThirdSwap = kresko.getAccountFeesSCDP(userOther, address(kiss));
        totalSwapFees =
            (feesUserAfterThirdSwap - feesUserBeforeThirdSwap) +
            (feesOtherUserAfterThirdSwap - feesOtherUserBeforeThirdSwap);
        totalSwapFees.eq(feePerSwapTotal, "fees-should-not-change-after-third-swap");
        // Test claims
        prank(getAddr(0));
        uint256 balBefore = kiss.balanceOf(getAddr(0));
        uint256 feeAmount = kresko.claimFeesSCDP(getAddr(0), address(kiss), getAddr(0));
        kiss.balanceOf(getAddr(0)).eq(balBefore + feeAmount, "balance-should-have-fees-after-claim");
        kresko.getAccountFeesSCDP(getAddr(0), address(kiss)).eq(0, "fees-should-be-zero-after-claim-user");
        prank(userOther);
        uint256 feeAmountUserOther = kresko.claimFeesSCDP(userOther, address(kiss), userOther);
        kiss.balanceOf(userOther).eq(feeAmountUserOther);
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-should-be-zero-after-claim-user-other");
    }

    function testFullLiquidation() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);
        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);
        _trades(10);
        prank(userOther);
        kresko.getAccountFeesSCDP(userOther, address(kiss)).gt(0, "no-fees");
        // Make it liquidatable
        _setETHPriceAndLiquidate(109021);
        _setETHPrice(ETH_PRICE);
        prank(userOther);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).lt(1e18, "deposits");
    }

    function testCoverSCDPOak8() external {
        uint256 amount = 4000e18;
        // Setup another user
        address userOther = getAddr(55);
        kiss.balanceOf(userOther).eq(0, "bal-not-zero");
        kiss.transfer(userOther, amount);

        prank(userOther);
        kiss.approve(address(kresko), type(uint256).max);
        kresko.depositSCDP(userOther, address(kiss), amount);

        prank(userOther);
        uint256 swapDeposits = kresko.getSwapDepositsSCDP(address(kiss));
        uint256 depositsBeforeUser = kresko.getAccountDepositSCDP(getAddr(0), address(kiss));
        uint256 depositsBeforeOtherUser = kresko.getAccountDepositSCDP(userOther, address(kiss));
        // Make it liquidatable

        _setETHPriceAndCover(104071, 1000e18);
        prank(userOther);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(amount, "deposits");

        // Make it liquidatable
        _setETHPriceAndCoverIncentive(104071, 5000e18);
        uint256 amountFromUsers = (5000e18).percentMul(paramsJSON.scdp.coverIncentive) - swapDeposits;
        kresko.getSwapDepositsSCDP(address(kiss)).eq(0, "swap-deps-after");
        uint256 depositsAfterUser = kresko.getAccountDepositSCDP(getAddr(0), address(kiss));
        depositsAfterUser.lt(depositsBeforeUser, "deposits-after-cover-user");
        uint256 depositsAfterOtherUser = kresko.getAccountDepositSCDP(userOther, address(kiss));
        kresko.getAccountDepositSCDP(userOther, address(kiss)).lt(depositsBeforeOtherUser, "deposits-after-cover-user-other");
        uint256 totalSeized = (depositsBeforeOtherUser - depositsAfterOtherUser) + (depositsBeforeUser - depositsAfterUser);
        totalSeized.eq(amountFromUsers, "total-seized");
    }

    function testClaimAfterMultipleLiquidations() external {
        vm.pauseGasMetering();
        address claimer = getAddr(0);
        prank(claimer);
        kresko.getAccountDepositSCDP(claimer, address(kiss)).eq(50_000e18, "deposits");

        uint256 feesBefore = kresko.getAccountFeesSCDP(claimer, address(kiss));
        _swapAndLiquidate(1, 10e18, 100e18);
        kresko.getAccountFeesSCDP(claimer, address(kiss)).gt(feesBefore, "fees-before");
        uint256 checkpoint = gasleft();
        vm.resumeGasMetering();
        kresko.claimFeesSCDP(claimer, address(kiss), claimer);
        vm.pauseGasMetering();
        uint256 used = checkpoint - gasleft();
        used.clg("gas-used");
    }

    function _swapAndLiquidate(uint256 times, uint256 swapAmount, uint256 liquidateAmount) internal repranked(getAddr(0)) {
        for (uint256 i; i < times; i++) {
            uint256 amountOut = _previewSwap(address(kiss), krETHAddr, swapAmount, 0);
            rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, swapAmount, 0);
            _setETHPriceAndLiquidate(109021, liquidateAmount);
            _setETHPrice(ETH_PRICE);
            rsCall(kresko.swapSCDP.selector, getAddr(0), krETHAddr, address(kiss), amountOut, 0);
        }
    }

    /* -------------------------------- Util -------------------------------- */
    function _feeTestRebaseConfig(uint248 multiplier, bool positive) internal pure returns (FeeTestRebaseConfig memory) {
        if (positive) {
            return
                FeeTestRebaseConfig({
                    positive: positive,
                    rebaseMultiplier: multiplier * 1e18,
                    ethPrice: ETH_PRICE / multiplier,
                    firstLiquidationPrice: 28000 / multiplier,
                    secondLiquidationPrice: 17500 / multiplier
                });
        }
        return
            FeeTestRebaseConfig({
                positive: positive,
                rebaseMultiplier: multiplier * 1e18,
                ethPrice: ETH_PRICE * multiplier,
                firstLiquidationPrice: 28000 * multiplier,
                secondLiquidationPrice: 17500 * multiplier
            });
    }

    function _setETHPriceAndSwap(uint256 price, uint256 swapAmount) internal {
        prank(getAddr(0));
        _setETHPrice(price);
        kresko.setAssetKFactor(krETHAddr, 1.2e4);
        rsCall(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETHAddr, swapAmount, 0);
    }

    function _setETHPriceAndLiquidate(uint256 price) internal {
        prank(getAddr(0));
        uint256 debt = kresko.getDebtSCDP(krETHAddr);
        if (debt < krETH.balanceOf(getAddr(0))) {
            usdc.mint(getAddr(0), 100_000e6);
            rsCall(kresko.depositCollateral.selector, getAddr(0), address(usdc), 100_000e6);
            rsCall(kresko.mintKreskoAsset.selector, getAddr(0), krETHAddr, debt, getAddr(0));
        }
        kresko.setAssetKFactor(krETHAddr, 1e4);
        _setETHPrice(price);
        rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: before-liq");
        _liquidate(krETHAddr, debt, address(kiss));
        // rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: after-liq");
    }

    function _setETHPriceAndLiquidate(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        if (amount < krETH.balanceOf(getAddr(0))) {
            usdc.mint(getAddr(0), 100_000e6);
            rsCall(kresko.depositCollateral.selector, getAddr(0), address(usdc), 100_000e6);
            rsCall(kresko.mintKreskoAsset.selector, getAddr(0), krETHAddr, amount, getAddr(0));
        }
        kresko.setAssetKFactor(krETHAddr, 1e4);
        _setETHPrice(price);
        rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: before-liq");
        _liquidate(krETHAddr, amount.wadDiv(price * 1e18), address(kiss));
        // rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: after-liq");
    }

    function _setETHPriceAndCover(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        // uint256 debt = kresko.getDebtSCDP(krETHAddr);
        usdc.mint(getAddr(0), 100_000e6);
        usdc.approve(address(kiss), type(uint256).max);
        kiss.vaultMint(address(usdc), amount, getAddr(0));
        kiss.approve(address(kresko), type(uint256).max);
        kresko.setAssetKFactor(krETHAddr, 1e4);
        _setETHPrice(price);
        rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: before-cover");
        _cover(amount);
        rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: after-cover");
    }

    function _setETHPriceAndCoverIncentive(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        // uint256 debt = kresko.getDebtSCDP(krETHAddr);
        usdc.mint(getAddr(0), 100_000e6);
        usdc.approve(address(kiss), type(uint256).max);
        kiss.vaultMint(address(usdc), amount, getAddr(0));
        kiss.approve(address(kresko), type(uint256).max);
        kresko.setAssetKFactor(krETHAddr, 1e4);
        _setETHPrice(price);
        rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: before-cover");
        _coverIncentive(amount, address(kiss));
        rsStatic(kresko.getCollateralRatioSCDP.selector).pct("CR: after-cover");
    }

    function _trades(uint256 count) internal {
        address trader = getAddr(777);
        uint256 mintAmount = 20000e6;
        usdc.mint(trader, mintAmount * count);

        prank(trader);
        usdc.approve(address(kiss), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        (uint256 tradeAmount, ) = kiss.vaultDeposit(address(usdc), mintAmount * count, trader);
        for (uint256 i = 0; i < count; i++) {
            rsCall(kresko.swapSCDP.selector, trader, address(kiss), krETHAddr, tradeAmount / count, 0);
            rsCall(kresko.swapSCDP.selector, trader, krETHAddr, address(kiss), krETH.balanceOf(trader), 0);
        }
    }

    function _cover(uint256 _coverAmount) internal returns (uint256 crAfter, uint256 debtValAfter) {
        rsCall(kresko.coverSCDP.selector, address(kiss), _coverAmount);
        return (rsStatic(kresko.getCollateralRatioSCDP.selector), rsStatic(kresko.getTotalDebtValueSCDP.selector, true));
    }

    function _coverIncentive(
        uint256 _coverAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter) {
        rsCall(kresko.coverWithIncentiveSCDP.selector, address(kiss), _coverAmount, _seizeAsset);
        return (rsStatic(kresko.getCollateralRatioSCDP.selector), rsStatic(kresko.getTotalDebtValueSCDP.selector, true));
    }

    function _liquidate(
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter, uint256 debtAmountAfter) {
        rsCall(kresko.liquidateSCDP.selector, _repayAsset, _repayAmount, _seizeAsset);
        return (
            rsStatic(kresko.getCollateralRatioSCDP.selector),
            rsStatic(kresko.getDebtValueSCDP.selector, _repayAsset, true),
            kresko.getDebtSCDP(_repayAsset)
        );
    }

    function _previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) internal view returns (uint256 amountOut_) {
        return rsStatic(kresko.previewSwapSCDP.selector, _assetIn, _assetOut, _amountIn, _minAmountOut);
    }

    function _setETHPrice(uint256 _pushPrice) internal {
        ethFeed.setPrice(_pushPrice * 1e8);
        rs_price_eth = ("ETH:").and(_pushPrice.str()).and(":8");
        rsInit(rs_price_eth.and(rs_prices_rest));
    }

    function _getPrice(address _asset) internal view returns (uint256) {
        return rsStatic(kresko.getPrice.selector, _asset);
    }
}
