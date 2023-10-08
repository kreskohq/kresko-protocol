// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {Action} from "common/Types.sol";

library MEvent {
    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Emitted when a collateral asset is added to the protocol.
     * @dev Can only be emitted once for a given collateral asset.
     * @param collateralAsset The address of the collateral asset.
     * @param factor The collateral factor.
     * @param liqIncentive The liquidation incentive
     */
    event CollateralAssetAdded(
        string indexed id,
        address indexed collateralAsset,
        uint256 factor,
        address anchor,
        uint256 liqIncentive
    );

    /**
     * @notice Emitted when a collateral asset is updated.
     * @param collateralAsset The address of the collateral asset.
     * @param factor The collateral factor.
     * @param liqIncentive The liquidation incentive
     */
    event CollateralAssetUpdated(
        string indexed id,
        address indexed collateralAsset,
        uint256 factor,
        address anchor,
        uint256 liqIncentive
    );

    /**
     * @notice Emitted when an account deposits collateral.
     * @param account The address of the account depositing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was deposited.
     */
    event CollateralDeposited(address indexed account, address indexed collateralAsset, uint256 amount);

    /**
     * @notice Emitted when an account withdraws collateral.
     * @param account The address of the account withdrawing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was withdrawn.
     */
    event CollateralWithdrawn(address indexed account, address indexed collateralAsset, uint256 amount);

    /**
     * @notice Emitted when AMM helper withdraws account collateral without MCR checks.
     * @param account The address of the account withdrawing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was withdrawn.
     */
    event UncheckedCollateralWithdrawn(address indexed account, address indexed collateralAsset, uint256 amount);

    /**
     * @notice Emitted when AMM oracle is set.
     * @param ammOracle The address of the AMM oracle.
     */
    event AMMOracleUpdated(address indexed ammOracle);

    /* -------------------------------------------------------------------------- */
    /*                                Kresko Assets                               */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Emitted when a KreskoAsset is added to the protocol.
     * @dev Can only be emitted once for a given Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param anchor anchor token
     * @param kFactor The k-factor.
     * @param supplyLimit The total supply limit.
     * @param closeFee The close fee percentage.
     * @param openFee The open fee percentage.
     */
    event KreskoAssetAdded(
        string indexed id,
        address indexed kreskoAsset,
        address anchor,
        uint256 kFactor,
        uint256 supplyLimit,
        uint256 closeFee,
        uint256 openFee
    );

    /**
     * @notice Emitted when a Kresko asset's oracle is updated.
     * @param kreskoAsset The address of the Kresko asset.
     * @param kFactor The k-factor.
     * @param supplyLimit The total supply limit.
     * @param closeFee The close fee percentage.
     * @param openFee The open fee percentage.
     */
    event KreskoAssetUpdated(
        string indexed id,
        address indexed kreskoAsset,
        address anchor,
        uint256 kFactor,
        uint256 supplyLimit,
        uint256 closeFee,
        uint256 openFee
    );

    /**
     * @notice Emitted when an account mints a Kresko asset.
     * @param account The address of the account minting the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the KreskoAsset that was minted.
     */
    event KreskoAssetMinted(address indexed account, address indexed kreskoAsset, uint256 amount);

    /**
     * @notice Emitted when an account burns a Kresko asset.
     * @param account The address of the account burning the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the KreskoAsset that was burned.
     */
    event KreskoAssetBurned(address indexed account, address indexed kreskoAsset, uint256 amount);

    /**
     * @notice Emitted when an account burns a Kresko asset.
     * @param account The address of the account burning the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the KreskoAsset that was burned.
     */
    event DebtPositionClosed(address indexed account, address indexed kreskoAsset, uint256 amount);

    /**
     * @notice Emitted when cFactor is updated for a collateral asset.
     * @param collateralAsset The address of the collateral asset.
     * @param cFactor The new cFactor
     */
    event CFactorUpdated(address indexed collateralAsset, uint256 cFactor);
    /**
     * @notice Emitted when kFactor is updated for a KreskoAsset.
     * @param kreskoAsset The address of the KreskoAsset.
     * @param kFactor The new kFactor
     */
    event KFactorUpdated(address indexed kreskoAsset, uint256 kFactor);

    /**
     * @notice Emitted when an account pays an open/close fee with a collateral asset in the Minter.
     * @dev This can be emitted multiple times for a single asset.
     * @param account Address of the account paying the fee.
     * @param paymentCollateralAsset Address of the collateral asset used to pay the fee.
     * @param feeType Fee type.
     * @param paymentAmount Amount of ollateral asset that was paid.
     * @param paymentValue USD value of the payment.
     */
    event FeePaid(
        address indexed account,
        address indexed paymentCollateralAsset,
        uint256 indexed feeType,
        uint256 paymentAmount,
        uint256 paymentValue,
        uint256 feeValue
    );

    /**
     * @notice Emitted when a liquidation occurs.
     * @param account The address of the account being liquidated.
     * @param liquidator The account performing the liquidation.
     * @param repayKreskoAsset The address of the KreskoAsset being paid back to the protocol by the liquidator.
     * @param repayAmount The amount of the repay KreskoAsset being paid back to the protocol by the liquidator.
     * @param seizedCollateralAsset The address of the collateral asset being seized from the account by the liquidator.
     * @param collateralSent The amount of the seized collateral asset being seized from the account by the liquidator.
     */
    event LiquidationOccurred(
        address indexed account,
        address indexed liquidator,
        address indexed repayKreskoAsset,
        uint256 repayAmount,
        address seizedCollateralAsset,
        uint256 collateralSent
    );

    /**
     * @notice Emitted when a liquidation of interest occurs.
     * @param account The address of the account being liquidated.
     * @param liquidator The account performing the liquidation.
     * @param repayKreskoAsset The address of the KreskoAsset being paid back to the protocol by the liquidator.
     * @param repayUSD The value of the repay KreskoAsset being paid back to the protocol by the liquidator.
     * @param seizedCollateralAsset The address of the collateral asset being seized from the account by the liquidator.
     * @param collateralSent The amount of the seized collateral asset being seized from the account by the liquidator.
     */
    event InterestLiquidationOccurred(
        address indexed account,
        address indexed liquidator,
        address indexed repayKreskoAsset,
        uint256 repayUSD,
        address seizedCollateralAsset,
        uint256 collateralSent
    );
    /**
     * @notice Emitted when a batch liquidation of interest occurs.
     * @param account The address of the account being liquidated.
     * @param liquidator The account performing the liquidation.
     * @param seizedCollateralAsset The address of the collateral asset being seized from the account by the liquidator.
     * @param repayUSD The value of the repay KreskoAsset being paid back to the protocol by the liquidator.
     * @param collateralSent The amount of the seized collateral asset being seized from the account by the liquidator.
     */
    event BatchInterestLiquidationOccurred(
        address indexed account,
        address indexed liquidator,
        address indexed seizedCollateralAsset,
        uint256 repayUSD,
        uint256 collateralSent
    );

    /* -------------------------------------------------------------------------- */
    /*                                Parameters                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Emitted when a safety state is triggered for an asset
     * @param action Target action
     * @param asset Asset affected
     * @param description change description
     */
    event SafetyStateChange(Action indexed action, address indexed asset, string indexed description);

    /**
     * @notice Emitted when the fee recipient is updated.
     * @param feeRecipient The new fee recipient.
     */
    event FeeRecipientUpdated(address indexed feeRecipient);

    /**
     * @notice Emitted when the liquidation incentive multiplier is updated.
     * @param asset The collateral asset being updated.
     * @param liqIncentiveMultiplier The new liquidation incentive multiplier raw value.
     */
    event LiquidationIncentiveMultiplierUpdated(address indexed asset, uint256 liqIncentiveMultiplier);

    /**
     * @notice Emitted when the max liquidation ratio is updated.
     * @param newMaxLiquidationRatio The new max liquidation ratio.
     */
    event MaxLiquidationRatioUpdated(uint256 newMaxLiquidationRatio);

    /**
     * @notice Emitted when the minimum collateralization ratio is updated.
     * @param minCollateralRatio The new minimum collateralization ratio raw value.
     */
    event MinimumCollateralizationRatioUpdated(uint256 minCollateralRatio);

    /**
     * @notice Emitted when the minimum debt value updated.
     * @param minDebtValue The new minimum debt value.
     */
    event MinimumDebtValueUpdated(uint256 minDebtValue);

    /**
     * @notice Emitted when the liquidation threshold value is updated
     * @param liquidationThreshold The new liquidation threshold value.
     */
    event LiquidationThresholdUpdated(uint256 liquidationThreshold);
}
