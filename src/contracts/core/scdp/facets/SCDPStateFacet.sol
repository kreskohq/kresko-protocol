// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {AssetData, UserData, GlobalData, UserAssetData} from "scdp/Types.sol";
import {scdp, sdi} from "scdp/State.sol";
import {Percents} from "common/Constants.sol";
import {cs} from "common/State.sol";
import {toWad} from "common/funcs/Math.sol";
import {Asset} from "common/Types.sol";

/**
 * @title SCDPStateFacet
 * @author Kresko
 * @notice  This facet is used to view the state of the scdp.
 */
contract SCDPStateFacet is ISCDPStateFacet {
    using WadRay for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                  Accounts                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountPrincipalDeposits(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return scdp().accountDepositsWithFees(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositFeesGainedSCDP(address _account, address _depositAsset) external view returns (uint256) {
        return
            scdp().accountDepositsWithFees(_account, _depositAsset, cs().assets[_depositAsset]) -
            scdp().accountPrincipalDeposits(_account, _depositAsset, cs().assets[_depositAsset]);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueSCDP(address _account, address _depositAsset) external view returns (uint256) {
        Asset memory asset = cs().assets[_depositAsset];
        (uint256 assetValue, ) = asset.collateralAmountToValue(
            scdp().accountPrincipalDeposits(_account, _depositAsset, asset),
            true
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountDepositValueWithFeesSCDP(address _account, address _depositAsset) external view returns (uint256) {
        Asset memory asset = cs().assets[_depositAsset];
        (uint256 assetValue, ) = asset.collateralAmountToValue(
            scdp().accountDepositsWithFees(_account, _depositAsset, asset),
            true
        );

        return assetValue;
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalDepositValue(_account, true);
    }

    /// @inheritdoc ISCDPStateFacet
    function getAccountTotalDepositsValueWithFeesSCDP(address _account) external view returns (uint256) {
        return scdp().accountTotalDepositValueWithFees(_account);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collaterals                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getDepositAssetsSCDP() external view returns (address[] memory result) {
        address[] memory depositAssets = scdp().collaterals;
        address[] memory results = new address[](depositAssets.length);

        uint256 index;

        for (uint256 i; i < depositAssets.length; ) {
            if (cs().assets[depositAssets[i]].isSCDPDepositAsset) {
                results[index++] = depositAssets[i];
            }
            unchecked {
                i++;
            }
        }

        result = new address[](index);
        for (uint256 i; i < index; ) {
            result[i] = results[i];
            unchecked {
                i++;
            }
        }
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
        Asset memory asset = cs().assets[_depositAsset];
        (uint256 assetValue, ) = asset.collateralAmountToValue(scdp().totalDepositAmount(_depositAsset, asset), _ignoreFactors);

        return assetValue;
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
    function getDebtSCDP(address _kreskoAsset) external view returns (uint256) {
        Asset memory asset = cs().assets[_kreskoAsset];
        return asset.toRebasingAmount(scdp().assetData[_kreskoAsset].debt);
    }

    /// @inheritdoc ISCDPStateFacet
    function getDebtValueSCDP(address _kreskoAsset, bool _ignoreFactors) external view returns (uint256) {
        Asset memory asset = cs().assets[_kreskoAsset];
        return asset.debtAmountToValue(asset.toRebasingAmount(scdp().assetData[_kreskoAsset].debt), _ignoreFactors);
    }

    /// @inheritdoc ISCDPStateFacet
    function getTotalDebtValueSCDP(bool _ignoreFactors) external view returns (uint256) {
        return scdp().totalDebtValueAtRatioSCDP(Percents.ONE_HUNDRED_PERCENT, _ignoreFactors);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    MISC                                    */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc ISCDPStateFacet
    function getFeeRecipientSCDP() external view returns (address) {
        return scdp().swapFeeRecipient;
    }

    /// @inheritdoc ISCDPStateFacet
    function getAssetEnabledSCDP(address _asset) external view returns (bool) {
        return scdp().isEnabled[_asset];
    }

    function getDepositEnabledSCDP(address _asset) external view returns (bool) {
        return cs().assets[_asset].isSCDPDepositAsset;
    }

    /// @inheritdoc ISCDPStateFacet
    function getSwapEnabledSCDP(address _assetIn, address _assetOut) external view returns (bool) {
        return scdp().isSwapEnabled[_assetIn][_assetOut];
    }

    function getCollateralRatioSCDP() public view returns (uint256) {
        uint256 collateralValue = scdp().totalCollateralValueSCDP(false);
        uint256 debtValue = sdi().effectiveDebtValue();
        if (debtValue == 0) return 0;
        return collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc ISCDPStateFacet
    function getStatisticsSCDP() external view returns (GlobalData memory) {
        (uint256 debtValue, uint256 debtValueAdjusted) = totalDebtValuesAtRatioSCDP(1e4);
        uint256 effectiveDebtValue = sdi().effectiveDebtValue();
        (uint256 collateralValue, uint256 collateralValueAdjusted) = totalCollateralValuesSCDP();
        return
            GlobalData({
                collateralValue: collateralValue,
                collateralValueAdjusted: collateralValueAdjusted,
                debtValue: debtValue,
                debtValueAdjusted: debtValueAdjusted,
                effectiveDebtValue: effectiveDebtValue,
                cr: debtValue == 0 ? 0 : collateralValue.wadDiv(effectiveDebtValue),
                crDebtValue: debtValue == 0 ? 0 : collateralValue.wadDiv(debtValue),
                crDebtValueAdjusted: debtValueAdjusted == 0 ? 0 : collateralValueAdjusted.wadDiv(debtValueAdjusted)
            });
    }

    function getAccountInfoSCDP(address _account, address[] memory _assets) public view returns (UserData memory result) {
        result.account = _account;
        (result.totalDepositValue, result.totalDepositValueWithFees, result.deposits) = accountTotalDepositValues(
            _account,
            _assets
        );
        result.totalFeesValue = result.totalDepositValueWithFees - result.totalDepositValue;
    }

    function getAccountInfosSCDP(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (UserData[] memory result) {
        result = new UserData[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            address account = _accounts[i];
            result[i] = getAccountInfoSCDP(account, _assets);
            unchecked {
                i++;
            }
        }
    }

    function getAssetInfoSCDP(address _asset) public view returns (AssetData memory results) {
        Asset memory asset = cs().assets[_asset];
        bool isKrAsset = asset.isSCDPKrAsset;
        bool isCollateral = asset.isSCDPCollateral;
        uint256 depositAmount = isCollateral ? scdp().totalDepositAmount(_asset, asset) : 0;
        uint256 debtAmount = isKrAsset ? asset.toRebasingAmount(scdp().assetData[_asset].debt) : 0;

        (uint256 debtValue, uint256 debtValueAdjusted, uint256 krAssetPrice) = isKrAsset
            ? debtAmountToValues(asset, debtAmount)
            : (0, 0, 0);

        (uint256 depositValue, uint256 depositValueAdjusted, uint256 collateralPrice) = isCollateral
            ? collateralAmountToValues(asset, depositAmount)
            : (0, 0, 0);
        return
            AssetData({
                addr: _asset,
                asset: asset,
                assetPrice: krAssetPrice > 0 ? krAssetPrice : collateralPrice,
                depositAmount: depositAmount,
                depositValue: depositValue,
                depositValueAdjusted: depositValueAdjusted,
                debtAmount: debtAmount,
                debtValue: debtValue,
                debtValueAdjusted: debtValueAdjusted,
                swapDeposits: isCollateral ? scdp().swapDepositAmount(_asset, asset) : 0,
                symbol: IERC20Permit(_asset).symbol()
            });
    }

    function getAssetInfosSCDP(address[] memory _assets) external view returns (AssetData[] memory results) {
        // address[] memory collateralAssets = scdp().collaterals;
        results = new AssetData[](_assets.length);

        for (uint256 i; i < _assets.length; ) {
            address asset = _assets[i];
            results[i] = getAssetInfoSCDP(asset);
            unchecked {
                i++;
            }
        }
    }
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */
using WadRay for uint256;

import {Percentages} from "libs/Percentages.sol";
using Percentages for uint256;

function collateralAmountToValues(
    Asset memory self,
    uint256 _amount
) view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
    price = self.price();
    value = toWad(self.decimals, _amount).wadMul(price);
    valueAdjusted = value.percentMul(self.factor);
}

function debtAmountToValues(
    Asset memory self,
    uint256 _amount
) view returns (uint256 value, uint256 valueAdjusted, uint256 price) {
    price = self.price();
    value = _amount.wadMul(price);
    valueAdjusted = value.percentMul(self.kFactor);
}

/**
 * @notice Calculates the total collateral value of collateral assets in the pool.
 * @return value in USD
 * @return valueAdjusted Value adjusted by cFactors in USD
 */
function totalCollateralValuesSCDP() view returns (uint256 value, uint256 valueAdjusted) {
    address[] memory assets = scdp().collaterals;
    for (uint256 i; i < assets.length; ) {
        Asset memory asset = cs().assets[assets[i]];
        uint256 depositAmount = scdp().totalDepositAmount(assets[i], asset);
        if (depositAmount != 0) {
            (uint256 assetValue, uint256 assetValueAdjusted, ) = collateralAmountToValues(asset, depositAmount);
            value += assetValue;
            valueAdjusted += assetValueAdjusted;
        }

        unchecked {
            i++;
        }
    }
}

/**
 * @notice Returns the values of the krAsset held in the pool at a ratio.
 * @param _ratio ratio
 * @return value in USD
 * @return valueAdjusted Value adjusted by kFactors in USD
 */
function totalDebtValuesAtRatioSCDP(uint256 _ratio) view returns (uint256 value, uint256 valueAdjusted) {
    address[] memory assets = scdp().krAssets;
    for (uint256 i; i < assets.length; ) {
        Asset memory asset = cs().assets[assets[i]];
        uint256 debtAmount = asset.toRebasingAmount(scdp().assetData[assets[i]].debt);
        unchecked {
            if (debtAmount != 0) {
                (uint256 valueUnadjusted, uint256 adjusted, ) = debtAmountToValues(asset, debtAmount);
                value += valueUnadjusted;
                valueAdjusted += adjusted;
            }
            i++;
        }
    }

    if (_ratio != 1e4) {
        value = value.percentMul(_ratio);
        valueAdjusted = valueAdjusted.percentMul(_ratio);
    }
}

function accountTotalDepositValues(
    address _account,
    address[] memory _assetData
) view returns (uint256 totalValue, uint256 totalValueWithFees, UserAssetData[] memory datas) {
    address[] memory assets = scdp().collaterals;
    datas = new UserAssetData[](_assetData.length);
    for (uint256 i; i < assets.length; ) {
        address asset = assets[i];
        UserAssetData memory assetData = accountDepositAmountsAndValues(_account, asset);

        totalValue += assetData.depositValue;
        totalValueWithFees += assetData.depositValueWithFees;

        for (uint256 j; j < _assetData.length; ) {
            if (asset == _assetData[j]) {
                datas[j] = assetData;
            }
            unchecked {
                j++;
            }
        }

        unchecked {
            i++;
        }
    }
}

function accountDepositAmountsAndValues(address _account, address _assetAddr) view returns (UserAssetData memory result) {
    Asset memory asset = cs().assets[_assetAddr];
    result.depositAmountWithFees = scdp().accountDepositsWithFees(_account, _assetAddr, asset);
    result.depositAmount = asset.amountRead(scdp().depositsPrincipal[_account][_assetAddr]);
    if (result.depositAmountWithFees < result.depositAmount) {
        result.depositAmount = result.depositAmountWithFees;
    }
    (result.depositValue, result.assetPrice) = asset.collateralAmountToValue(result.depositAmount, true);
    (result.depositValueWithFees, ) = asset.collateralAmountToValue(result.depositAmountWithFees, true);
    result.asset = _assetAddr;
}
