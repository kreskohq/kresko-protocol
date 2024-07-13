// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// solhint-disable state-visibility, avoid-low-level-calls, no-console, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

import {ShortAssert} from "kresko-lib/utils/s/ShortAssert.t.sol";
import {Utils, Log} from "kresko-lib/utils/s/LibVm.s.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {KreskoAsset} from "kresko-asset/KreskoAsset.sol";
import {MockERC20, MockOracle} from "mocks/Mocks.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {MintArgs, SCDPLiquidationArgs, SCDPWithdrawArgs, SwapArgs} from "common/Args.sol";

contract ComplexTest is Deploy {
    using ShortAssert for *;
    using Log for *;
    using Utils for *;
    uint256 constant ETH_PRICE = 2000;

    IERC20 internal vaultShare;

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
        JSON.Config memory cfg = Deploy.deployTest("MNEMONIC_DEVNET", "test-audit", 0);
        getAddr(0).clg("deployer");
        cfg.params.common.admin.clg("admin");
        // for price updates
        vm.deal(address(kresko), 1 ether);
        vm.deal(getAddr(0), 1 ether);

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
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 1000e18, 0, pyth.update));
    }

    function testRebase() external {
        prank(getAddr(0));

        uint256 crBefore = kresko.getCollateralRatioSCDP();
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETHAddr);
        uint256 valDebtBefore = kresko.getDebtValueSCDP(krETHAddr, false);
        amountDebtBefore.gt(0, "debt-zero");
        crBefore.gt(0, "cr-zero");
        valDebtBefore.gt(0, "valDebt-zero");
        _setETHPrice(1000);
        krETH.rebase(2e18, true, new address[](0));
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETHAddr);
        uint256 valDebtAfter = kresko.getDebtValueSCDP(krETHAddr, false);
        amountDebtBefore.eq(amountDebtAfter / 2, "debt-not-gt-after-rebase");
        crBefore.eq(kresko.getCollateralRatioSCDP(), "cr-not-equal-after-rebase");
        valDebtBefore.eq(valDebtAfter, "valDebt-not-equal-after-rebase");
    }

    function testSharedLiquidationAfterRebaseOak1() external {
        prank(getAddr(0));
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETHAddr);
        amountDebtBefore.clg("amount-debt-before");
        // rebase up 2x and adjust price accordingly
        _setETHPrice(1000);
        krETH.rebase(2e18, true, new address[](0));
        // 1000 KISS -> 0.96 ETH
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 1000e18, 0, pyth.update));
        // previous debt amount 0.48 ETH, doubled after rebase so 0.96 ETH
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETHAddr);
        amountDebtAfter.eq(0.96e18 + (0.48e18 * 2), "amount-debt-after");
        // matches $1000 ETH valuation
        uint256 valueDebtAfter = kresko.getDebtValueSCDP(krETHAddr, true);
        valueDebtAfter.eq(1920e8, "value-debt-after");
        // make it liquidatable
        _setETHPrice(20000);
        uint256 crAfter = kresko.getCollateralRatioSCDP();
        crAfter.lt(paramsJSON.scdp.liquidationThreshold); // cr-after: 112.65%
        // this fails without the fix as normalized debt amount is 0.96 krETH
        // vm.expectRevert();
        _liquidate(krETHAddr, 0.96e18 + 1, address(kiss));
    }

    function testVaultDoubleFeesOak4() external {
        VaultAsset memory usdtConfig = vault.assets(address(usdt));
        usdt.balanceOf(vault.getConfig().feeRecipient).eq(0);
        uint256 depositAmount = 1000e6;
        uint256 actualWithdrawAmount = depositAmount.pmul(1e4 - usdtConfig.depositFee) / 2;
        uint256 expectedOut = actualWithdrawAmount.pmul(1e4 - usdtConfig.withdrawFee);
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

        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), withdrawAmount, userOther), pyth.update);
        kiss.balanceOf(userOther).eq(withdrawAmount, "bal-not-initial-after-withdraw");
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(withdrawAmount, "deposit-not-amount");
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), withdrawAmount, userOther), pyth.update);
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
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), amount, userOther), pyth.update);
        kiss.balanceOf(userOther).eq(amount, "bal-not-initial-after-withdraw");
        vm.expectRevert();
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), 1, userOther), pyth.update);
        kresko.depositSCDP(userOther, address(kiss), amount);
        // Make it liquidatable
        _setETHPriceAndLiquidate(80000);
        _setETHPrice(ETH_PRICE);
        prank(userOther);
        uint256 deposits = kresko.getAccountDepositSCDP(userOther, address(kiss));
        deposits.dlg("deposits");
        vm.expectRevert();
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), amount, userOther), pyth.update);
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), deposits, userOther), pyth.update);
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
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), withdrawAmount, userOther), pyth.update);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(withdrawAmount, "deposit-should-be-half-after-withdraw");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-withdraw");
        kiss.balanceOf(userOther).eq(feesClaimed + withdrawAmount, "bal-not-zero-after-withdraw");
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), withdrawAmount, userOther), pyth.update);
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
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), amount, userOther), pyth.update);
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
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), withdrawAmount, userOther), pyth.update);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(withdrawAmount, "deposit-should-be-half-after-withdraw");
        kresko.getAccountFeesSCDP(userOther, address(kiss)).eq(0, "fees-not-zero-after-withdraw");
        kiss.balanceOf(userOther).eq(feesClaimed + withdrawAmount, "bal-not-zero-after-withdraw");
        kresko.withdrawSCDP(SCDPWithdrawArgs(userOther, address(kiss), withdrawAmount, userOther), pyth.update);
        kiss.balanceOf(userOther).closeTo(feesClaimed + depositsBeforeClaim, 1);
        kresko.getAccountDepositSCDP(userOther, address(kiss)).eq(0, "deposit-should-be-zero-in-the-end");
    }

    function testFeeDistributionAfterMultipleLiquidationsOak6() external {
        uint256 feePerSwapTotal = 16e18;
        uint256 feesStart = kresko.getAccountFeesSCDP(getAddr(0), address(kiss));
        // Swap, 1000 KISS -> 0.96 ETH
        prank(getAddr(0));
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 2000e18, 0, pyth.update));
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
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 2000e18, 0, pyth.update));
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
        FeeTestRebaseConfig memory test = _feeTestRebaseConfig(4128, false);
        prank(getAddr(0));
        _setETHPrice(test.ethPrice);
        krETH.rebase(test.rebaseMultiplier, test.positive, new address[](0));
        // Swap, 1000 KISS -> 0.96 ETH
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 2000e18, 0, pyth.update));
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
        uint256 amountFromUsers = (5000e18).pmul(paramsJSON.scdp.coverIncentive) - swapDeposits;
        kresko.getSwapDepositsSCDP(address(kiss)).eq(0, "swap-deps-after");
        uint256 depositsAfterUser = kresko.getAccountDepositSCDP(getAddr(0), address(kiss));
        depositsAfterUser.lt(depositsBeforeUser, "deposits-after-cover-user");
        uint256 depositsAfterOtherUser = kresko.getAccountDepositSCDP(userOther, address(kiss));
        kresko.getAccountDepositSCDP(userOther, address(kiss)).lt(depositsBeforeOtherUser, "deposits-after-cover-user-other");
        uint256 totalSeized = (depositsBeforeOtherUser - depositsAfterOtherUser) + (depositsBeforeUser - depositsAfterUser);
        totalSeized.eq(amountFromUsers, "total-seized");
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
        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, swapAmount, 0, pyth.update));
    }

    function _setETHPriceAndLiquidate(uint256 price) internal {
        prank(getAddr(0));
        uint256 debt = kresko.getDebtSCDP(krETHAddr);
        if (debt < krETH.balanceOf(getAddr(0))) {
            usdc.mint(getAddr(0), 100_000e6);
            kresko.depositCollateral(getAddr(0), address(usdc), 100_000e6);
            kresko.mintKreskoAsset(MintArgs(getAddr(0), krETHAddr, debt, getAddr(0)), pyth.update);
        }
        kresko.setAssetKFactor(krETHAddr, 1e4);
        _setETHPrice(price);
        kresko.getCollateralRatioSCDP().plg("CR: before-liq");
        _liquidate(krETHAddr, debt, address(kiss));
    }

    function _setETHPriceAndLiquidate(uint256 price, uint256 amount) internal {
        prank(getAddr(0));
        if (amount < krETH.balanceOf(getAddr(0))) {
            usdc.mint(getAddr(0), 100_000e6);
            kresko.depositCollateral(getAddr(0), address(usdc), 100_000e6);
            kresko.mintKreskoAsset(MintArgs(getAddr(0), krETHAddr, amount, getAddr(0)), pyth.update);
        }
        kresko.setAssetKFactor(krETHAddr, 1e4);
        _setETHPrice(price);
        kresko.getCollateralRatioSCDP().plg("CR: before-liq");
        _liquidate(krETHAddr, amount.wdiv(price * 1e18), address(kiss));
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
        kresko.getCollateralRatioSCDP().plg("CR: before-cover");
        _cover(amount);
        kresko.getCollateralRatioSCDP().plg("CR: after-cover");
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
        kresko.getCollateralRatioSCDP().plg("CR: before-cover");
        _coverIncentive(amount, address(kiss));
        kresko.getCollateralRatioSCDP().plg("CR: after-cover");
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
            kresko.swapSCDP(SwapArgs(trader, address(kiss), krETHAddr, tradeAmount / count, 0, pyth.update));
            kresko.swapSCDP(SwapArgs(trader, krETHAddr, address(kiss), krETH.balanceOf(trader), 0, pyth.update));
        }
    }

    function _cover(uint256 _coverAmount) internal returns (uint256 crAfter, uint256 debtValAfter) {
        kresko.coverSCDP(address(kiss), _coverAmount, pyth.update);
        return (kresko.getCollateralRatioSCDP(), kresko.getTotalDebtValueSCDP(true));
    }

    function _coverIncentive(
        uint256 _coverAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter) {
        kresko.coverWithIncentiveSCDP(address(kiss), _coverAmount, _seizeAsset, pyth.update);
        return (kresko.getCollateralRatioSCDP(), kresko.getTotalDebtValueSCDP(true));
    }

    function _liquidate(
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter, uint256 debtAmountAfter) {
        kresko.liquidateSCDP(SCDPLiquidationArgs(_repayAsset, _repayAmount, _seizeAsset), pyth.update);
        return (kresko.getCollateralRatioSCDP(), kresko.getDebtValueSCDP(_repayAsset, true), kresko.getDebtSCDP(_repayAsset));
    }

    function _previewSwap(address _assetIn, address _assetOut, uint256 _amountIn) internal view returns (uint256 amountOut_) {
        (amountOut_, , ) = kresko.previewSwapSCDP(_assetIn, _assetOut, _amountIn);
    }

    function _setETHPrice(uint256 _newPrice) internal {
        ethFeed.setPrice(_newPrice * 1e8);
        JSON.Config memory cfg = JSON.getConfig("test", "test-audit");
        for (uint256 i = 0; i < cfg.assets.tickers.length; i++) {
            if (cfg.assets.tickers[i].ticker.equals("ETH")) {
                cfg.assets.tickers[i].mockPrice = _newPrice * 1e8;
            }
        }
        updatePythLocal(cfg.getMockPrices());
    }
}
