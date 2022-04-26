// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "./flux/interfaces/AggregatorV2V3Interface.sol";

import "./libraries/FixedPoint.sol";
import "./libraries/FixedPointMath.sol";
import "./libraries/Arrays.sol";

/**
 * @title The core of the Kresko protocol.
 * @notice Responsible for managing collateral and minting / burning overcollateralized synthetic
 * assets called Kresko assets. Management of critical features such as adding new collateral
 * assets / Kresko assets and updating protocol constants such as the burn fee
 * minimum collateralization ratio, and liquidation incentive is restricted to the contract owner.
 */
contract Storage1 {

    /**
     * ==================================================
     * ==================== Structs =====================
     * ==================================================
     */

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

    /**
     * ==================================================
     * =================== Constants ====================
     * ==================================================
     */

    uint256 public constant ONE_HUNDRED_PERCENT = 1e18;

    /// @notice The maximum configurable burn fee.
    uint256 public constant MAX_BURN_FEE = 5e16; // 5%

    /// @notice The minimum configurable minimum collateralization ratio.
    uint256 public constant MIN_COLLATERALIZATION_RATIO = 1e18; // 100%

    /// @notice The minimum configurable liquidation incentive multiplier.
    /// This means liquidator only receives equal amount of collateral to debt repaid.
    uint256 public constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = 1e18; // 100%

    /// @notice The maximum configurable liquidation incentive multiplier.
    /// This means liquidator receives 25% bonus collateral compared to the debt repaid.
    uint256 public constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25e18; // 125%

    /// @notice The maximum configurable minimum debt USD value.
    uint256 public constant MAX_DEBT_VALUE = 1000e18; // $1,000

    /**
     * ==================================================
     * ===================== State ======================
     * ==================================================
     */

    /* ===== Configurable parameters ===== */

    mapping(address => bool) public trustedContracts;

    /// @notice The percent fee imposed upon the value of burned krAssets, taken as collateral and sent to feeRecipient.
    FixedPoint.Unsigned public burnFee;

    /// @notice The recipient of burn fees.
    address public feeRecipient;

    /// @notice The factor used to calculate the incentive a liquidator receives in the form of seized collateral.
    FixedPoint.Unsigned public liquidationIncentiveMultiplier;

    /// @notice The absolute minimum ratio of collateral value to debt value that is used to calculate
    /// collateral requirements.
    FixedPoint.Unsigned public minimumCollateralizationRatio;

    /// @notice The minimum USD value of an individual synthetic asset debt position.
    FixedPoint.Unsigned public minimumDebtValue;

    /// @notice The number of seconds until a price is considered stale
    uint256 public secondsUntilStalePrice;

    /* ===== General state - Collateral Assets ===== */

    /// @notice Mapping of collateral asset token address to information on the collateral asset.
    mapping(address => CollateralAsset) public collateralAssets;

    /**
     * @notice Mapping of account address to a mapping of collateral asset token address to the amount of the collateral
     * asset the account has deposited.
     * @dev Collateral assets must not rebase.
     */
    mapping(address => mapping(address => uint256)) public collateralDeposits;

    /// @notice Mapping of account address to an array of the addresses of each collateral asset the account
    /// has deposited.
    mapping(address => address[]) public depositedCollateralAssets;

    /* ===== General state - Kresko Assets ===== */

    /// @notice Mapping of Kresko asset token address to information on the Kresko asset.
    mapping(address => KrAsset) public kreskoAssets;

    /// @notice Mapping of Kresko asset symbols to whether the symbol is used by an existing Kresko asset.
    mapping(string => bool) public kreskoAssetSymbols;

    /// @notice Mapping of account address to a mapping of Kresko asset token address to the amount of the Kresko asset
    /// the account has minted and therefore owes to the protocol.
    mapping(address => mapping(address => uint256)) public kreskoAssetDebt;

    /// @notice Mapping of account address to an array of the addresses of each Kresko asset the account has minted.
    mapping(address => address[]) public mintedKreskoAssets;

}