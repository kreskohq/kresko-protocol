// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {SafeERC20} from "vendor/SafeERC20.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";
import {Arrays} from "libs/Arrays.sol";
import {Error} from "common/Errors.sol";

import {MinterState} from "minter/State.sol";
import {krAssetAmountToValue, collateralAmountToValue, collateralAmountRead} from "minter/funcs/Conversions.sol";

library MAccounts {
    using WadRay for uint256;
    using Arrays for address[];
    using SafeERC20 for IERC20Permit;

    /* -------------------------------------------------------------------------- */
    /*                             Account Liquidation                            */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Checks if accounts collateral value is less than required.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(MinterState storage self, address _account) internal view returns (bool) {
        return
            self.accountCollateralValue(_account) <
            self.accountMinCollateralAtRatio(_account, self.liquidationThreshold);
    }

    /**
     * @notice Overload for calculating liquidatable status with a future liquidated collateral value
     * @param _account The account to check.
     * @param _valueLiquidated Value liquidated, eg. in a batch liquidation
     * @return bool indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(
        MinterState storage self,
        address _account,
        uint256 _valueLiquidated
    ) internal view returns (bool) {
        return
            self.accountCollateralValue(_account) - _valueLiquidated <
            (self.accountMinCollateralAtRatio(_account, self.liquidationThreshold));
    }

    /* -------------------------------------------------------------------------- */
    /*                                Account Debt                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the total debt value in USD for an account.
     * @param _account The account to calculate the KreskoAsset value for.
     * @return value The KreskoAsset debt value of the account.
     */
    function accountDebtValue(MinterState storage self, address _account) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += krAssetAmountToValue(asset, self.accountDebtAmount(_account, asset), false);
            unchecked {
                i++;
            }
        }
        return value;
    }

    /**
     * @notice Get `_account` principal debt amount for `_asset`
     * @dev Principal debt is rebase adjusted due to possible stock splits/reverse splits
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of principal debt for `_asset`
     */
    function accountDebtAmount(
        MinterState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        return self.kreskoAssets[_asset].toRebasingAmount(self.kreskoAssetDebt[_account][_asset]);
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return i = index of the minted Kresko asset.
     */
    function accountMintIndex(
        MinterState storage self,
        address _account,
        address _kreskoAsset
    ) internal view returns (uint256 i) {
        uint256 length = self.mintedKreskoAssets[_account].length;
        require(length > 0, Error.NO_KRASSETS_MINTED);
        for (i; i < length; ) {
            if (self.mintedKreskoAssets[_account][i] == _kreskoAsset) {
                break;
            }
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function accountDebtAssets(MinterState storage self, address _account) internal view returns (address[] memory) {
        return self.mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets accounts min collateral value required to cover debt at a given collateralization ratio.
     * @dev 1. Account with min collateral value under MCR will not borrow.
     *      2. Account with min collateral value under LT can be liquidated.
     * @param _account The account to calculate the minimum collateral value for.
     * @param _ratio The collateralization ratio to get min collateral value against.
     * @return The min collateral value at given collateralization ratio for the account.
     */
    function accountMinCollateralAtRatio(
        MinterState storage self,
        address _account,
        uint256 _ratio
    ) internal view returns (uint256) {
        return self.accountDebtValue(_account).wadMul(_ratio);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Account Collateral                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function accountCollateralAssets(
        MinterState storage self,
        address _account
    ) internal view returns (address[] memory) {
        return self.depositedCollateralAssets[_account];
    }

    /**
     * @notice Get deposited collateral asset amount for an account
     * @notice Performs rebasing conversion for KreskoAssets
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return uint256 amount of collateral for `_asset`
     */
    function accountCollateralAmount(
        MinterState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        return collateralAmountRead(_asset, self.collateralDeposits[_account][_asset]);
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return totalCollateralValue The collateral value of a particular account.
     */
    function accountCollateralValue(
        MinterState storage self,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];

            (uint256 collateralValue, ) = collateralAmountToValue(
                asset,
                self.accountCollateralAmount(_account, asset),
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue += collateralValue;
            unchecked {
                i++;
            }
        }

        return totalCollateralValue;
    }

    /**
     * @notice Gets the collateral value of a particular account including extra return value for specific collateral.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @param _collateralAsset The collateral asset to get the collateral value.
     * @return totalCollateralValue The collateral value of a particular account.
     * @return specificValue The collateral value of a particular account.
     */
    function accountCollateralAssetValue(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 totalCollateralValue, uint256 specificValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 collateralValue, ) = collateralAmountToValue(
                asset,
                self.accountCollateralAmount(_account, asset),
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue += collateralValue;
            if (asset == _collateralAsset) {
                specificValue = collateralValue;
            }

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function accountDepositIndex(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 i) {
        uint256 length = self.depositedCollateralAssets[_account].length;
        require(length > 0, Error.NO_COLLATERAL_DEPOSITS);
        for (i; i < length; ) {
            if (self.depositedCollateralAssets[_account][i] == _collateralAsset) {
                break;
            }
            unchecked {
                i++;
            }
        }
    }
}
