// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IAccountStateFacet} from "../interfaces/IAccountStateFacet.sol";
import {Action, Fee, KrAsset, CollateralAsset, FixedPoint} from "../MinterTypes.sol";
import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";
import {Error} from "../../libs/Errors.sol";
import {Math} from "../../libs/Math.sol";
import {ms} from "../MinterStorage.sol";

/**
 * @author Kresko
 * @title AccountStateFacet
 * @notice Diamond (EIP-2535) facet for views concerning account state
 */
contract AccountStateFacet is IAccountStateFacet {
    using Math for uint256;
    using Math for uint8;
    using Math for FixedPoint.Unsigned;
    using FixedPoint for FixedPoint.Unsigned;

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) external view returns (uint256) {
        return ms().getMintedKreskoAssetsIndex(_account, _kreskoAsset);
    }

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(address _account) external view returns (address[] memory) {
        return ms().mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets the Kresko asset value in USD of a particular account.
     * @param _account The account to calculate the Kresko asset value for.
     * @return The Kresko asset value of a particular account.
     */
    function getAccountKrAssetValue(address _account) external view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountKrAssetValue(_account);
    }

    /**
     * @notice Get `_account` debt amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of debt for `_asset`
     */
    function kreskoAssetDebt(address _account, address _asset) external view returns (uint256) {
        return ms().getKreskoAssetDebt(_account, _asset);
    }

    /**
     * @notice Get `_account` interest amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of debt for `_asset`
     */
    function kreskoAssetDebtInterest(address _account, address _asset) external view returns (uint256) {
        return ms().getKreskoAssetDebtInterest(_account, _asset);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getDepositedCollateralAssets(address _account) external view returns (address[] memory) {
        return ms().depositedCollateralAssets[_account];
    }

    /**
     * @notice Get `_account` collateral deposit amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of collateral deposited for `_asset`
     */
    function collateralDeposits(address _account, address _asset) external view returns (uint256) {
        return ms().getCollateralDeposits(_account, _asset);
    }

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function getDepositedCollateralAssetIndex(address _account, address _collateralAsset)
        external
        view
        returns (uint256 i)
    {
        for (i; i < ms().depositedCollateralAssets[_account].length; i++) {
            if (ms().depositedCollateralAssets[_account][i] == _collateralAsset) {
                break;
            }
        }
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return The collateral value of a particular account.
     */
    function getAccountCollateralValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        return ms().getAccountCollateralValue(_account);
    }

    /**
     * @notice Get an account's minimum collateral value required
     * to back a Kresko asset amount at a given collateralization ratio.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy,
     *      accounts with their collateral value under the liquidation threshold are considered liquidatable.
     * @param _account The account to calculate the minimum collateral value for.
     * @param _ratio The collateralization ratio required: higher ratio = more collateral required
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinimumCollateralValueAtRatio(address _account, FixedPoint.Unsigned memory _ratio)
        public
        view
        returns (FixedPoint.Unsigned memory)
    {
        return ms().getAccountMinimumCollateralValueAtRatio(_account, _ratio);
    }

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratio for an `_account`
     */
    function getAccountCollateralRatio(address _account) public view returns (FixedPoint.Unsigned memory ratio) {
        FixedPoint.Unsigned memory collateralValue = ms().getAccountCollateralValue(_account);
        if (collateralValue.rawValue == 0) {
            return FixedPoint.Unsigned(0);
        }
        ratio = collateralValue.div(
            getAccountMinimumCollateralValueAtRatio(_account, ms().minimumCollateralizationRatio)
        );
    }

    function getAccountSingleCollateralValueAndRealValue(address _account, address _asset)
        external
        view
        returns (FixedPoint.Unsigned memory value, FixedPoint.Unsigned memory realValue)
    {
        uint256 depositAmount = ms().getCollateralDeposits(_account, _asset);
        return ms().getCollateralValueAndOraclePrice(_asset, depositAmount, false);
    }

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratios of the accounts
     */
    function getCollateralRatiosFor(address[] calldata _accounts) external view returns (FixedPoint.Unsigned[] memory) {
        FixedPoint.Unsigned[] memory ratios = new FixedPoint.Unsigned[](_accounts.length);
        for (uint256 i; i < _accounts.length; i++) {
            ratios[i] = getAccountCollateralRatio(_accounts[i]);
        }
        return ratios;
    }

    /**
     * @notice Calculates the expected fee to be taken from a user's deposited collateral assets,
     *         by imitating calcFee without modifying state.
     * @param _account The account to charge the open fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _kreskoAssetAmount The amount of the kresko asset being minted.
     * @param _feeType The fee type (open, close, etc).
     * @return assets The collateral types as an array of addresses.
     * @return amounts The collateral amounts as an array of uint256.
     */
    function calcExpectedFee(
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmount,
        uint256 _feeType
    ) external view returns (address[] memory, uint256[] memory) {
        require(_feeType <= 1, Error.INVALID_FEE_TYPE);

        KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];

        // Calculate the value of the fee according to the value of the krAsset
        FixedPoint.Unsigned memory feeValue = FixedPoint
            .Unsigned(uint256(krAsset.oracle.latestAnswer()))
            .mul(FixedPoint.Unsigned(_kreskoAssetAmount))
            .mul(Fee(_feeType) == Fee.Open ? krAsset.openFee : krAsset.closeFee);

        address[] memory accountCollateralAssets = ms().depositedCollateralAssets[_account];

        ExpectedFeeRuntimeInfo memory info; // Using ExpectedFeeRuntimeInfo struct to avoid StackTooDeep error
        info.assets = new address[](accountCollateralAssets.length);
        info.amounts = new uint256[](accountCollateralAssets.length);

        // Return empty arrays if the fee value is 0.
        if (feeValue.rawValue == 0) {
            return (info.assets, info.amounts);
        }

        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];

            uint256 depositAmount = ms().collateralDeposits[_account][collateralAssetAddress];

            // Don't take the collateral asset's collateral factor into consideration.
            (FixedPoint.Unsigned memory depositValue, FixedPoint.Unsigned memory oraclePrice) = ms()
                .getCollateralValueAndOraclePrice(collateralAssetAddress, depositAmount, true);

            FixedPoint.Unsigned memory feeValuePaid;
            uint256 transferAmount;
            // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
            if (feeValue.isLessThan(depositValue)) {
                transferAmount = ms().collateralAssets[collateralAssetAddress].decimals._fromCollateralFixedPointAmount(
                        feeValue.div(oraclePrice)
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

            feeValue = feeValue.sub(feeValuePaid);
            // If the entire fee has been paid, no more action needed.
            if (feeValue.rawValue == 0) {
                return (info.assets, info.amounts);
            }
        }
        return (info.assets, info.amounts);
    }

    // ExpectedFeeRuntimeInfo is used to avoid StackTooDeep error
    struct ExpectedFeeRuntimeInfo {
        address[] assets;
        uint256[] amounts;
        uint256 collateralTypeCount;
    }
}
