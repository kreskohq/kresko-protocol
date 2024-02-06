// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// solhint-disable no-console, state-visibility, var-name-mixedcase, avoid-low-level-calls, max-states-count

import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Log, Help} from "kresko-lib/utils/Libs.s.sol";
import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {WadRay} from "libs/WadRay.sol";
import {Asset} from "common/Types.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {MockOracle} from "mocks/MockOracle.sol";
import {Enums} from "common/Constants.sol";
import {SCDPLiquidationArgs, SCDPWithdrawArgs, SwapArgs} from "common/Args.sol";
import {getPythData} from "vendor/pyth/PythScript.sol";

contract SCDPTest is Tested, Deploy {
    using ShortAssert for *;
    using Log for *;
    using Help for *;
    using WadRay for uint256;
    using PercentageMath for uint256;
    using Deployed for *;

    MockERC20 usdc;
    IKreskoAsset krETH;
    IKreskoAsset krJPY;
    IKreskoAsset krTSLA;
    Asset krETHConfig;
    Asset kissConfig;
    uint256 fee_KISS_krETH;
    uint256 fee_krETH_KISS;

    address admin;
    address deployer;
    address feeRecipient;
    address liquidator;

    address krETHAddr;
    address kissAddr;

    function setUp() public mnemonic("MNEMONIC_DEVNET") users(getAddr(11), getAddr(22), getAddr(33)) {
        JSON.Config memory json = Deploy.deployTest("MNEMONIC_DEVNET", "test-clean", 0);

        // for price updates
        vm.deal(address(kresko), 1 ether);

        deployer = getAddr(0);
        admin = json.params.common.admin;
        feeRecipient = json.params.common.treasury;
        liquidator = getAddr(777);

        krETHAddr = ("krETH").cached();
        kissAddr = address(kiss);
        usdc = MockERC20(("USDC").cached());
        krETH = IKreskoAsset(krETHAddr);
        krJPY = IKreskoAsset(("krJPY").cached());
        krTSLA = IKreskoAsset(("krTSLA").cached());
        krETHConfig = ("krETH").cachedAsset();
        kissConfig = ("KISS").cachedAsset();
        fee_KISS_krETH = kissConfig.swapInFeeSCDP + krETHConfig.swapOutFeeSCDP;
        fee_krETH_KISS = krETHConfig.swapInFeeSCDP + kissConfig.swapOutFeeSCDP;

        _approvals(getAddr(0));
        _approvals(user0);
        _approvals(user1);
        _approvals(user2);
        _approvals(liquidator);

        usdc.mint(user0, 1000e6);
        prank(getAddr(0));
        kiss.transfer(user0, 2000e18);
    }

    modifier withDeposits() {
        _poolDeposit(deployer, address(usdc), 10000e6);
        _poolDeposit(deployer, address(kiss), 10000e18);
        _;
    }

    function testSCDPSetup() public {
        kresko.getEffectiveSDIDebt().eq(0, "debt should be 0");
        kresko.totalSDI().eq(0, "total supply should be 0");
        kresko.getAssetIndexesSCDP(address(usdc)).currFeeIndex.eq(1e27);
        kresko.getAssetIndexesSCDP(address(usdc)).currFeeIndex.eq(1e27);
        kresko.getAssetIndexesSCDP(address(kiss)).currLiqIndex.eq(1e27);
        kresko.getAssetIndexesSCDP(address(kiss)).currLiqIndex.eq(1e27);
        kissConfig.isCoverAsset.eq(true);
    }

    function testSCDPDeposit() public {
        _poolDeposit(user0, address(usdc), 1000e6);
        usdc.balanceOf(user0).eq(0, "usdc balance should be 0");
        usdc.balanceOf(address(kresko)).eq(1000e6, "usdc-bal-kresko");

        kresko.totalSDI().eq(0, "total supply should be 0");
        kresko.getTotalCollateralValueSCDP(true).eq(1000e8, "collateral value should be 1000");
    }

    function testDepositModified() public pranked(user0) {
        _poolDeposit(deployer, address(kiss), 10000e18);
        _swap(user0, address(kiss), 1000e18, address(krETH));

        _setETHPrice(18000e8);
        _liquidate(address(krETH), 0.1e18, address(kiss));

        uint256 depositsBefore = kresko.getAccountDepositSCDP(deployer, address(kiss));
        _poolDeposit(deployer, address(kiss), 1000e18);
        kresko.getAccountDepositSCDP(deployer, address(kiss)).eq(depositsBefore + 1000e18, "depositsAfter");

        _liquidate(address(krETH), 0.1e18, address(kiss));

        uint256 depositsAfter2 = kresko.getAccountDepositSCDP(deployer, address(kiss));
        _poolDeposit(deployer, address(kiss), 1000e18);
        kresko.getAccountDepositSCDP(deployer, address(kiss)).eq(depositsAfter2 + 1000e18, "depositsAfter2");

        _setETHPrice(2000e8);
        _poolWithdraw(deployer, address(kiss), 1000e18);
        kresko.getAccountDepositSCDP(deployer, address(kiss)).eq(depositsAfter2, "withdrawAfter");

        _poolDeposit(deployer, address(kiss), 1000e18);
        kresko.getAccountDepositSCDP(deployer, address(kiss)).eq(depositsAfter2 + 1000e18, "depositsAfter3");

        _setETHPrice(25000e8);
        _liquidate(address(krETH), 0.1e18, address(kiss));

        uint256 depositsAfter3 = kresko.getAccountDepositSCDP(deployer, address(kiss));
        _setETHPrice(2000e8);
        _poolWithdraw(deployer, address(kiss), 1000e18);
        kresko.getAccountDepositSCDP(deployer, address(kiss)).eq(depositsAfter3 - 1000e18, "withdrawAfter2");

        _poolDeposit(deployer, address(kiss), 1000e18);
        kresko.getAccountDepositSCDP(deployer, address(kiss)).eq(depositsAfter3, "depositsAfter4");

        _poolDeposit(user0, address(kiss), 500e18);
        kresko.getAccountDepositSCDP(user0, address(kiss)).eq(500e18, "depositsAfter5");
        kiss.balanceOf(user0).eq(500e18, "kiss balance should be 500");

        _poolWithdraw(user0, address(kiss), 500e18);
        kresko.getAccountDepositSCDP(user0, address(kiss)).eq(0, "depositsAfter6");
        kiss.balanceOf(user0).eq(1000e18, "kiss balance should be 1000");

        _poolDeposit(user0, address(kiss), 500e18);
        kresko.getAccountDepositSCDP(user0, address(kiss)).eq(500e18, "depositsAfter7");

        _setETHPrice(25000e8);
        _liquidate(address(krETH), 0.05e18, address(kiss));

        uint256 depositAfter4 = kresko.getAccountDepositSCDP(user0, address(kiss));
        _poolDeposit(user0, address(kiss), 100e18);
        kresko.getAccountDepositSCDP(user0, address(kiss)).eq(depositAfter4 + 100e18, "depositsAfter8");

        _setETHPrice(2000e8);
        _poolWithdraw(user0, address(kiss), depositAfter4 + 100e18);
        kresko.getAccountDepositSCDP(user0, address(kiss)).eq(0, "depositsAfter9");
    }

    function testSCDPWithdraw() public {
        _poolDeposit(user0, address(usdc), 1000e6);
        _poolWithdraw(user0, address(usdc), 1000e6);
        kresko.getTotalCollateralValueSCDP(true).eq(0, "collateral value should be 0");
        usdc.balanceOf(user0).eq(1000e6, "usdc balance should be 1000");
        usdc.balanceOf(address(kresko)).eq(0, "usdc balance should be 0");
    }

    function testSCDPSwap() public withDeposits pranked(user0) {
        _poolDeposit(user0, address(kiss), 1000e18);

        kresko.getSwapDepositsSCDP(address(kiss)).eq(0, "swap deposits should be 0");
        uint256 kissBalBefore = kiss.balanceOf(address(kresko));
        (uint256 amountOut, uint256 feesDistributed, uint256 feesToProtocol) = kresko.previewSwapSCDP(
            address(kiss),
            address(krETH),
            1000e18
        );
        _swap(user0, address(kiss), 1000e18, address(krETH));

        kresko.getDebtSCDP(address(krETH)).eq(amountOut, "debt should be amountOut");
        uint256 swapDeposits = (1000e18) - (1000e18).pctMul(fee_KISS_krETH);
        kresko.getSwapDepositsSCDP(address(kiss)).eq(swapDeposits, "swap deposits");
        krETH.balanceOf(user0).eq(amountOut, "amountOut");

        uint256 totalFees = feesDistributed + feesToProtocol;
        totalFees.gt(0, "totalFees should be > 0");

        uint256 protocolFeePct = kissConfig.protocolFeeShareSCDP + krETHConfig.protocolFeeShareSCDP;
        feesToProtocol.eq(totalFees.pctMul(protocolFeePct), "feesToProtocol");
        feesDistributed.eq(totalFees.pctMul(1e4 - protocolFeePct), "feesDistributed");

        kiss.balanceOf(feeRecipient).eq(feesToProtocol, "kiss feeRecipient");

        feesDistributed.gt(0, "feesDistributed should be > 0");
        (kiss.balanceOf(address(kresko)) - swapDeposits - kissBalBefore).eq(feesDistributed, "kiss feesDistributed");
    }

    function testSCDPSwapFees() public {
        prank(deployer);
        kiss.transfer(user0, 4000e18);
        kiss.transfer(user1, 20000e18);

        _poolDeposit(deployer, address(kiss), 5000e18);
        (, uint256 feesDistributed, ) = kresko.previewSwapSCDP(address(kiss), address(krETH), 1000e18);

        _swap(user0, address(kiss), 1000e18, address(krETH));

        uint256 fees = kresko.getAccountFeesSCDP(deployer, address(kiss));
        fees.eq(feesDistributed, "feesDistributed-1");

        _poolDeposit(deployer, address(kiss), 5000e18);
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(0, "feesDistributed");

        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed2");

        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed * 2, "feesDistributed3");

        uint256 fees3 = feesDistributed * 3;
        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(fees3, "feesDistributed4");

        _poolWithdraw(deployer, address(kiss), 1000e18);
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(0, "feesDistributed5");

        _poolDeposit(user1, address(kiss), 9000e18);
        _swap(user0, address(kiss), 1000e18, address(krETH));

        uint256 halfFees = feesDistributed / 2;
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(halfFees, "feesDistributed6");
        kresko.getAccountFeesSCDP(user1, address(kiss)).eq(halfFees, "feesDistributed7");

        _swap(user0, address(kiss), 1000e18, address(krETH));

        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed8");
        kresko.getAccountFeesSCDP(user1, address(kiss)).eq(feesDistributed, "feesDistributed9");
    }

    function testSCDPSwapFeesLiq() public {
        prank(deployer);
        kiss.transfer(user0, 5000e18);
        kiss.transfer(user1, 20000e18);

        _poolDeposit(deployer, address(kiss), 5000e18);
        (, uint256 feesDistributed, ) = kresko.previewSwapSCDP(address(kiss), address(krETH), 1000e18);

        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed-1");

        _poolDeposit(deployer, address(kiss), 5000e18);
        _setETHPrice(18000e8);
        _liquidate(address(krETH), 0.1e18, address(kiss));

        uint256 fees = kresko.getAccountFeesSCDP(deployer, address(kiss));
        fees.eq(0, "feesDistributed");

        _setETHPrice(2000e8);
        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed2");

        _poolDeposit(deployer, address(kiss), 10000e18);
        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed3");

        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed * 2, "feesDistributed4");

        uint256 fees3 = feesDistributed * 3;
        _swap(user0, address(kiss), 1000e18, address(krETH));
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(fees3, "feesDistributed5");

        _setETHPrice(18000e8);
        _liquidate(address(krETH), 0.1e18, address(kiss));

        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(fees3, "feesDistributed5");

        _setETHPrice(2000e8);
        _poolWithdraw(deployer, address(kiss), 1000e18);
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(0, "feesDistributed5");

        _poolDeposit(deployer, address(kiss), 20000e18 - kresko.getAccountDepositSCDP(deployer, address(kiss)));
        _poolDeposit(user1, address(kiss), 20000e18);

        _swap(user0, address(kiss), 1000e18, address(krETH));
        uint256 halfFees = feesDistributed / 2;
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(halfFees, "feesDistributed6");
        kresko.getAccountFeesSCDP(user1, address(kiss)).eq(halfFees, "feesDistributed7");

        _swap(user0, address(kiss), 1000e18, address(krETH));

        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed8");
        kresko.getAccountFeesSCDP(user1, address(kiss)).eq(feesDistributed, "feesDistributed9");
    }

    function testClaimFeeGas() public {
        prank(deployer);
        _poolDeposit(deployer, address(kiss), 50000e18);
        _swapAndLiquidate(75, 1000e18, 0.01e18);

        uint256 fees = kresko.getAccountFeesSCDP(deployer, address(kiss));
        uint256 kissBalBefore = kiss.balanceOf(deployer);
        uint256 checkpoint = gasleft();
        kresko.claimFeesSCDP(deployer, address(kiss), deployer);
        uint256 used = checkpoint - gasleft();
        used.gt(50000, "gas-used-gt"); // warm
        used.lt(150000, "gas-used-lt");

        (kiss.balanceOf(deployer) - kissBalBefore).eq(fees, "received-fees");
    }

    function testClaimFeeGasNoSwaps() public {
        prank(deployer);
        _poolDeposit(deployer, address(kiss), 50000e18);
        (, uint256 feesDistributed, ) = kresko.previewSwapSCDP(address(kiss), address(krETH), 1000e18);

        kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, 1000e18, 0, updateData));
        _liquidate(75, 1000e18, 0.01e18);

        uint256 kissBalBefore = kiss.balanceOf(deployer);
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(feesDistributed, "feesDistributed");
        uint256 checkpoint = gasleft();
        kresko.claimFeesSCDP(deployer, address(kiss), deployer);
        uint256 used = checkpoint - gasleft();
        used.gt(50000, "gas-used-gt"); // warm
        used.lt(150000, "gas-used-lt");
        (kiss.balanceOf(deployer) - kissBalBefore).eq(feesDistributed, "received-fees");
    }

    function testEmergencyWithdraw() public {
        prank(deployer);

        _poolDeposit(deployer, address(kiss), 50000e18);
        _swapAndLiquidate(75, 1000e18, 0.01e18);

        uint256 fees = kresko.getAccountFeesSCDP(deployer, address(kiss));
        fees.gt(0, "fees");
        uint256 kissBalBefore = kiss.balanceOf(deployer);
        kresko.emergencyWithdrawSCDP(SCDPWithdrawArgs(deployer, address(kiss), 1000e18, deployer), updateData);

        (kiss.balanceOf(deployer) - kissBalBefore).eq(1000e18, "received-withdraw");
        kresko.getAccountFeesSCDP(deployer, address(kiss)).eq(0, "fees-after");
    }

    function testSCDPGas() public withDeposits pranked(user0) {
        bool success;
        uint256 amount = 1000e18;

        bytes memory depositData = abi.encodeWithSelector(kresko.depositSCDP.selector, user0, address(kiss), amount);

        uint256 gasDeposit = gasleft();
        (success, ) = address(kresko).call(depositData);
        (gasDeposit - gasleft()).clg("gasPoolDeposit");
        require(success, "!success pool deposit");

        bytes memory withdrawData = abi.encodeWithSelector(
            kresko.withdrawSCDP.selector,
            SCDPWithdrawArgs(user0, address(kiss), amount, user0),
            updateData
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        (gasWithdraw - gasleft()).clg("gasPoolWithdraw");

        require(success, "!success pool withdraw");

        (success, ) = address(kresko).call(depositData);

        bytes memory swapData = abi.encodeWithSelector(
            kresko.swapSCDP.selector,
            SwapArgs(user0, address(kiss), address(krETH), amount, 0, updateData)
        );
        uint256 gasSwap = gasleft();
        (success, ) = address(kresko).call(swapData);
        (gasSwap - gasleft()).clg("gasPoolSwap");

        require(success, "!success pool swap 1");

        bytes memory swapData2 = abi.encodeWithSelector(
            kresko.swapSCDP.selector,
            SwapArgs(user0, address(krETH), address(kiss), krETH.balanceOf(user0), 0, updateData)
        );

        uint256 gasSwap2 = gasleft();
        (success, ) = address(kresko).call(swapData2);
        (gasSwap2 - gasleft()).clg("gasPoolSwap2");

        require(success, "!success pool swap 2");

        bytes memory swapData3 = abi.encodeWithSelector(
            kresko.swapSCDP.selector,
            SwapArgs(user0, address(kiss), address(krETH), kiss.balanceOf(user0), 0, updateData)
        );
        uint256 gasSwap3 = gasleft();
        (success, ) = address(kresko).call(swapData3);
        (gasSwap3 - gasleft()).clg("gasPoolSwap3");
    }

    /* -------------------------------------------------------------------------- */
    /*                                   helpers                                  */
    /* -------------------------------------------------------------------------- */

    function _liquidate(uint256 times, uint256, uint256 liquidateAmount) internal repranked(getAddr(0)) {
        for (uint256 i; i < times; i++) {
            _setETHPrice(uint256(90000e8));
            if (i > 40) {
                liquidateAmount = liquidateAmount.percentMul(0.50e4);
            }
            _liquidate(krETHAddr, liquidateAmount.percentMul(1e4 - (100 * i)), address(kiss));
            _setETHPrice(uint256(2000e8));
        }
    }

    function _swapAndLiquidate(uint256 times, uint256 swapAmount, uint256 liquidateAmount) internal repranked(getAddr(0)) {
        for (uint256 i; i < times; i++) {
            _setETHPrice(uint256(2000e8));
            (uint256 amountOut, , ) = kresko.previewSwapSCDP(address(kiss), address(krETH), swapAmount);
            kresko.swapSCDP(SwapArgs(getAddr(0), address(kiss), krETHAddr, swapAmount, 0, updateData));
            _setETHPrice(uint256(90000e8));
            if (i > 40) {
                liquidateAmount = liquidateAmount.percentMul(0.50e4);
            }
            _liquidate(krETHAddr, liquidateAmount.percentMul(1e4 - (100 * i)), address(kiss));
            _setETHPrice(uint256(2000e8));
            kresko.swapSCDP(SwapArgs(getAddr(0), krETHAddr, address(kiss), amountOut, 0, updateData));
        }
    }

    function _poolDeposit(address user, address asset, uint256 amount) internal repranked(user) {
        prank(admin);
        kresko.setFeeAssetSCDP(asset);
        prank(user);
        kresko.depositSCDP(user, asset, amount);
        prank(admin);
        kresko.setFeeAssetSCDP(address(kiss));
    }

    function _poolWithdraw(address user, address asset, uint256 amount) internal repranked(user) {
        kresko.withdrawSCDP(SCDPWithdrawArgs(user, asset, amount, user), updateData);
    }

    function _swap(address user, address assetIn, uint256 amount, address assetOut) internal repranked(user) {
        kresko.swapSCDP(SwapArgs(user, assetIn, assetOut, amount, 0, updateData));
    }

    function _liquidate(
        address _repayAsset,
        uint256 _repayAmount,
        address _seizeAsset
    ) internal repranked(liquidator) returns (uint256 crAfter, uint256 debtValAfter, uint256 debtAmountAfter) {
        kresko.liquidateSCDP(SCDPLiquidationArgs(_repayAsset, _repayAmount, _seizeAsset), updateData);
        return (kresko.getCollateralRatioSCDP(), kresko.getDebtValueSCDP(_repayAsset, true), kresko.getDebtSCDP(_repayAsset));
    }

    function _approvals(address user) internal pranked(user) {
        usdc.approve(address(kresko), type(uint256).max);
        krETH.approve(address(kresko), type(uint256).max);
        kiss.approve(address(kresko), type(uint256).max);
        krJPY.approve(address(kresko), type(uint256).max);
    }

    function _printInfo(string memory prefix) internal {
        prefix = prefix.and(" | ");
        prefix.and("*****************").clg();
        uint256 sdiPrice = kresko.getSDIPrice();
        uint256 sdiTotalSupply = kresko.totalSDI();
        uint256 totalCover = kresko.getSDICoverAmount();
        uint256 collateralUSD = kresko.getTotalCollateralValueSCDP(false);
        uint256 debtUSD = kresko.getTotalDebtValueSCDP(false);

        uint256 effectiveDebt = kresko.getEffectiveSDIDebt();
        uint256 effectiveDebtValue = kresko.getEffectiveSDIDebtUSD();

        sdiPrice.dlg(prefix.and("SDI Price"));
        sdiTotalSupply.dlg(prefix.and("SDI totalSupply"));
        kresko.getTotalSDIDebt().dlg(prefix.and("SCDP SDI Debt Amount"));
        totalCover.dlg(prefix.and("SCDP SDI Cover Amount"));
        effectiveDebt.dlg(prefix.and("SCDP Effective SDI Debt Amount"));

        collateralUSD.dlg(prefix.and("SCDP Collateral USD"), 8);
        debtUSD.dlg(prefix.and("SCDP KrAsset Debt USD"), 8);
        effectiveDebtValue.dlg(prefix.and("SCDP SDI Debt USD"), 8);
        totalCover.mulWad(sdiPrice).dlg(prefix.and("SCDP SDI Cover USD"));

        kresko.getCollateralRatioSCDP().pct(prefix.and("SCDP CR %"));
    }

    function _setETHPrice(uint256 price) internal repranked(admin) {
        MockOracle(kresko.getOracleOfTicker(bytes32("ETH"), Enums.OracleType.Chainlink).feed).setPrice(price);
        JSON.Config memory cfg = JSON.getConfig("test", "test-clean");
        for (uint256 i = 0; i < cfg.assets.tickers.length; i++) {
            if (cfg.assets.tickers[i].ticker.equals("ETH")) {
                cfg.assets.tickers[i].mockPrice = price;
            }
        }
        updateData = getPythData(cfg);
        pythEp.updatePriceFeeds(updateData);
    }
}
