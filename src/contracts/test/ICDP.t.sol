// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/s/Tested.t.sol";
import {ShortAssert} from "kresko-lib/utils/s/ShortAssert.t.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Asset} from "common/Types.sol";
import {PLog} from "kresko-lib/utils/s/PLog.s.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import "scripts/deploy/JSON.s.sol" as JSON;
import {BurnArgs, MintArgs, WithdrawArgs} from "common/Args.sol";

string constant CONFIG_ID = "test-clean";

// solhint-disable
contract ICDPTest is Tested, Deploy {
    using ShortAssert for *;
    using PLog for *;
    using Strings for uint256;
    using PercentageMath for *;
    using Deployed for *;

    address admin;
    MockERC20 usdc;
    IKreskoAsset krETH;
    IKreskoAsset krJPY;
    IKreskoAsset krTSLA;

    Asset usdcConfig;
    Asset krJPYConfig;
    Asset krETHConfig;

    function setUp() public mnemonic("MNEMONIC_DEVNET") users(address(111), address(222), address(333)) {
        JSON.Config memory json = Deploy.deployTest("MNEMONIC_DEVNET", CONFIG_ID, 0);

        // for price updates
        vm.deal(address(kresko), 1 ether);

        admin = json.params.common.admin;
        usdc = MockERC20(("USDC").cached());
        krETH = IKreskoAsset(("krETH").cached());
        krJPY = IKreskoAsset(("krJPY").cached());
        krTSLA = IKreskoAsset(("krTSLA").cached());
        usdcConfig = kresko.getAsset(address(usdc));
        krETHConfig = kresko.getAsset(address(krETH));
        krJPYConfig = kresko.getAsset(address(krJPY));
    }

    function testMinterSetup() public {
        JSON.Config memory json = JSON.getConfig("test", CONFIG_ID);

        kresko.owner().eq(getAddr(0));
        kresko.getMinCollateralRatioMinter().eq(json.params.minter.minCollateralRatio, "minter-min-collateral-ratio");
        kresko.getParametersSCDP().minCollateralRatio.eq(json.params.scdp.minCollateralRatio, "scdp-min-collateral-ratio");
        kresko.getParametersSCDP().liquidationThreshold.eq(json.params.scdp.liquidationThreshold, "scdp-liquidation-threshold");
        usdcConfig.isSharedOrSwappedCollateral.eq(true, "usdc-issharedorswappedcollateral");
        usdcConfig.isSharedCollateral.eq(true, "usdc-issharedcollateral");

        usdcConfig.decimals.eq(usdc.decimals(), "usdc-decimals");
        usdcConfig.depositLimitSCDP.eq(100000000e18, "usdc-deposit-limit");
        kresko.getAssetIndexesSCDP(address(usdc)).currFeeIndex.eq(1e27, "usdc-fee-index");
        kresko.getAssetIndexesSCDP(address(usdc)).currLiqIndex.eq(1e27, "usdc-liq-index");

        krETHConfig.isMinterMintable.eq(true, "kreth-is-minter-mintable");
        krETHConfig.isSwapMintable.eq(true, "kreth-is-swap-mintable");
        krETHConfig.liqIncentiveSCDP.eq(103.5e2, "kreth-liquidation-incentive");
        krETHConfig.openFee.eq(0, "kreth-open-fee");
        krETHConfig.closeFee.eq(50, "kreth-close-fee");
        krETHConfig.maxDebtMinter.eq(type(uint128).max, "kreth-max-debt-minter");
        krETHConfig.protocolFeeShareSCDP.eq(20e2, "kreth-protocol-fee-share");
    }

    function testMinterDeposit() public pranked(user0) {
        uint256 depositAmount = 100e6;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        kresko.getAccountTotalCollateralValue(user0).eq(100e8, "total-collateral-value");
    }

    function testMinterMint() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        kresko.mintKreskoAsset(MintArgs(user0, address(krJPY), mintAmount, user0), updateData);
        kresko.getAccountTotalCollateralValue(user0).eq(1000e8);
        kresko.getAccountTotalDebtValue(user0).eq(67.67e8);
    }

    function testMinterBurn() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        kresko.mintKreskoAsset(MintArgs(user0, address(krJPY), mintAmount, user0), updateData);

        uint256 feeValue = kresko.getValue(address(krJPY), mintAmount.percentMul(krJPYConfig.closeFee));

        kresko.burnKreskoAsset(BurnArgs(user0, address(krJPY), mintAmount, 0, user0), updateData);

        kresko.getAccountTotalCollateralValue(user0).eq(1000e8 - feeValue);
        kresko.getAccountTotalDebtValue(user0).eq(0);
    }

    function testMinterWithdraw() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        kresko.mintKreskoAsset(MintArgs(user0, address(krJPY), mintAmount, user0), updateData);
        kresko.burnKreskoAsset(BurnArgs(user0, address(krJPY), mintAmount, 0, user0), updateData);

        kresko.withdrawCollateral(WithdrawArgs(user0, address(usdc), type(uint256).max, 0, user0), updateData);

        kresko.getAccountTotalCollateralValue(user0).eq(0);
        kresko.getAccountTotalDebtValue(user0).eq(0);
    }

    function testMinterGas() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;
        bool success;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        uint256 gasDeposit = gasleft();
        kresko.depositCollateral(user0, address(usdc), depositAmount);
        PLog.clg(gasDeposit - gasleft(), "gasDepositCollateral");

        bytes memory mintData = abi.encodeWithSelector(
            kresko.mintKreskoAsset.selector,
            MintArgs(user0, address(krJPY), mintAmount, user0),
            updateData
        );
        uint256 gasMint = gasleft();
        (success, ) = address(kresko).call(mintData);
        PLog.clg(gasMint - gasleft(), "gasMintKreskoAsset");
        require(success, "!success");

        bytes memory burnData = abi.encodeWithSelector(
            kresko.burnKreskoAsset.selector,
            BurnArgs(user0, address(krJPY), mintAmount, 0, user0),
            updateData
        );
        uint256 gasBurn = gasleft();
        (success, ) = address(kresko).call(burnData);
        PLog.clg(gasBurn - gasleft(), "gasBurnKreskoAsset");
        require(success, "!success");

        bytes memory withdrawData = abi.encodeWithSelector(
            kresko.withdrawCollateral.selector,
            WithdrawArgs(user0, address(usdc), 998e18, 0, user0),
            updateData
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        PLog.clg(gasWithdraw - gasleft(), "gasWithdrawCollateral");
        require(success, "!success");
    }
}
