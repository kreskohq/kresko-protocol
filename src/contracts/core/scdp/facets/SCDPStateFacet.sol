// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Percents} from "common/Constants.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {scdp, sdi} from "scdp/SState.sol";
import {PFunc} from "periphery/PFuncs.sol";
import {SCDPAssetIndexes} from "scdp/STypes.sol";

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
        return scdp().accountDeposits(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountFeesSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountFees(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalFeesValueSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalFeeValue(_account);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueSCDP(address _account, address _depositAsset) external view returns (uint256) {
        Asset storage asset = cs().assets[_depositAsset];
        return asset.collateralAmountToValue(scdp().accountDeposits(_account, _depositAsset, asset), true);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueSCDP(address _account) external view returns (uint256) {
        return scdp().accountDepositsValue(_account, true);
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
    function getAssetIndexesSCDP(address _assetAddr) external view returns (SCDPAssetIndexes memory) {
        return scdp().assetIndexes[_assetAddr];
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
        if (collateralValue == 0) return 0;
        if (debtValue == 0) return type(uint256).max;
        return collateralValue.percentDiv(debtValue);
    }
}
