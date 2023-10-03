// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {CError} from "common/CError.sol";
import {cs} from "common/State.sol";
import {Asset, Fee} from "common/Types.sol";
import {fromWad} from "common/funcs/Math.sol";

import {MinterAccountState} from "minter/Types.sol";

import {IAccountStateFacet} from "minter/interfaces/IAccountStateFacet.sol";
import {ms} from "minter/State.sol";
import {collateralAmountToValues, debtAmountToValues} from "common/funcs/Helpers.sol";

/**
 * @author Kresko
 * @title AccountStateFacet
 * @notice Views concerning account state
 */

contract AccountStateFacet is IAccountStateFacet {
    using WadRay for uint256;
    using PercentageMath for uint256;

    /// @inheritdoc IAccountStateFacet
    function getAccountLiquidatable(address _account) external view returns (bool) {
        return ms().isAccountLiquidatable(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountState(address _account) external view returns (MinterAccountState memory) {
        uint256 debtValue = ms().accountTotalDebtValue(_account);
        uint256 collateralValue = ms().accountTotalCollateralValue(_account);
        return
            MinterAccountState({
                totalDebtValue: debtValue,
                totalCollateralValue: collateralValue,
                collateralRatio: debtValue > 0 ? collateralValue.percentDiv(debtValue) : 0
            });
    }

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IAccountStateFacet
    function getAccountMintIndex(address _account, address _kreskoAsset) external view returns (uint256) {
        return ms().accountMintIndex(_account, _kreskoAsset);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountMintedAssets(address _account) external view returns (address[] memory) {
        return ms().mintedKreskoAssets[_account];
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountTotalDebtValues(address _account) external view returns (uint256 value, uint256 valueAdjusted) {
        return accountTotalDebtValues(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountTotalDebtValue(address _account) external view returns (uint256) {
        return ms().accountTotalDebtValue(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountDebtAmount(address _account, address _asset) external view returns (uint256) {
        return ms().accountDebtAmount(_account, _asset, cs().assets[_asset]);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralAssets(address _account) external view returns (address[] memory) {
        return ms().depositedCollateralAssets[_account];
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralAmount(address _account, address _asset) external view returns (uint256) {
        return ms().accountCollateralAmount(_account, _asset, cs().assets[_asset]);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountDepositIndex(address _account, address _collateralAsset) external view returns (uint256 i) {
        return ms().accountDepositIndex(_account, _collateralAsset);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountTotalCollateralValue(address _account) public view returns (uint256) {
        return ms().accountTotalCollateralValue(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountTotalCollateralValues(address _account) public view returns (uint256 value, uint256 valueAdjusted) {
        return accountTotalCollateralValues(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralValues(
        address _account,
        address _asset
    ) external view returns (uint256 value, uint256 adjustedValue, uint256 price) {
        Asset storage asset = cs().assets[_asset];
        return collateralAmountToValues(asset, ms().accountCollateralAmount(_account, _asset, asset));
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountMinCollateralAtRatio(address _account, uint32 _ratio) public view returns (uint256) {
        return ms().accountMinCollateralAtRatio(_account, _ratio);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralRatio(address _account) public view returns (uint256 ratio) {
        uint256 collateralValue = ms().accountTotalCollateralValue(_account);
        if (collateralValue == 0) {
            return 0;
        }
        uint256 debtValue = ms().accountTotalDebtValue(_account);
        if (debtValue == 0) {
            return 0;
        }

        ratio = collateralValue.percentDiv(debtValue);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralRatios(address[] calldata _accounts) external view returns (uint256[] memory) {
        uint256[] memory ratios = new uint256[](_accounts.length);
        for (uint256 i; i < _accounts.length; i++) {
            ratios[i] = getAccountCollateralRatio(_accounts[i]);
        }
        return ratios;
    }

    /// @inheritdoc IAccountStateFacet
    function previewFee(
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmount,
        Fee _feeType
    ) external view returns (address[] memory, uint256[] memory) {
        if (uint8(_feeType) > 1) {
            revert CError.INVALID_FEE_TYPE(uint8(_feeType), 1);
        }

        Asset storage asset = cs().assets[_kreskoAsset];

        // Calculate the value of the fee according to the value of the krAsset
        uint256 feeValue = asset.uintUSD(_kreskoAssetAmount).percentMul(
            Fee(_feeType) == Fee.Open ? asset.openFee : asset.closeFee
        );

        address[] memory accountCollateralAssets = ms().depositedCollateralAssets[_account];

        ExpectedFeeRuntimeInfo memory info; // Using ExpectedFeeRuntimeInfo struct to avoid StackTooDeep error
        info.assets = new address[](accountCollateralAssets.length);
        info.amounts = new uint256[](accountCollateralAssets.length);

        // Return empty arrays if the fee value is 0.
        if (feeValue == 0) {
            return (info.assets, info.amounts);
        }

        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];
            Asset storage collateralAsset = cs().assets[collateralAssetAddress];

            uint256 depositAmount = ms().accountCollateralAmount(_account, collateralAssetAddress, collateralAsset);

            // Don't take the collateral asset's collateral factor into consideration.
            (uint256 depositValue, uint256 oraclePrice) = collateralAsset.collateralAmountToValueWithPrice(depositAmount, true);

            uint256 feeValuePaid;
            uint256 transferAmount;
            // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
            if (feeValue < depositValue) {
                transferAmount = fromWad(collateralAsset.decimals, feeValue.wadDiv(oraclePrice));
                feeValuePaid = feeValue;
            } else {
                transferAmount = depositAmount;
                feeValuePaid = depositValue;
            }

            if (transferAmount > 0) {
                info.assets[info.collateralTypeCount] = collateralAssetAddress;
                info.amounts[info.collateralTypeCount] = transferAmount;
                info.collateralTypeCount = info.collateralTypeCount++;
            }

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return (info.assets, info.amounts);
            }
        }
        return (info.assets, info.amounts);
    }
}

/**
 * @notice Gets the collateral value of a particular account.
 * @param _account The account to calculate the collateral value for.
 * @return value Total collateral value
 * @return valueAdjusted Total adjusted collateral value
 */
function accountTotalCollateralValues(address _account) view returns (uint256 value, uint256 valueAdjusted) {
    address[] memory assets = ms().depositedCollateralAssets[_account];
    for (uint256 i; i < assets.length; ) {
        Asset storage asset = cs().assets[assets[i]];
        uint256 collateralAmount = ms().accountCollateralAmount(_account, assets[i], asset);
        unchecked {
            if (collateralAmount != 0) {
                (uint256 valUnadjusted, uint256 valAdjusted, ) = collateralAmountToValues(asset, collateralAmount);
                value += valUnadjusted;
                valueAdjusted += valAdjusted;
            }
            i++;
        }
    }
}

/**
 * @notice Gets the total debt value in USD for an account.
 * @param _account Account to calculate the KreskoAsset value for.
 * @return value Total kresko asset debt value
 * @return valueAdjusted Total adjusted kresko asset debt value
 */
function accountTotalDebtValues(address _account) view returns (uint256 value, uint256 valueAdjusted) {
    address[] memory assets = ms().mintedKreskoAssets[_account];
    for (uint256 i; i < assets.length; ) {
        Asset storage asset = cs().assets[assets[i]];
        uint256 debtAmount = ms().accountDebtAmount(_account, assets[i], asset);
        unchecked {
            if (debtAmount != 0) {
                (uint256 valUnadjusted, uint256 valAdjusted, ) = debtAmountToValues(asset, debtAmount);
                value += valUnadjusted;
                valueAdjusted += valAdjusted;
            }
            i++;
        }
    }
}
