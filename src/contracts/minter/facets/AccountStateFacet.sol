// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IAccountStateFacet} from "../interfaces/IAccountStateFacet.sol";
import {Error} from "common/Errors.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {ms, Fee} from "minter/libs/LibMinter.sol";
import {Shared} from "common/libs/Shared.sol";
import {KrAsset} from "common/libs/Assets.sol";
import "minter/libs/Conversions.sol";
import {fromWad} from "common/funcs/Conversions.sol";

/**
 * @author Kresko
 * @title AccountStateFacet
 * @notice Views concerning account state
 */

contract AccountStateFacet is IAccountStateFacet {
    using Shared for uint256;
    using Shared for uint8;
    using WadRay for uint256;

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
    function getAccountDebtValue(address _account) external view returns (uint256) {
        return ms().accountDebtValue(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountDebtOf(address _account, address _asset) external view returns (uint256) {
        return ms().accountDebtAmount(_account, _asset);
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
        return ms().accountCollateralAmount(_account, _asset);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountDepositIndex(address _account, address _collateralAsset) external view returns (uint256 i) {
        return ms().accountDepositIndex(_account, _collateralAsset);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralValue(address _account) public view returns (uint256) {
        return ms().accountCollateralValue(_account);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountMinCollateralAtRatio(address _account, uint256 _ratio) public view returns (uint256) {
        return ms().accountMinCollateralAtRatio(_account, _ratio);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralRatio(address _account) public view returns (uint256 ratio) {
        uint256 collateralValue = ms().accountCollateralValue(_account);
        if (collateralValue == 0) {
            return 0;
        }
        uint256 debtValue = ms().accountDebtValue(_account);
        if (debtValue == 0) {
            return 0;
        }

        ratio = collateralValue.wadDiv(debtValue);
    }

    /// @inheritdoc IAccountStateFacet
    function getAccountCollateralValueOf(
        address _account,
        address _asset
    ) external view returns (uint256 adjustedValue, uint256 realValue) {
        return collateralAmountToValue(_asset, ms().accountCollateralAmount(_account, _asset), false);
    }

    /// @inheritdoc IAccountStateFacet
    function getCollateralRatiosFor(address[] calldata _accounts) external view returns (uint256[] memory) {
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
        uint256 _feeType
    ) external view returns (address[] memory, uint256[] memory) {
        require(_feeType <= 1, Error.INVALID_FEE_TYPE);

        KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];

        // Calculate the value of the fee according to the value of the krAsset
        uint256 feeValue = krAsset.uintUSD(_kreskoAssetAmount, ms().oracleDeviationPct).wadMul(
            Fee(_feeType) == Fee.Open ? krAsset.openFee : krAsset.closeFee
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

            uint256 depositAmount = ms().accountCollateralAmount(_account, collateralAssetAddress);

            // Don't take the collateral asset's collateral factor into consideration.
            (uint256 depositValue, uint256 oraclePrice) = collateralAmountToValue(
                collateralAssetAddress,
                depositAmount,
                true
            );

            uint256 feeValuePaid;
            uint256 transferAmount;
            // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
            if (feeValue < depositValue) {
                transferAmount = fromWad(
                    ms().collateralAssets[collateralAssetAddress].decimals,
                    feeValue.wadDiv(oraclePrice)
                );
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
