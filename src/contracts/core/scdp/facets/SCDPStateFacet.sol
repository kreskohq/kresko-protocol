// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Percents} from "common/Constants.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {scdp, sdi} from "scdp/SState.sol";
import {PFunc} from "periphery/PFuncs.sol";

/**
 * @title SCDPStateFacet
 * @author Kresko
 * @notice  This facet is used to view the state of the scdp.
 */
contract SCDPStateFacet is ISCDPStateFacet {
    using WadRay for uint256;
    using PercentageMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                  Accounts                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountPrincipalDeposits(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountScaledDepositsSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountScaledDeposits(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositFeesGainedSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return
            scdp().accountScaledDeposits(_account, _depositAsset, cs().assets[_depositAsset]) -
            scdp().accountPrincipalDeposits(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueSCDP(address _account, address _depositAsset) external view returns (uint256) {
        Asset storage asset = cs().assets[_depositAsset];
        return asset.collateralAmountToValue(scdp().accountPrincipalDeposits(_account, _depositAsset, asset), true);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountScaledDepositValueCDP(address _account, address _depositAsset) external view returns (uint256) {
        Asset storage asset = cs().assets[_depositAsset];
        return asset.collateralAmountToValue(scdp().accountScaledDeposits(_account, _depositAsset, asset), true);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalDepositValue(_account, true);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalScaledDepositsValueSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalScaledDepositsValue(_account);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collaterals                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getDepositAssetsSCDP() external view returns (address[] memory result) {
        return PFunc.getSDepositAssets();
    }

    function getCollateralsSCDP() external view returns (address[] memory result) {
        return scdp().collaterals;
    }

    /// @inheritdoc ISCDPStateFacet
    function getDepositsSCDP(address _depositAsset) external view returns (uint256) {
        return scdp().totalDepositAmount(_depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getSwapDepositsSCDP(address _collateralAsset) external view returns (uint256) {
        return scdp().swapDepositAmount(_collateralAsset, cs().assets[_collateralAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getCollateralValueSCDP(address _depositAsset, bool _ignoreFactors) external view returns (uint256) {
        Asset storage asset = cs().assets[_depositAsset];

        return asset.collateralAmountToValue(scdp().totalDepositAmount(_depositAsset, asset), _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getTotalCollateralValueSCDP(bool _ignoreFactors) external view returns (uint256) {
        return scdp().totalCollateralValueSCDP(_ignoreFactors);
    }

    /* -------------------------------------------------------------------------- */
    /*                                KreskoAssets                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getKreskoAssetsSCDP() external view returns (address[] memory) {
        return scdp().krAssets;
    }

    /// @inheritdoc ISCDPStateFacet
    function getDebtSCDP(address _krAsset) external view returns (uint256) {
        Asset storage asset = cs().assets[_krAsset];
        return asset.toRebasingAmount(scdp().assetData[_krAsset].debt);
    }

    /// @inheritdoc ISCDPStateFacet
    function getDebtValueSCDP(address _krAsset, bool _ignoreFactors) external view returns (uint256) {
        Asset storage asset = cs().assets[_krAsset];
        return asset.debtAmountToValue(asset.toRebasingAmount(scdp().assetData[_krAsset].debt), _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getTotalDebtValueSCDP(bool _ignoreFactors) external view returns (uint256) {
        return scdp().totalDebtValueAtRatioSCDP(Percents.HUNDRED, _ignoreFactors);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    MISC                                    */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getAssetEnabledSCDP(address _assetAddr) external view returns (bool) {
        return scdp().isEnabled[_assetAddr];
    }

    function getDepositEnabledSCDP(address _assetAddr) external view returns (bool) {
        return cs().assets[_assetAddr].isSharedCollateral;
    }

    /// @inheritdoc ISCDPStateFacet
    function getSwapEnabledSCDP(address _assetIn, address _assetOut) external view returns (bool) {
        return scdp().isRoute[_assetIn][_assetOut];
    }

    function getCollateralRatioSCDP() public view returns (uint256) {
        uint256 collateralValue = scdp().totalCollateralValueSCDP(false);
        uint256 debtValue = sdi().effectiveDebtValue();
        if (debtValue == 0) return 0;
        return collateralValue.percentDiv(debtValue);
    }
}
