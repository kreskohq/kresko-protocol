// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {WadRay} from "libs/WadRay.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {CError} from "common/CError.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {MinterState} from "minter/State.sol";

library MAccounts {
    using WadRay for uint256;
    using PercentageMath for uint256;

    /* -------------------------------------------------------------------------- */
    /*                             Account Liquidation                            */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Checks if accounts collateral value is less than required.
     * @notice Reverts if account is not liquidatable.
     * @param _account Account to check.
     */
    function checkAccountLiquidatable(MinterState storage self, address _account) internal view {
        uint256 collateralValue = self.accountTotalCollateralValue(_account);
        uint256 minCollateralValue = self.accountMinCollateralAtRatio(_account, self.liquidationThreshold);
        if (collateralValue >= minCollateralValue) {
            revert CError.CANNOT_LIQUIDATE(collateralValue, minCollateralValue);
        }
    }

    /**
     * @notice Gets the liquidatable status of an account.
     * @param _account Account to check.
     * @return bool Indicating if the account is liquidatable.
     */
    function isAccountLiquidatable(MinterState storage self, address _account) internal view returns (bool) {
        uint256 collateralValue = self.accountTotalCollateralValue(_account);
        uint256 minCollateralValue = self.accountMinCollateralAtRatio(_account, self.liquidationThreshold);
        return collateralValue < minCollateralValue;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Account Debt                                */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the total debt value in USD for an account.
     * @param _account Account to calculate the KreskoAsset value for.
     * @return value Total kresko asset debt value of `_account`.
     */
    function accountTotalDebtValue(MinterState storage self, address _account) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 debtAmount = self.accountDebtAmount(_account, assets[i], asset);
            unchecked {
                if (debtAmount != 0) {
                    value += asset.debtAmountToValue(debtAmount, false);
                }
                i++;
            }
        }
        return value;
    }

    /**
     * @notice Gets `_account` principal debt amount for `_asset`
     * @dev Principal debt is rebase adjusted due to possible stock splits/reverse splits
     * @param _account Account to get debt amount for.
     * @param _assetAddr Kresko asset address
     * @param _asset Asset truct for the kresko asset.
     * @return debtAmount Amount of debt the `_account` has for `_asset`
     */
    function accountDebtAmount(
        MinterState storage self,
        address _account,
        address _assetAddr,
        Asset storage _asset
    ) internal view returns (uint256 debtAmount) {
        return _asset.toRebasingAmount(self.kreskoAssetDebt[_account][_assetAddr]);
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account Account to get the minted Kresko assets for.
     * @param _kreskoAsset Asset address.
     * @return mintIndex Index of the minted `_kreskoAsset` in the array for the `_account`.
     */
    function accountMintIndex(
        MinterState storage self,
        address _account,
        address _kreskoAsset
    ) internal view returns (uint256 mintIndex) {
        uint256 length = self.mintedKreskoAssets[_account].length;
        if (length == 0) revert CError.NO_MINTED_ASSETS(_account);

        for (mintIndex; mintIndex < length; ) {
            if (self.mintedKreskoAssets[_account][mintIndex] == _kreskoAsset) {
                break;
            }
            unchecked {
                mintIndex++;
            }
        }
    }

    /**
     * @notice Gets an array of kresko assets the account has minted.
     * @param _account Account to get the minted kresko assets for.
     * @return mintedAssets Array of addresses of kresko assets the account has minted.
     */
    function accountDebtAssets(
        MinterState storage self,
        address _account
    ) internal view returns (address[] memory mintedAssets) {
        return self.mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets accounts min collateral value required to cover debt at a given collateralization ratio.
     * @notice Account with min collateral value under MCR cannot borrow.
     * @notice Account with min collateral value under LT can be liquidated up to maxLiquidationRatio.
     * @param _account Account to calculate the minimum collateral value for.
     * @param _ratio Collateralization ratio to apply for the minimum collateral value.
     * @return minCollateralValue Minimum collateral value required for the account with `_ratio`.
     */
    function accountMinCollateralAtRatio(
        MinterState storage self,
        address _account,
        uint32 _ratio
    ) internal view returns (uint256 minCollateralValue) {
        return self.accountTotalDebtValue(_account).percentMul(_ratio);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Account Collateral                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the array of collateral assets the account has deposited.
     * @param _account Account to get the deposited collateral assets for.
     * @return depositedAssets Array of deposited collateral assets for `_account`.
     */
    function accountCollateralAssets(
        MinterState storage self,
        address _account
    ) internal view returns (address[] memory depositedAssets) {
        return self.depositedCollateralAssets[_account];
    }

    /**
     * @notice Gets the deposited collateral asset amount for an account
     * @notice Performs rebasing conversion for KreskoAssets
     * @param _account Account to query amount for
     * @param _assetAddress Collateral asset address
     * @param _asset Asset struct of the collateral asset
     * @return uint256 Collateral deposit amount of `_asset` for `_account`
     */
    function accountCollateralAmount(
        MinterState storage self,
        address _account,
        address _assetAddress,
        Asset storage _asset
    ) internal view returns (uint256) {
        return _asset.toRebasingAmount(self.collateralDeposits[_account][_assetAddress]);
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @param _account Account to calculate the collateral value for.
     * @return totalCollateralValue Collateral value of a particular account.
     */
    function accountTotalCollateralValue(
        MinterState storage self,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 collateralAmount = self.accountCollateralAmount(_account, assets[i], asset);
            unchecked {
                if (collateralAmount != 0) {
                    totalCollateralValue += asset.collateralAmountToValue(
                        collateralAmount,
                        false // Take the collateral factor into consideration.
                    );
                }
                i++;
            }
        }

        return totalCollateralValue;
    }

    /**
     * @notice Gets the total collateral deposits value of an account while extracting value for `_collateralAsset`.
     * @param _account Account to calculate the collateral value for.
     * @param _collateralAsset Collateral asset to extract value for.
     * @return totalValue Total collateral value of `_account`
     * @return assetValue Collateral value of `_collateralAsset` for `_account`
     */
    function accountTotalCollateralValue(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 totalValue, uint256 assetValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            Asset storage asset = cs().assets[assets[i]];
            uint256 collateralAmount = self.accountCollateralAmount(_account, assets[i], asset);

            unchecked {
                if (collateralAmount != 0) {
                    uint256 collateralValue = asset.collateralAmountToValue(
                        collateralAmount,
                        false // Take the collateral factor into consideration.
                    );
                    totalValue += collateralValue;
                    if (assets[i] == _collateralAsset) {
                        assetValue = collateralValue;
                    }
                }
                i++;
            }
        }
    }

    /**
     * @notice Gets the deposit index of `_collateralAsset` for `_account`.
     * @param _account Account to get the index for.
     * @param _collateralAsset Collateral asset address.
     * @return depositIndex Index of the deposited asset in the array for `_account`.
     */
    function accountDepositIndex(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 depositIndex) {
        uint256 length = self.depositedCollateralAssets[_account].length;
        if (length == 0) revert CError.NO_COLLATERALS_DEPOSITED(_account);
        for (depositIndex; depositIndex < length; ) {
            if (self.depositedCollateralAssets[_account][depositIndex] == _collateralAsset) {
                break;
            }
            unchecked {
                depositIndex++;
            }
        }
    }
}
