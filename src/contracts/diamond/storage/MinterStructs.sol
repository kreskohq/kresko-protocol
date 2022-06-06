// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../libraries/FixedPoint.sol";
import {AggregatorV2V3Interface} from "../vendor/flux/interfaces/AggregatorV2V3Interface.sol";

/*
 * ==================================================
 * =================== Structs ======================
 * ==================================================
 */

struct MinterInitParams {
    address operator;
    uint256 burnFee;
    address feeRecipient;
    uint256 liquidationIncentiveMultiplier;
    uint256 minimumCollateralizationRatio;
    uint256 minimumDebtValue;
}

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param underlyingRebasingToken If the collateral asset is an instance of NonRebasingWrapperToken,
 * this is set to the underlying token that rebases. Otherwise, this is the zero address.
 * Added so that Kresko.sol can handle NonRebasingWrapperTokens with fewer transactions.
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 */
struct CollateralAsset {
    FixedPoint.Unsigned factor;
    AggregatorV2V3Interface oracle;
    address underlyingRebasingToken;
    uint8 decimals;
    bool exists;
}

/**
 * @notice Information on a token that is a Kresko asset.
 * @dev Each Kresko asset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for Kresko asset debt.
 * @param oracle The oracle that provides the USD price of one Kresko asset.
 * @param exists Whether the Kresko asset exists within the protocol.
 * @param mintable Whether the Kresko asset can be minted.
 * @param marketCapUSDLimit The market capitalization limit in USD of the Kresko asset.
 */
struct KrAsset {
    FixedPoint.Unsigned kFactor;
    AggregatorV2V3Interface oracle;
    bool exists;
    bool mintable;
    uint256 marketCapUSDLimit;
}

struct MinterState {
    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Is initialized to the main diamond

    bool initialized;
    /// @notice Current storage version
    uint8 storageVersion;
    /// @notice Domain field separator
    bytes32 domainSeparator;
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */

    /// @notice The recipient of burn fees.
    address feeRecipient;
    /// @notice The percent fee imposed upon the value of burned krAssets, taken as collateral and sent to feeRecipient.
    FixedPoint.Unsigned burnFee;
    /// @notice The factor used to calculate the incentive a liquidator receives in the form of seized collateral.
    FixedPoint.Unsigned liquidationIncentiveMultiplier;
    /// @notice The absolute minimum ratio of collateral value to debt value used to calculate collateral requirements.
    FixedPoint.Unsigned minimumCollateralizationRatio;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    FixedPoint.Unsigned minimumDebtValue;
    /** @dev Old mapping for trusted addresses */
    mapping(address => bool) trustedContracts;
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                              Collateral Assets                             */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of collateral asset token address to information on the collateral asset.
    mapping(address => CollateralAsset) collateralAssets;
    /**
     * @notice Mapping of account address to a mapping of collateral asset token address to the amount of the collateral
     * asset the account has deposited.
     * @dev Collateral assets must not rebase.
     */
    mapping(address => mapping(address => uint256)) collateralDeposits;
    /// @notice Mapping of account address to an array of the addresses of each collateral asset the account
    /// has deposited.
    mapping(address => address[]) depositedCollateralAssets;
    /* -------------------------------------------------------------------------- */
    /*                                Kresko Assets                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of Kresko asset token address to information on the Kresko asset.
    mapping(address => KrAsset) kreskoAssets;
    /// @notice Mapping of Kresko asset symbols to whether the symbol is used by an existing Kresko asset.
    mapping(string => bool) kreskoAssetSymbols;
    /// @notice Mapping of account address to a mapping of Kresko asset token address to the amount of the Kresko asset
    /// the account has minted and therefore owes to the protocol.
    mapping(address => mapping(address => uint256)) kreskoAssetDebt;
    /// @notice Mapping of account address to an array of the addresses of each Kresko asset the account has minted.
    mapping(address => address[]) mintedKreskoAssets;
}
