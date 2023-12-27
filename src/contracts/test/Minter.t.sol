// solhint-disable state-visibility, max-states-count, var-name-mixedcase, no-global-import, const-name-snakecase, no-empty-blocks, no-console
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Tested} from "kresko-lib/utils/Tested.t.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.t.sol";
import {Strings} from "libs/Strings.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Asset} from "common/Types.sol";
import {Log} from "kresko-lib/utils/Libs.s.sol";
import {Deploy} from "scripts/deploy/Deploy.s.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {JSON} from "scripts/deploy/libs/LibDeployConfig.s.sol";
import {Deployed} from "scripts/deploy/libs/Deployed.s.sol";
import {getConfig} from "scripts/deploy/libs/JSON.s.sol";

string constant CONFIG_ID = "test-clean";

// solhint-disable
contract MinterTest is Tested, Deploy {
    using ShortAssert for *;
    using Log for *;
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

    string internal usdcPrice = "USDC:1:8";
    string internal ethPrice = "ETH:2000:8";

    function setUp() public mnemonic("MNEMONIC_DEVNET") users(address(111), address(222), address(333)) {
        JSON.Config memory json = Deploy.deployTest("MNEMONIC_DEVNET", CONFIG_ID, 0);
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
        JSON.Config memory json = getConfig("test", CONFIG_ID);

        kresko.owner().eq(json.params.common.admin);
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

        rsStatic(kresko.getAccountTotalCollateralValue.selector, user0).eq(100e8, "total-collateral-value");
    }

    function testMinterMint() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        rsCall(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, user0);
        rsStatic(kresko.getAccountTotalCollateralValue.selector, user0).eq(1000e8);
        rsStatic(kresko.getAccountTotalDebtValue.selector, user0).eq(67.67e8);
    }

    function testMinterBurn() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        rsCall(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, user0);

        uint256 feeValue = _getValue(address(krJPY), mintAmount.percentMul(krJPYConfig.closeFee));

        rsCall(kresko.burnKreskoAsset.selector, user0, address(krJPY), mintAmount, 0, user0);

        rsStatic(kresko.getAccountTotalCollateralValue.selector, user0).eq(1000e8 - feeValue);
        rsStatic(kresko.getAccountTotalDebtValue.selector, user0).eq(0);
    }

    function testMinterWithdraw() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        kresko.depositCollateral(user0, address(usdc), depositAmount);
        kresko.getAccountCollateralAmount(user0, address(usdc)).eq(depositAmount);

        rsCall(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, user0);
        rsCall(kresko.burnKreskoAsset.selector, user0, address(krJPY), mintAmount, 0, user0);

        rsCall(kresko.withdrawCollateral.selector, user0, address(usdc), type(uint256).max, 0, user0);

        rsStatic(kresko.getAccountTotalCollateralValue.selector, user0).eq(0);
        rsStatic(kresko.getAccountTotalDebtValue.selector, user0).eq(0);
    }

    function testMinterGas() public pranked(user0) {
        uint256 depositAmount = 1000e6;
        uint256 mintAmount = 10000e18;
        bool success;

        usdc.mint(user0, depositAmount);
        usdc.approve(address(kresko), depositAmount);

        uint256 gasDeposit = gasleft();
        kresko.depositCollateral(user0, address(usdc), depositAmount);
        Log.clg("gasDepositCollateral", gasDeposit - gasleft());

        bytes memory mintData = abi.encodePacked(
            abi.encodeWithSelector(kresko.mintKreskoAsset.selector, user0, address(krJPY), mintAmount, user0),
            rsPayload
        );
        uint256 gasMint = gasleft();
        (success, ) = address(kresko).call(mintData);
        Log.clg("gasMintKreskoAsset", gasMint - gasleft());
        require(success, "!success");

        bytes memory burnData = abi.encodePacked(
            abi.encodeWithSelector(kresko.burnKreskoAsset.selector, user0, address(krJPY), mintAmount, 0, user0),
            rsPayload
        );
        uint256 gasBurn = gasleft();
        (success, ) = address(kresko).call(burnData);
        Log.clg("gasBurnKreskoAsset", gasBurn - gasleft());
        require(success, "!success");

        bytes memory withdrawData = abi.encodePacked(
            abi.encodeWithSelector(kresko.withdrawCollateral.selector, user0, address(usdc), 998e18, 0, user0),
            rsPayload
        );
        uint256 gasWithdraw = gasleft();
        (success, ) = address(kresko).call(withdrawData);
        Log.clg("gasWithdrawCollateral", gasWithdraw - gasleft());
        require(success, "!success");
    }

    function _getValue(address _asset, uint256 amount) private view returns (uint256) {
        bytes memory result = rsStatic(_rsKresko, abi.encodeWithSelector(kresko.getValue.selector, _asset, amount));
        return abi.decode(result, (uint256));
    }
}
