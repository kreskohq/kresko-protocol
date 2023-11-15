// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {Help, Log} from "kresko-lib/utils/Libs.sol";
import {Role} from "common/Constants.sol";
import {Local} from "scripts/deploy/Run.s.sol";
import {Test} from "forge-std/Test.sol";
import {state} from "scripts/deploy/base/DeployState.s.sol";
import {PType} from "periphery/PTypes.sol";
import {DataV1} from "periphery/DataV1.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {Errors} from "common/Errors.sol";
import {VaultAsset} from "vault/VTypes.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Asset} from "common/Types.sol";

// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console

contract AuditTest is Local, Test {
    using ShortAssert for *;
    using Help for *;
    using Log for *;
    using PercentageMath for *;

    bytes redstoneCallData;
    DataV1 internal dataV1;
    string internal rsPrices;

    function setUp() public {
        rsPrices = initialPrices;

        // enableLogger();
        address deployer = getAddr(0);
        address admin = getAddr(0);
        address treasury = getAddr(10);
        vm.deal(deployer, 100 ether);

        UserCfg[] memory userCfg = super.createUserConfig(testUsers);
        AssetsOnChain memory assets = deploy(deployer, admin, treasury);
        setupUsers(userCfg, assets);

        dataV1 = new DataV1(IDataFacet(address(kresko)), address(vkiss), address(kiss));
        kiss = state().kiss;

        prank(getAddr(0));
        redstoneCallData = getRedstonePayload(rsPrices);
        _setETHPrice(2000);
        // 1000 KISS -> 0.48 ETH
        call(kresko.swapSCDP.selector, getAddr(0), address(state().kiss), krETH.addr, 1000e18, 0, rsPrices);
        vkiss.setDepositFee(address(USDT), 10e2);
        vkiss.setWithdrawFee(address(USDT), 10e2);
    }

    function testRebase() external {
        prank(getAddr(0));

        uint256 crBefore = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETH.addr);
        uint256 valDebtBefore = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, false, rsPrices);

        amountDebtBefore.gt(0, "debt-zero");
        crBefore.gt(0, "cr-zero");
        valDebtBefore.gt(0, "valDebt-zero");

        _setETHPrice(1000);
        krETH.krAsset.rebase(2e18, true, new address[](0));

        uint256 crAfter = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETH.addr);
        uint256 valDebtAfter = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, false, rsPrices);

        amountDebtBefore.eq(amountDebtAfter / 2, "debt-not-gt-after-rebase");
        crBefore.eq(crAfter, "cr-not-equal-after-rebase");
        valDebtBefore.eq(valDebtAfter, "valDebt-not-equal-after-rebase");
    }

    function testSharedLiquidationAfterRebaseOak1() external {
        prank(getAddr(0));

        uint256 crBefore = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETH.addr);
        amountDebtBefore.clg("amount-debt-before");

        // rebase up 2x and adjust price accordingly
        _setETHPrice(1000);
        krETH.krAsset.rebase(2e18, true, new address[](0));

        // 1000 KISS -> 0.96 ETH
        call(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETH.addr, 1000e18, 0, rsPrices);

        // previous debt amount 0.48 ETH, doubled after rebase so 0.96 ETH
        uint256 amountDebtAfter = kresko.getDebtSCDP(krETH.addr);
        amountDebtAfter.eq(0.96e18 + (0.48e18 * 2), "amount-debt-after");

        // matches $1000 ETH valuation
        uint256 valueDebtAfter = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, true, rsPrices);
        valueDebtAfter.eq(1920e8, "value-debt-after");

        // make it liquidatable
        _setETHPrice(20000);
        uint256 crAfter = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        crAfter.lt(deployCfg.scdpLt); // cr-after: 112.65%

        // this fails without the fix as normalized debt amount is 0.96 krETH
        // vm.expectRevert();
        _liquidate(krETH.addr, 0.96e18 + 1, address(kiss));
    }

    function testVaultDoubleFeesOak4() external {
        VaultAsset memory usdtConfig = vkiss.assets(address(USDT));
        USDT.balanceOf(vkiss.getConfig().feeRecipient).eq(0);

        uint256 depositAmount = 1000e6;
        uint256 actualWithdrawAmount = depositAmount.percentMul(1e4 - usdtConfig.depositFee) / 2;
        uint256 expectedOut = actualWithdrawAmount.percentMul(1e4 - usdtConfig.withdrawFee);
        expectedOut.clg("expected-usdt-out");

        // user setup
        address user = getAddr(20);
        prank(user);
        mockUSDT.mock.mint(user, depositAmount);
        mockUSDT.mock.approve(address(vkiss), depositAmount);
        vkiss.deposit(address(USDT), depositAmount, user);
        uint256 halfShares = vkiss.balanceOf(user) / 2;

        // other user setup
        address otherUser = getAddr(0);
        prank(otherUser);
        USDT.transfer(address(0), USDT.balanceOf(otherUser));

        // other user withdraws half of USDT available
        kiss.vaultRedeem(address(USDT), halfShares, otherUser, otherUser);
        uint256 otherBal = USDT.balanceOf(otherUser);
        otherBal.eq(expectedOut, "other-user-usdt-bal-after-redeem");

        // user withdraws all shares, resulting in partial withdrawal
        prank(user);
        vkiss.redeem(address(USDT), vkiss.balanceOf(user), user, user);

        /// @dev before fix, 400 USDT is received while 405 USDT is expected
        /// @dev USDT.balanceOf(user).lt(expectedOut, "user-usdt-bal-after-lt");
        USDT.balanceOf(user).eq(expectedOut, "user-usdt-bal-after-redeem");
        vkiss.balanceOf(user).eq(halfShares, "user-vkiss-bal-after-redeem");

        otherBal.eq(USDT.balanceOf(user));
        USDT.balanceOf(vkiss.getConfig().feeRecipient).eq(
            depositAmount - (expectedOut * 2),
            "vkiss-usdt-bal-fee-recipient-after-withdraw"
        );
    }

    function testLiquidityIndexAfterLiquidationOak6Oak7() external {
        prank(getAddr(0));

        uint256 crBefore = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        uint256 amountDebtBefore = kresko.getDebtSCDP(krETH.addr);
        amountDebtBefore.clg("amount-debt-before");

        _trades(50);
        Asset memory asset = kresko.getAsset(address(kiss));
        asset.liquidityIndexSCDP.clg("liquidity-index-before");
        // 1000792080016003200640128026
        // 1039600080016003200640128026

        // // rebase up 2x and adjust price accordingly
        // _setETHPrice(1000);
        // krETH.krAsset.rebase(2e18, true, new address[](0));

        // // 1000 KISS -> 0.96 ETH
        // call(kresko.swapSCDP.selector, getAddr(0), address(kiss), krETH.addr, 1000e18, 0, rsPrices);

        // // previous debt amount 0.48 ETH, doubled after rebase so 0.96 ETH
        // uint256 amountDebtAfter = kresko.getDebtSCDP(krETH.addr);
        // amountDebtAfter.eq(0.96e18 + (0.48e18 * 2), "amount-debt-after");

        // // matches $1000 ETH valuation
        // uint256 valueDebtAfter = staticCall(kresko.getDebtValueSCDP.selector, krETH.addr, true, rsPrices);
        // valueDebtAfter.eq(1920e8, "value-debt-after");

        // // make it liquidatable
        // _setETHPrice(20000);
        // uint256 crAfter = staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices);
        // crAfter.lt(deployCfg.scdpLt); // cr-after: 112.65%

        // // this fails without the fix as normalized debt amount is 0.96 krETH
        // // vm.expectRevert();
        // _liquidate(krETH.addr, 0.96e18 + 1, address(kiss));
    }

    /* -------------------------------- Util -------------------------------- */

    function _trades(uint256 count) internal {
        address trader = getAddr(777);
        prank(deployCfg.admin);
        uint256 mintAmount = 20000e18;

        kresko.setFeeAssetSCDP(address(kiss));
        mockUSDC.mock.mint(trader, mintAmount * count);

        prank(trader);
        mockUSDC.mock.approve(address(kiss), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        krETH.asToken.approve(address(kresko), type(uint256).max);
        (uint256 tradeAmount, ) = kiss.vaultDeposit(address(USDC), mintAmount * count, trader);

        for (uint256 i = 0; i < count; i++) {
            call(kresko.swapSCDP.selector, trader, address(kiss), krETH.addr, tradeAmount / count, 0, rsPrices);
            call(kresko.swapSCDP.selector, trader, krETH.addr, address(kiss), krETH.asToken.balanceOf(trader), 0, rsPrices);
        }
    }

    function _liquidate(
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset
    ) internal returns (uint256 crAfter, uint256 debtValAfter, uint256 debtAmountAfter) {
        (bool success, bytes memory returndata) = address(kresko).call(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.liquidateSCDP.selector, _repayAsset, _repayAmount, _seizeAsset),
                redstoneCallData
            )
        );
        if (!success) _revert(returndata);
        return (
            staticCall(kresko.getCollateralRatioSCDP.selector, rsPrices),
            staticCall(kresko.getDebtValueSCDP.selector, _repayAsset, true, rsPrices),
            kresko.getDebtSCDP(_repayAsset)
        );
    }

    function _previewSwap(
        address _assetIn,
        address _assetOut,
        uint256 _amountIn,
        uint256 _minAmountOut
    ) internal view returns (uint256 amountOut_) {
        (bool success, bytes memory returndata) = address(kresko).staticcall(
            abi.encodePacked(
                abi.encodeWithSelector(kresko.previewSwapSCDP.selector, _assetIn, _assetOut, _amountIn, _minAmountOut),
                redstoneCallData
            )
        );
        if (!success) _revert(returndata);
        amountOut_ = abi.decode(returndata, (uint256));
    }

    function _setETHPrice(uint256 _pushPrice) internal returns (string memory) {
        mockFeedETH.setPrice(_pushPrice * 1e8);
        price_eth_rs = ("ETH:").and(_pushPrice.str()).and(":8");
        _updateRsPrices();
    }

    function _getPrice(address _asset) internal view returns (uint256 price_) {
        (bool success, bytes memory returndata) = address(kresko).staticcall(
            abi.encodePacked(abi.encodeWithSelector(kresko.getPrice.selector, _asset), redstoneCallData)
        );
        require(success, "getPrice-failed");
        price_ = abi.decode(returndata, (uint256));
    }

    function _updateRsPrices() internal {
        rsPrices = createPriceString();
        redstoneCallData = getRedstonePayload(rsPrices);
    }
}
