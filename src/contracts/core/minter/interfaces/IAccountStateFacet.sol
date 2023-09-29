// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IAccountStateFacet {
    // ExpectedFeeRuntimeInfo is used for stack size optimization
    struct ExpectedFeeRuntimeInfo {
        address[] assets;
        uint256[] amounts;
        uint256 collateralTypeCount;
    }

    /**
     * @notice Calculates if an account's current collateral value is under its minimum collateral value
     * @dev Returns true if the account's current collateral value is below the minimum collateral value
     * required to consider the position healthy.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function getAccountLiquidatable(address _account) external view returns (bool);

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getAccountMintedAssets(address _account) external view returns (address[] memory);

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return index of the minted Kresko asset.
     */
    function getAccountMintIndex(address _account, address _kreskoAsset) external view returns (uint256);

    /**
     * @notice Gets the total Kresko asset debt value in USD for an account.
     * @param _account The account to calculate the Kresko asset value for.
     * @return The Kresko asset value of a particular account.
     */
    function getAccountDebtValue(address _account) external view returns (uint256);

    /**
     * @notice Get `_account` debt amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of debt for `_asset`
     */
    function getAccountDebtAmount(address _account, address _asset) external view returns (uint256);

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return The collateral value of a particular account.
     */
    function getAccountCollateralValue(address _account) external view returns (uint256);

    /**
     * @notice Get an account's minimum collateral value required
     * to back a Kresko asset amount at a given collateralization ratio.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy,
     *      accounts with their collateral value under the liquidation threshold are considered liquidatable.
     * @param _account The account to calculate the minimum collateral value for.
     * @param _ratio The collateralization ratio required: higher ratio = more collateral required
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinCollateralAtRatio(address _account, uint256 _ratio) external view returns (uint256);

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratio for an `_account`
     */
    function getAccountCollateralRatio(address _account) external view returns (uint256 ratio);

    /**
     * @notice Get a list of accounts and their collateral ratios
     * @return ratios of the accounts
     */
    function getCollateralRatiosFor(address[] memory _accounts) external view returns (uint256[] memory);

    /**
     * @notice Get the adjusted value of collateral and the real value of collateral
     * @dev The adjusted value of collateral is the value of collateral after adjusting for the cFactor
     * @param _account The account to get the collateral values for.
     * @param _asset The asset to get the collateral values for.
     * @return value The unadjusted value of the collateral.
     * @return valueAdjusted The adjusted value of the collateral.
     */
    function getAccountCollateralValueOf(
        address _account,
        address _asset
    ) external view returns (uint256 value, uint256 valueAdjusted);

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function getAccountDepositIndex(address _account, address _collateralAsset) external view returns (uint256 i);

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getAccountCollateralAssets(address _account) external view returns (address[] memory);

    /**
     * @notice Get `_account` collateral deposit amount for `_asset`
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of collateral deposited for `_asset`
     */
    function getAccountCollateralAmount(address _account, address _asset) external view returns (uint256);

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
    function previewFee(
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmount,
        uint256 _feeType
    ) external view returns (address[] memory, uint256[] memory);
}
