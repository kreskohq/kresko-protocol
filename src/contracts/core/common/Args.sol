// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

/**
 * @notice External, used when caling liquidate.
 * @param account The account to attempt to liquidate.
 * @param repayAssetAddr Address of the Kresko asset to be repaid.
 * @param repayAmount Amount of the Kresko asset to be repaid.
 * @param seizeAssetAddr Address of the collateral asset to be seized.
 * @param repayAssetIndex Index of the Kresko asset in the user's minted assets array.
 * @param seizeAssetIndex Index of the collateral asset in the account's collateral assets array.
 * @param prices Price update data for pyth.
 */
struct LiquidationArgs {
    address account;
    address repayAssetAddr;
    uint256 repayAmount;
    address seizeAssetAddr;
    uint256 repayAssetIndex;
    uint256 seizeAssetIndex;
    bytes[] prices;
}

/**
 * @notice Args to liquidate the collateral pool.
 * @notice Adjusts everyones deposits if swap deposits do not cover the seized amount.
 * @param repayAsset The asset to repay the debt in.
 * @param repayAmount The amount of the asset to repay the debt with.
 * @param seizeAsset The collateral asset to seize.
 * @param prices Price update data
 */
struct SCDPLiquidationArgs {
    address repayAsset;
    uint256 repayAmount;
    address seizeAsset;
}

/**
 * @notice Repay debt for no fees or slippage.
 * @notice Only uses swap deposits, if none available, reverts.
 * @param repayAsset The asset to repay the debt in.
 * @param repayAmount The amount of the asset to repay the debt with.
 * @param seizeAsset The collateral asset to seize.
 * @param prices Price update data
 */
struct SCDPRepayArgs {
    address repayAsset;
    uint256 repayAmount;
    address seizeAsset;
    bytes[] prices;
}

/**
 * @notice Withdraw collateral for account from the collateral pool.
 * @param _account The account to withdraw from.
 * @param _collateralAsset The collateral asset to withdraw.
 * @param _amount The amount to withdraw.
 * @param _receiver The receiver of assets, if 0 then the receiver is the account.
 */
struct SCDPWithdrawArgs {
    address account;
    address asset;
    uint256 amount;
    address receiver;
}

/**
 * @notice Swap kresko assets with KISS using the shared collateral pool.
 * Uses oracle pricing of _amountIn to determine how much _assetOut to send.
 * @param _account The receiver of amount out.
 * @param _assetIn The asset to pay with.
 * @param _assetOut The asset to receive.
 * @param _amountIn The amount of _assetIn to pay.
 * @param _amountOutMin The minimum amount of _assetOut to receive, this is due to possible oracle price change.
 * @param prices Price update data
 */
struct SwapArgs {
    address receiver;
    address assetIn;
    address assetOut;
    uint256 amountIn;
    uint256 amountOutMin;
    bytes[] prices;
}

/**
 * @notice Args to mint new Kresko assets.
 * @param account The address to mint assets for.
 * @param krAsset The address of the Kresko asset.
 * @param amount The amount of the Kresko asset to be minted.
 * @param receiver Receiver of the minted assets.
 */
struct MintArgs {
    address account;
    address krAsset;
    uint256 amount;
    address receiver;
}

/**
 * @param account The address to burn kresko assets for
 * @param krAsset The address of the Kresko asset.
 * @param amount The amount of the Kresko asset to be burned.
 * @param mintIndex The index of the kresko asset in the user's minted assets array.
 * Only needed if burning all principal debt of a particular collateral asset.
 * @param repayee Account to burn assets from,
 */
struct BurnArgs {
    address account;
    address krAsset;
    uint256 amount;
    uint256 mintIndex;
    address repayee;
}

/**
 * @notice Args to withdraw sender's collateral from the protocol.
 * @dev Requires that the post-withdrawal collateral value does not violate minimum collateral requirement.
 * @param account The address to withdraw assets for.
 * @param asset The address of the collateral asset.
 * @param amount The amount of the collateral asset to withdraw.
 * @param collateralIndex The index of the collateral asset in the sender's deposited collateral
 * @param receiver Receiver of the collateral, if address 0 then the receiver is the account.
 */
struct WithdrawArgs {
    address account;
    address asset;
    uint256 amount;
    uint256 collateralIndex;
    address receiver;
}

/**
 * @notice Withdraws sender's collateral from the protocol before checking minimum collateral ratio.
 * @dev Executes post-withdraw-callback triggering onUncheckedCollateralWithdraw on the caller
 * @dev Requires that the post-withdraw-callback collateral value does not violate minimum collateral requirement.
 * @param account The address to withdraw assets for.
 * @param asset The address of the collateral asset.
 * @param amount The amount of the collateral asset to withdraw.
 * @param collateralIndex The index of the collateral asset in the sender's deposited collateral
 * @param userData Arbitrary data passed in by the withdrawer, to be used by the post-withdraw-callback
 * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
 */
struct UncheckedWithdrawArgs {
    address account;
    address asset;
    uint256 amount;
    uint256 collateralIndex;
    bytes userData;
}
