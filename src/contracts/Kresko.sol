// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./utils/OwnableUpgradeable.sol";

import "./interfaces/IKreskoAsset.sol";
import "./interfaces/INonRebasingWrapperToken.sol";
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
contract Kresko is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPointMath for uint8;
    using FixedPointMath for uint256;
    using Arrays for address[];
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using SafeERC20Upgradeable for IERC20Upgradeable;

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
     * @param totalSupplyLimit The total supply limit of the Kresko asset.
     */
    struct KrAsset {
        FixedPoint.Unsigned kFactor;
        AggregatorV2V3Interface oracle;
        bool exists;
        bool mintable;
        uint256 totalSupplyLimit;
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

    /// @notice The collateralization ratio at which positions may be liquidated.
     FixedPoint.Unsigned public liquidationThreshold;

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

    /**
     * ==================================================
     * ===================== Events =====================
     * ==================================================
     */

    /* ===== Collateral ===== */

    /**
     * @notice Emitted when a collateral asset is added to the protocol.
     * @dev Can only be emitted once for a given collateral asset.
     * @param collateralAsset The address of the collateral asset.
     * @param factor The collateral factor.
     * @param oracle The address of the oracle.
     */
    event CollateralAssetAdded(address indexed collateralAsset, uint256 indexed factor, address indexed oracle);

    /**
     * @notice Emitted when a collateral asset is updated.
     * @param collateralAsset The address of the collateral asset.
     * @param factor The collateral factor.
     * @param oracle The oracle address.
     */
    event CollateralAssetUpdated(address indexed collateralAsset, uint256 indexed factor, address indexed oracle);

    /**
     * @notice Emitted when an account deposits collateral.
     * @param account The address of the account depositing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was deposited.
     */
    event CollateralDeposited(address indexed account, address indexed collateralAsset, uint256 indexed amount);

    /**
     * @notice Emitted when an account withdraws collateral.
     * @param account The address of the account withdrawing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was withdrawn.
     */
    event CollateralWithdrawn(address indexed account, address indexed collateralAsset, uint256 indexed amount);

    /* ===== Kresko Assets ===== */

    /**
     * @notice Emitted when a Kresko asset is added to the protocol.
     * @dev Can only be emitted once for a given Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param symbol The symbol of the Kresko asset.
     * @param kFactor The k-factor.
     * @param oracle The address of the oracle.
     * @param totalSupplyLimit The total supply limit.
     */
    event KreskoAssetAdded(
        address indexed kreskoAsset,
        string indexed symbol,
        uint256 indexed kFactor,
        address oracle,
        uint256 totalSupplyLimit
    );

    /**
     * @notice Emitted when a Kresko asset's oracle is updated.
     * @param kreskoAsset The address of the Kresko asset.
     * @param kFactor The k-factor.
     * @param oracle The address of the oracle.
     * @param mintable The mintable value.
     * @param totalSupplyLimit The total supply limit.
     */
    event KreskoAssetUpdated(
        address indexed kreskoAsset,
        uint256 indexed kFactor,
        address indexed oracle,
        bool mintable,
        uint256 totalSupplyLimit
    );

    /**
     * @notice Emitted when an account mints a Kresko asset.
     * @param account The address of the account minting the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the Kresko asset that was minted.
     */
    event KreskoAssetMinted(address indexed account, address indexed kreskoAsset, uint256 indexed amount);

    /**
     * @notice Emitted when an account burns a Kresko asset.
     * @param account The address of the account burning the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the Kresko asset that was burned.
     */
    event KreskoAssetBurned(address indexed account, address indexed kreskoAsset, uint256 indexed amount);

    /**
     * @notice Emitted when an account pays a burn fee with a collateral asset upon burning a Kresko asset.
     * @dev This can be emitted multiple times for a single Kresko asset burn.
     * @param account The address of the account burning the Kresko asset.
     * @param paymentCollateralAsset The address of the collateral asset used to pay the burn fee.
     * @param paymentAmount The amount of the payment collateral asset that was paid.
     * @param paymentValue The USD value of the payment.
     */
    event BurnFeePaid(
        address indexed account,
        address indexed paymentCollateralAsset,
        uint256 indexed paymentAmount,
        uint256 paymentValue
    );

    /**
     * @notice Emitted when a liquidation occurs.
     * @param account The address of the account being liquidated.
     * @param liquidator The account performing the liquidation.
     * @param repayKreskoAsset The address of the Kresko asset being paid back to the protocol by the liquidator.
     * @param repayAmount The amount of the repay Kresko asset being paid back to the protocol by the liquidator.
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

    /* ===== Configurable Parameters ===== */

    /**
     * @notice Emitted when the a trusted contract is added/removed.
     * @param contractAddress A trusted contract (eg. Kresko Zapper).
     * @param isTrusted true if the contract was added, false if removed
     */
    event TrustedContract(address indexed contractAddress, bool indexed isTrusted);

    /**
     * @notice Emitted when the burn fee is updated.
     * @param burnFee The new burn fee raw value.
     */
    event BurnFeeUpdated(uint256 indexed burnFee);

    /**
     * @notice Emitted when the fee recipient is updated.
     * @param feeRecipient The new fee recipient.
     */
    event FeeRecipientUpdated(address indexed feeRecipient);

    /**
     * @notice Emitted when the liquidation incentive multiplier is updated.
     * @param liquidationIncentiveMultiplier The new liquidation incentive multiplier raw value.
     */
    event LiquidationIncentiveMultiplierUpdated(uint256 indexed liquidationIncentiveMultiplier);

    /**
     * @notice Emitted when the minimum collateralization ratio is updated.
     * @param minimumCollateralizationRatio The new minimum collateralization ratio raw value.
     */
    event MinimumCollateralizationRatioUpdated(uint256 indexed minimumCollateralizationRatio);

    /**
     * @notice Emitted when the minimum debt value updated.
     * @param minimumDebtValue The new minimum debt value.
     */
    event MinimumDebtValueUpdated(uint256 indexed minimumDebtValue);

    /**
     * @notice Emitted when the liquidation threshold value is updated
     * @param liquidationThreshold The new liquidation threshold value.
     */
    event LiquidationThresholdUpdated(uint256 indexed liquidationThreshold);

    /**
     * ==================================================
     * =================== Modifiers ====================
     * ==================================================
     */

    /**
     * @notice Ensure only trusted contracts can act on behalf of `_account`
     * @param _accountIsNotMsgSender The address of the collateral asset.
     */
    modifier ensureTrustedCallerWhen(bool _accountIsNotMsgSender) {
        if (_accountIsNotMsgSender) {
            require(trustedContracts[msg.sender], "KR: Unauthorized caller");
        }
        _;
    }

    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(collateralAssets[_collateralAsset].exists, "KR: !collateralExists");
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!collateralAssets[_collateralAsset].exists, "KR: collateralExists");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol or is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsAndMintable(address _kreskoAsset) {
        require(kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        require(kreskoAssets[_kreskoAsset].mintable, "KR: !krAssetMintable");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExistsMaybeNotMintable(address _kreskoAsset) {
        require(kreskoAssets[_kreskoAsset].exists, "KR: !krAssetExist");
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _symbol The symbol of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset, string calldata _symbol) {
        require(!kreskoAssets[_kreskoAsset].exists, "KR: krAssetExists");
        require(!kreskoAssetSymbols[_symbol], "KR: symbolExists");
        _;
    }

    /**
     * @notice Reverts if a Kresko asset's market is currently closed
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetMarketOpen(address _kreskoAsset) {
        require(kreskoAssets[_kreskoAsset].oracle.latestMarketOpen(), "KR: market closed");
        _;
    }

    /**
     * @notice Reverts if provided string is empty.
     * @param _str The string to ensure is not empty.
     */
    modifier nonNullString(string calldata _str) {
        require(bytes(_str).length > 0, "KR: !string");
        _;
    }

    /**
     * @notice Empty constructor, see `initialize`.
     * @dev Protects against a call to initialize when this contract is called directly without a proxy.
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
        // Intentionally left blank.
    }

    /**
     * @notice Initializes the core Kresko protocol.
     * @param _burnFee Initial burn fee as a raw value for a FixedPoint.Unsigned.
     * @param _feeRecipient Initial fee recipient.
     * @param _liquidationIncentiveMultiplier Initial liquidation incentive multiplier.
     * @param _minimumCollateralizationRatio Initial collateralization ratio as a raw value for a FixedPoint.Unsigned.
     * @param _minimumDebtValue Initial minimum debt value denominated in USD.
     * @param _liquidationThreshold Initial liquidation threshold as a raw value for a FixedPoint.Unsigned.
     */
    function initialize(
        uint256 _burnFee,
        address _feeRecipient,
        uint256 _liquidationIncentiveMultiplier,
        uint256 _minimumCollateralizationRatio,
        uint256 _minimumDebtValue,
        uint256 _liquidationThreshold
    ) external initializer {
        // Set msg.sender as the owner.
        __Ownable_init();
        updateBurnFee(_burnFee);
        updateFeeRecipient(_feeRecipient);
        updateLiquidationIncentiveMultiplier(_liquidationIncentiveMultiplier);
        updateMinimumCollateralizationRatio(_minimumCollateralizationRatio);
        updateMinimumDebtValue(_minimumDebtValue);
        updateLiquidationThreshold(_liquidationThreshold);
    }

    /**
     * ==================================================
     * ======== Core external & public functions ========
     * ==================================================
     */

    /* ===== Collateral ===== */

    /**
     * @notice Deposits collateral into the protocol.
     * @param _account The user to deposit collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to deposit.
     */
    function depositCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) external nonReentrant collateralAssetExists(_collateralAsset) {
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
        IERC20MetadataUpgradeable(_collateralAsset).safeTransferFrom(msg.sender, address(this), _amount);

        // Record the collateral deposit.
        _recordCollateralDeposit(_account, _collateralAsset, _amount);
    }

    /**
     * @notice Deposits a rebasing collateral into the protocol by wrapping the underlying
     * rebasing token.
     * @param _account The user to deposit collateral for.
     * @param _collateralAsset The address of the NonRebasingWrapperToken collateral asset.
     * @param _rebasingAmount The amount of the underlying rebasing token to deposit.
     */
    function depositRebasingCollateral(
        address _account,
        address _collateralAsset,
        uint256 _rebasingAmount
    ) external nonReentrant collateralAssetExists(_collateralAsset) {
        require(_rebasingAmount > 0, "KR: 0-deposit");

        address underlyingRebasingToken = collateralAssets[_collateralAsset].underlyingRebasingToken;
        require(underlyingRebasingToken != address(0), "KR: !NRWTCollateral");

        // Transfer underlying rebasing token in.
        IERC20Upgradeable(underlyingRebasingToken).safeTransferFrom(msg.sender, address(this), _rebasingAmount);

        // Approve the newly received rebasing token to the NonRebasingWrapperToken in preparation
        // for calling depositUnderlying.
        require(
            IERC20Upgradeable(underlyingRebasingToken).approve(_collateralAsset, _rebasingAmount),
            "KR: ApprovalFail"
        );

        // Wrap into NonRebasingWrapperToken.
        uint256 nonRebasingAmount = INonRebasingWrapperToken(_collateralAsset).depositUnderlying(_rebasingAmount);

        // Record the collateral deposit.
        _recordCollateralDeposit(_account, _collateralAsset, nonRebasingAmount);
    }

    /**
     * @notice Withdraws sender's collateral from the protocol.
     * @dev Requires the post-withdrawal collateral value to violate minimum collateral requirement.
     * @param _account The address to withdraw assets for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to withdraw.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the sender's deposited collateral
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant collateralAssetExists(_collateralAsset) ensureTrustedCallerWhen(_account != msg.sender) {
        uint256 depositAmount = collateralDeposits[_account][_collateralAsset];
        _amount = (_amount <= depositAmount ? _amount : depositAmount);
        _verifyAndRecordCollateralWithdrawal(
            _account,
            _collateralAsset,
            _amount,
            depositAmount,
            _depositedCollateralAssetIndex
        );

        IERC20MetadataUpgradeable(_collateralAsset).safeTransfer(_account, _amount);
    }

    /**
     * @notice Withdraws NonRebasingWrapperToken collateral from the protocol and unwraps it.
     * @param _account The address to withdraw assets for.
     * @param _collateralAsset The address of the NonRebasingWrapperToken collateral asset.
     * @param _amount The amount of the NonRebasingWrapperToken collateral asset to withdraw.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the sender's deposited collateral
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawRebasingCollateral(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant collateralAssetExists(_collateralAsset) ensureTrustedCallerWhen(_account != msg.sender) {
        uint256 depositAmount = collateralDeposits[_account][_collateralAsset];
        _amount = (_amount <= depositAmount ? _amount : depositAmount);
        _verifyAndRecordCollateralWithdrawal(
            _account,
            _collateralAsset,
            _amount,
            depositAmount,
            _depositedCollateralAssetIndex
        );

        address underlyingRebasingToken = collateralAssets[_collateralAsset].underlyingRebasingToken;
        require(underlyingRebasingToken != address(0), "KR: !NRWTCollateral");

        // Unwrap the NonRebasingWrapperToken into the rebasing underlying.
        uint256 underlyingAmountWithdrawn = INonRebasingWrapperToken(_collateralAsset).withdrawUnderlying(_amount);

        // Transfer the sender the rebasing underlying.
        IERC20MetadataUpgradeable(underlyingRebasingToken).safeTransfer(_account, underlyingAmountWithdrawn);
    }

    /* ===== Kresko Assets ===== */

    /**
     * @notice Mints new Kresko assets.
     * @param _account The address to mint assets for.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to be minted.
     */
    function mintKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount
    ) external
        nonReentrant
        kreskoAssetExistsAndMintable(_kreskoAsset)
        kreskoAssetMarketOpen(_kreskoAsset)
        ensureTrustedCallerWhen(_account != msg.sender)
    {
        require(_amount > 0, "KR: 0-mint");

        // Enforce krAsset's total supply limit
        require(
            getKrAssetValue(_kreskoAsset, IKreskoAsset(_kreskoAsset).totalSupply() + _amount, true).rawValue <=
                kreskoAssets[_kreskoAsset].totalSupplyLimit,
            "KR: supplyLimit"
        );

        // Get the value of the minter's current deposited collateral.
        FixedPoint.Unsigned memory accountCollateralValue = getAccountCollateralValue(_account);
        // Get the account's current minimum collateral value required to maintain current debts.
        FixedPoint.Unsigned memory minAccountCollateralValue = getAccountMinimumCollateralValueAtRatio(
            _account,
            minimumCollateralizationRatio
        );
        // Calculate additional collateral amount required to back requested additional mint.
        FixedPoint.Unsigned memory additionalCollateralValue = getMinimumCollateralValueAtRatio(
            _kreskoAsset,
            _amount,
            minimumCollateralizationRatio
        );

        // Verify that minter has sufficient collateral to back current debt + new requested debt.
        require(
            minAccountCollateralValue.add(additionalCollateralValue).isLessThanOrEqual(accountCollateralValue),
            "KR: insufficientCollateral"
        );

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebtAmount = kreskoAssetDebt[_account][_kreskoAsset];
        require(
            getKrAssetValue(_kreskoAsset, existingDebtAmount + _amount, true).isGreaterThanOrEqual(minimumDebtValue),
            "KR: belowMinDebtValue"
        );

        // If the account does not have an existing debt for this Kresko Asset,
        // push it to the list of the account's minted Kresko Assets.
        if (existingDebtAmount == 0) {
            mintedKreskoAssets[_account].push(_kreskoAsset);
        }
        // Record the mint.
        kreskoAssetDebt[_account][_kreskoAsset] = existingDebtAmount + _amount;

        IKreskoAsset(_kreskoAsset).mint(_account, _amount);

        emit KreskoAssetMinted(_account, _kreskoAsset, _amount);
    }

    /**
     * @notice Burns existing Kresko assets.
     * @param _account The address to burn kresko assets for
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to be burned.
     * @param _mintedKreskoAssetIndex The index of the collateral asset in the user's minted assets array.
     * @notice Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function burnKreskoAsset(
        address _account,
        address _kreskoAsset,
        uint256 _amount,
        uint256 _mintedKreskoAssetIndex
    )
        external
        nonReentrant
        kreskoAssetExistsMaybeNotMintable(_kreskoAsset)
        kreskoAssetMarketOpen(_kreskoAsset)
        ensureTrustedCallerWhen(_account != msg.sender)
    {
        require(_amount > 0, "KR: 0-burn");

        // Ensure the amount being burned is not greater than the user's debt.
        uint256 debtAmount = kreskoAssetDebt[_account][_kreskoAsset];
        require(_amount <= debtAmount, "KR: amount > debt");

        // If the requested burn would put the user's debt position below the minimum
        // debt value, close up to the minimum debt value instead.
        FixedPoint.Unsigned memory krAssetValue = getKrAssetValue(_kreskoAsset, debtAmount - _amount, true);
        if (krAssetValue.isGreaterThan(0) && krAssetValue.isLessThan(minimumDebtValue)) {
            FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(kreskoAssets[_kreskoAsset].oracle.latestAnswer()));
            FixedPoint.Unsigned memory minDebtAmount = minimumDebtValue.div(oraclePrice);
            _amount = debtAmount - minDebtAmount.rawValue;
        }

        // Record the burn.
        kreskoAssetDebt[_account][_kreskoAsset] -= _amount;

        // If the sender is burning all of the kresko asset, remove it from minted assets array.
        if (_amount == debtAmount) {
            mintedKreskoAssets[_account].removeAddress(_kreskoAsset, _mintedKreskoAssetIndex);
        }

        _chargeBurnFee(_account, _kreskoAsset, _amount);

        // Burn the received kresko assets, removing them from circulation.
        IKreskoAsset(_kreskoAsset).burn(msg.sender, _amount);

        emit KreskoAssetBurned(_account, _kreskoAsset, _amount);
    }

    // * ===== Liquidation ===== */

    /**
     * @notice Attempts to liquidate an account by repaying the portion of the account's Kresko asset
     *         debt, receiving in return a portion of the account's collateral at a discounted rate.
     * @param _account The account to attempt to liquidate.
     * @param _repayKreskoAsset The address of the Kresko asset to be repaid.
     * @param _repayAmount The amount of the Kresko asset to be repaid.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     * @param _mintedKreskoAssetIndex The index of the Kresko asset in the account's minted assets array.
     * @param _depositedCollateralAssetIndex Index of the collateral asset in the account's collateral assets array.
     * @param _keepKrAssetDebt Liquidator can choose to receive the whole seized amount keeping the krAsset debt.
     * Setting _keepKrAssetDebt to false will instead only send the incentive and repay krAsset debt.
     */

    function liquidate(
        address _account,
        address _repayKreskoAsset,
        uint256 _repayAmount,
        address _collateralAssetToSeize,
        uint256 _mintedKreskoAssetIndex,
        uint256 _depositedCollateralAssetIndex,
        bool _keepKrAssetDebt
    ) external nonReentrant {
        // Require checks not used with modifiers to avoid stack too deep errors
        {
            require(kreskoAssets[_repayKreskoAsset].exists, "KR: !krAssetExist");
            require(collateralAssets[_collateralAssetToSeize].exists, "KR: !collateralExists");
            require(_repayAmount > 0, "KR: 0-repay");
            // Borrower cannot liquidate themselves
            require(msg.sender != _account, "KR: self liquidation");

            // Check that this account is below liquidation threshold and can be liquidated.
            require(isAccountLiquidatable(_account), "KR: !accountLiquidatable");
        }

        // Repay amount USD = repay amount * KR asset USD exchange rate.
        FixedPoint.Unsigned memory repayAmountUSD = FixedPoint.Unsigned(_repayAmount).mul(
            FixedPoint.Unsigned(uint256(kreskoAssets[_repayKreskoAsset].oracle.latestAnswer()))
        );

        // Get the token debt amount
        uint256 krAssetDebt = kreskoAssetDebt[_account][_repayKreskoAsset];
        // Avoid stack too deep error
        {
            // Liquidator may not repay more value than what the liquidation pair allows
            // Nor repay more tokens than the account holds debt for the asset
            FixedPoint.Unsigned memory maxLiquidation = calculateMaxLiquidatableValueForAssets(
                _account,
                _repayKreskoAsset,
                _collateralAssetToSeize
            );
            require(krAssetDebt >= _repayAmount, "KR: repayAmount > debtAmount");
            require(repayAmountUSD.isLessThanOrEqual(maxLiquidation), "KR: repayUSD > maxUSD");
        }

        FixedPoint.Unsigned memory collateralPriceUSD = FixedPoint.Unsigned(
            uint256(collateralAssets[_collateralAssetToSeize].oracle.latestAnswer())
        );

        // Get the actual seized amount
        uint256 seizeAmount = _liquidateAssets(
            _account,
            krAssetDebt,
            _repayAmount,
            collateralAssets[_collateralAssetToSeize].decimals
                ._fromCollateralFixedPointAmount(
                    liquidationIncentiveMultiplier._calculateAmountToSeize(collateralPriceUSD, repayAmountUSD)
            ),
            _repayKreskoAsset,
            _mintedKreskoAssetIndex,
            _collateralAssetToSeize,
            _depositedCollateralAssetIndex
        );

        // Charge burn fee from the liquidated user
        _chargeBurnFee(_account, _repayKreskoAsset, _repayAmount);

        // Burn the received Kresko assets, removing them from circulation.
        IKreskoAsset(_repayKreskoAsset).burn(msg.sender, _repayAmount);

        uint256 collateralToSend = _keepKrAssetDebt
            ? seizeAmount
            : _calculateCollateralToSendAndAdjustDebt(
                _collateralAssetToSeize,
                _repayKreskoAsset,
                _repayAmount,
                seizeAmount,
                repayAmountUSD,
                collateralPriceUSD
            );

        // Send liquidator the seized collateral.
        IERC20MetadataUpgradeable(_collateralAssetToSeize).safeTransfer(msg.sender, collateralToSend);

        emit LiquidationOccurred(
            _account,
            msg.sender,
            _repayKreskoAsset,
            _repayAmount,
            _collateralAssetToSeize,
            collateralToSend
        );
    }

    /**
     * ==================================================
     * ============== Owner-only functions ==============
     * ==================================================
     */

    /* ===== Collateral ===== */

    /**
     * @notice Adds a collateral asset to the protocol.
     * @dev Only callable by the owner and cannot be called more than once for an asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _factor The collateral factor of the collateral asset as a raw value for a FixedPoint.Unsigned.
     * Must be <= 1e18.
     * @param _oracle The oracle address for the collateral asset's USD value.
     */
    function addCollateralAsset(
        address _collateralAsset,
        uint256 _factor,
        address _oracle,
        bool isNonRebasingWrapperToken
    ) external nonReentrant onlyOwner collateralAssetDoesNotExist(_collateralAsset) {
        require(_collateralAsset != address(0), "KR: !collateralAddr");
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, "KR: factor > 1FP");
        require(_oracle != address(0), "KR: !oracleAddr");

        // Set as the rebasing underlying token if the collateral asset is a
        // NonRebasingWrapperToken, otherwise set as address(0).
        address underlyingRebasingToken = isNonRebasingWrapperToken
            ? INonRebasingWrapperToken(_collateralAsset).underlyingToken()
            : address(0);

        collateralAssets[_collateralAsset] = CollateralAsset({
            factor: FixedPoint.Unsigned(_factor),
            oracle: AggregatorV2V3Interface(_oracle),
            underlyingRebasingToken: underlyingRebasingToken,
            exists: true,
            decimals: IERC20MetadataUpgradeable(_collateralAsset).decimals()
        });
        emit CollateralAssetAdded(_collateralAsset, _factor, _oracle);
    }

     /**
     * @notice Updates a previously added collateral asset.
     * @dev Only callable by the owner.
     * @param _collateralAsset The address of the collateral asset.
     * @param _factor The new collateral factor as a raw value for a FixedPoint.Unsigned. Must be <= 1e18.
     * @param _oracle The new oracle address for the collateral asset.
     */
    function updateCollateralAsset(address _collateralAsset, uint256 _factor, address _oracle)
        external
        onlyOwner
        collateralAssetExists(_collateralAsset)
    {
        require(_oracle != address(0), "KR: !oracleAddr");
        // Setting the factor to 0 effectively sunsets a collateral asset, which is intentionally allowed.
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, "KR: factor > 1FP");

        collateralAssets[_collateralAsset].factor = FixedPoint.Unsigned(_factor);
        collateralAssets[_collateralAsset].oracle = AggregatorV2V3Interface(_oracle);
        emit CollateralAssetUpdated(_collateralAsset, _factor, _oracle);
    }

    /* ===== Kresko Assets ===== */

    /**
     * @notice Adds a Kresko asset to the protocol.
     * @dev Only callable by the owner and cannot be called more than once for a given symbol.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _symbol The symbol of the Kresko asset.
     * @param _kFactor The k-factor of the Kresko asset as a raw value for a FixedPoint.Unsigned. Must be >= 1e18.
     * @param _oracle The oracle address for the Kresko asset.
     * @param _totalSupplyLimit The initial total supply limit for the Kresko asset.
     */
    function addKreskoAsset(
        address _kreskoAsset,
        string calldata _symbol,
        uint256 _kFactor,
        address _oracle,
        uint256 _totalSupplyLimit
    ) external onlyOwner nonNullString(_symbol) kreskoAssetDoesNotExist(_kreskoAsset, _symbol) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, "KR: kFactor < 1FP");
        require(_oracle != address(0), "KR: !oracleAddr");
        IKreskoAsset kreskoAsset = IKreskoAsset(_kreskoAsset);
        require(kreskoAsset.hasRole(kreskoAsset.OPERATOR_ROLE(), address(this)), "KR: !assetOperator");

        // Store symbol to prevent duplicate KreskoAsset symbols.
        kreskoAssetSymbols[_symbol] = true;

        // Deploy KreskoAsset contract and store its details.
        kreskoAssets[_kreskoAsset] = KrAsset({
            kFactor: FixedPoint.Unsigned(_kFactor),
            oracle: AggregatorV2V3Interface(_oracle),
            exists: true,
            mintable: true,
            totalSupplyLimit: _totalSupplyLimit
        });
        emit KreskoAssetAdded(_kreskoAsset, _symbol, _kFactor, _oracle, _totalSupplyLimit);
    }

    /**
     * @notice Updates the k-factor of a previously added Kresko asset.
     * @dev Only callable by the owner.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _kFactor The new k-factor as a raw value for a FixedPoint.Unsigned. Must be >= 1e18.
     * @param _oracle The new oracle address for the Kresko asset's USD value.
     * @param _mintable The new mintable value.
     * @param _totalSupplyLimit The new total supply limit.
     */
    function updateKreskoAsset(
        address _kreskoAsset,
        uint256 _kFactor,
        address _oracle,
        bool _mintable,
        uint256 _totalSupplyLimit
    )
        external
        onlyOwner
        kreskoAssetExistsMaybeNotMintable(_kreskoAsset)
    {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, "KR: kFactor < 1FP");
        require(_oracle != address(0), "KR: !oracleAddr");

        KrAsset memory krAsset = kreskoAssets[_kreskoAsset];
        krAsset.kFactor = FixedPoint.Unsigned(_kFactor);
        krAsset.oracle = AggregatorV2V3Interface(_oracle);
        krAsset.mintable = _mintable;
        krAsset.totalSupplyLimit = _totalSupplyLimit;
        kreskoAssets[_kreskoAsset] = krAsset;

        emit KreskoAssetUpdated(_kreskoAsset, _kFactor, _oracle, _mintable, _totalSupplyLimit);
    }

    /* ===== Configurable parameters ===== */
    /**
     * @notice Toggles a trusted contract to perform actions on behalf of user (eg. Kresko Zapper).
     * @param _trustedContract Contract to toggle the trusted status for.
     */
    function toggleTrustedContract(address _trustedContract) external onlyOwner {
        bool isTrusted = !trustedContracts[_trustedContract];

        trustedContracts[_trustedContract] = isTrusted;

        emit TrustedContract(_trustedContract, isTrusted);
    }

    /**
     * @notice Updates the burn fee.
     * @param _burnFee The new burn fee as a raw value for a FixedPoint.Unsigned.
     */
    function updateBurnFee(uint256 _burnFee) public onlyOwner {
        require(_burnFee <= MAX_BURN_FEE, "KR: burnFee > max");
        burnFee = FixedPoint.Unsigned(_burnFee);
        emit BurnFeeUpdated(_burnFee);
    }

    /**
     * @notice Updates the fee recipient.
     * @param _feeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _feeRecipient) public onlyOwner {
        require(_feeRecipient != address(0), "KR: !feeRecipient");
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @notice Updates the liquidation incentive multiplier.
     * @param _liquidationIncentiveMultiplier The new liquidation incentive multiplie.
     */
    function updateLiquidationIncentiveMultiplier(uint256 _liquidationIncentiveMultiplier) public onlyOwner {
        require(_liquidationIncentiveMultiplier >= MIN_LIQUIDATION_INCENTIVE_MULTIPLIER, "KR: liqIncentiveMulti < min");
        require(_liquidationIncentiveMultiplier <= MAX_LIQUIDATION_INCENTIVE_MULTIPLIER, "KR: liqIncentiveMulti > max");
        liquidationIncentiveMultiplier = FixedPoint.Unsigned(_liquidationIncentiveMultiplier);
        emit LiquidationIncentiveMultiplierUpdated(_liquidationIncentiveMultiplier);
    }

    /**
     * @dev Updates the contract's collateralization ratio.
     * @param _minimumCollateralizationRatio The new minimum collateralization ratio as a raw value
     * for a FixedPoint.Unsigned.
     */
    function updateMinimumCollateralizationRatio(uint256 _minimumCollateralizationRatio) public onlyOwner {
        require(_minimumCollateralizationRatio >= MIN_COLLATERALIZATION_RATIO, "KR: minCollateralRatio < min");
        minimumCollateralizationRatio = FixedPoint.Unsigned(_minimumCollateralizationRatio);
        emit MinimumCollateralizationRatioUpdated(_minimumCollateralizationRatio);
    }

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _minimumDebtValue The new minimum debt value as a raw value for a FixedPoint.Unsigned.
     */
    function updateMinimumDebtValue(uint256 _minimumDebtValue) public onlyOwner {
        require(_minimumDebtValue <= MAX_DEBT_VALUE, "KR: debtValue > max");
        minimumDebtValue = FixedPoint.Unsigned(_minimumDebtValue);
        emit MinimumDebtValueUpdated(_minimumDebtValue);
    }

    /**
     * @dev Updates the contract's liquidation threshold value
     * @param _liquidationThreshold The new liquidation threshold value
     */
    function updateLiquidationThreshold(uint256 _liquidationThreshold) public onlyOwner {
        // Liquidation threshold cannot be greater than minimum collateralization ratio
        require(FixedPoint.Unsigned(_liquidationThreshold).isLessThanOrEqual(minimumCollateralizationRatio), "KR: LT > MCR");
        liquidationThreshold = FixedPoint.Unsigned(_liquidationThreshold);
        emit LiquidationThresholdUpdated(_liquidationThreshold);
    }

    /**
     * ==================================================
     * ============= Core internal functions ============
     * ==================================================
     */

    /* ==== Collateral ==== */

    /**
     * @notice Records account as having deposited an amount of a collateral asset.
     * @dev Token transfers are expected to be done by the caller.
     * @param _account The address of the collateral asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset deposited.
     */
    function _recordCollateralDeposit(
        address _account,
        address _collateralAsset,
        uint256 _amount
    ) internal {
        // Because the depositedCollateralAssets[_account] is pushed to if the existing
        // deposit amount is 0, require the amount to be > 0. Otherwise, the depositedCollateralAssets[_account]
        // could be filled with duplicates, causing collateral to be double-counted in the collateral value.
        require(_amount > 0, "KR: 0-deposit");

        // If the account does not have an existing deposit for this collateral asset,
        // push it to the list of the account's deposited collateral assets.
        uint256 existingDepositAmount = collateralDeposits[_account][_collateralAsset];
        if (existingDepositAmount == 0) {
            depositedCollateralAssets[_account].push(_collateralAsset);
        }
        // Record the deposit.
        unchecked {
            collateralDeposits[_account][_collateralAsset] = existingDepositAmount + _amount;
        }

        emit CollateralDeposited(_account, _collateralAsset, _amount);
    }

    function _verifyAndRecordCollateralWithdrawal(
        address _account,
        address _collateralAsset,
        uint256 _amount,
        uint256 _depositAmount,
        uint256 _depositedCollateralAssetIndex
    ) internal {
        require(_amount > 0, "KR: 0-withdraw");

        // Ensure the withdrawal does not result in the account having a collateral value
        // under the minimum collateral amount required to maintain a healthy position.
        // I.e. the new account's collateral value must still exceed the account's minimum
        // collateral value.
        // Get the account's current collateral value.
        FixedPoint.Unsigned memory accountCollateralValue = getAccountCollateralValue(_account);
        // Get the collateral value that the account will lose as a result of this withdrawal.
        (FixedPoint.Unsigned memory withdrawnCollateralValue, ) = getCollateralValueAndOraclePrice(
            _collateralAsset,
            _amount,
            false // Take the collateral factor into consideration.
        );
        // Get the account's minimum collateral value.
        FixedPoint.Unsigned memory accountMinCollateralValue = getAccountMinimumCollateralValueAtRatio(
            _account,
            minimumCollateralizationRatio
        );
        // Require accountCollateralValue - withdrawnCollateralValue >= accountMinCollateralValue.
        require(
            accountCollateralValue.sub(withdrawnCollateralValue).isGreaterThanOrEqual(accountMinCollateralValue),
            "KR: collateralTooLow"
        );

        // Record the withdrawal.
        collateralDeposits[_account][_collateralAsset] = _depositAmount - _amount;

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (_amount == _depositAmount) {
            depositedCollateralAssets[_account].removeAddress(_collateralAsset, _depositedCollateralAssetIndex);
        }

        emit CollateralWithdrawn(_account, _collateralAsset, _amount);
    }

    /* ==== Kresko Assets ==== */

    /**
     * @notice Charges the protocol burn fee based off the value of the burned asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the burn fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _kreskoAssetAmountBurned The amount of the kresko asset being burned.
     */
    function _chargeBurnFee(
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmountBurned
    ) internal {
        KrAsset memory krAsset = kreskoAssets[_kreskoAsset];
        // Calculate the value of the fee according to the value of the krAssets being burned.
        FixedPoint.Unsigned memory feeValue = FixedPoint
            .Unsigned(uint256(krAsset.oracle.latestAnswer()))
            .mul(FixedPoint.Unsigned(_kreskoAssetAmountBurned))
            .mul(burnFee);

        // Do nothing if the fee value is 0.
        if (feeValue.rawValue == 0) {
            return;
        }

        address[] memory accountCollateralAssets = depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.
        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];

            (uint256 transferAmount, FixedPoint.Unsigned memory feeValuePaid) = _calcBurnFee(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            // Remove the transferAmount from the stored deposit for the account.
            collateralDeposits[_account][collateralAssetAddress] -= transferAmount;
            // Transfer the fee to the feeRecipient.
            IERC20MetadataUpgradeable(collateralAssetAddress).safeTransfer(feeRecipient, transferAmount);
            emit BurnFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);

            feeValue = feeValue.sub(feeValuePaid);
            // If the entire fee has been paid, no more action needed.
            if (feeValue.rawValue == 0) {
                return;
            }
        }
    }

    /**
     * @notice Calculates the burn fee for a burned asset.
     * @param _collateralAssetAddress The collateral asset from which to take to the fee.
     * @param _account The owner of the collateral.
     * @param _feeValue The original value of the fee.
     * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
     * @return The transfer amount to be received as a uint256 and a FixedPoint.Unsigned
     * representing the fee value paid.
     */
    function _calcBurnFee(
        address _collateralAssetAddress,
        address _account,
        FixedPoint.Unsigned memory _feeValue,
        uint256 _collateralAssetIndex
    ) internal returns (uint256, FixedPoint.Unsigned memory) {
        uint256 depositAmount = collateralDeposits[_account][_collateralAssetAddress];

        // Don't take the collateral asset's collateral factor into consideration.
        (
            FixedPoint.Unsigned memory depositValue,
            FixedPoint.Unsigned memory oraclePrice
        ) = getCollateralValueAndOraclePrice(_collateralAssetAddress, depositAmount, true);

        FixedPoint.Unsigned memory feeValuePaid;
        uint256 transferAmount;
        // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
        if (_feeValue.isLessThan(depositValue)) {
            // We want to make sure that transferAmount is < depositAmount.
            // Proof:
            //   depositValue <= oraclePrice * depositAmount (<= due to a potential loss of precision)
            //   feeValue < depositValue
            // Meaning:
            //   feeValue < oraclePrice * depositAmount
            // Solving for depositAmount we get:
            //   feeValue / oraclePrice < depositAmount
            // Due to integer division:
            //   transferAmount = floor(feeValue / oracleValue)
            //   transferAmount <= feeValue / oraclePrice
            // We see that:
            //   transferAmount <= feeValue / oraclePrice < depositAmount
            //   transferAmount < depositAmount
            transferAmount = collateralAssets[_collateralAssetAddress].decimals._fromCollateralFixedPointAmount(
                _feeValue.div(oraclePrice)
            );
            feeValuePaid = _feeValue;
        } else {
            // If the feeValue >= depositValue, the entire deposit
            // should be taken as the fee.
            transferAmount = depositAmount;
            feeValuePaid = depositValue;
            // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
            depositedCollateralAssets[_account].removeAddress(_collateralAssetAddress, _collateralAssetIndex);
        }
        return (transferAmount, feeValuePaid);
    }

    /* ==== Liquidation ==== */

    /**
     * @notice Calculates the liquidation incentive collateral amount to be sent to the liquidator
     * @param _repayKreskoAsset krAsset debt to be repaid.
     * @param _repayAmount krAsset amount to be repaid.
     * @param _seizeAmount The calculated amount of collateral assets to be seized.
     * @param _repayAmountUSD Total USD value of krAsset repayment.
     * @param _collateralPriceUSD Single collateral units USD price.
     */
    function _calculateCollateralToSendAndAdjustDebt(
        address _collateralSeized,
        address _repayKreskoAsset,
        uint256 _repayAmount,
        uint256 _seizeAmount,
        FixedPoint.Unsigned memory _repayAmountUSD,
        FixedPoint.Unsigned memory _collateralPriceUSD
    ) internal returns (uint256) {
        uint256 liquidatorDebtBeforeRepay = kreskoAssetDebt[msg.sender][_repayKreskoAsset];

        // Decrease liquidator's debt. If liquidator has no debt remaining set the debt to 0
        uint256 liquidatorDebtAfterRepay = liquidatorDebtBeforeRepay > _repayAmount
            ? liquidatorDebtBeforeRepay - _repayAmount
            : 0;
        kreskoAssetDebt[msg.sender][_repayKreskoAsset] = liquidatorDebtAfterRepay;

        // If liquidator's debt had debt of this krAsset before and now has 0 debt, remove the krAsset from their minted assets
        if (liquidatorDebtBeforeRepay > 0 && liquidatorDebtAfterRepay == 0) {
            uint256 liquidatorRepayIndex;
            address[] memory liquidatorAssets = mintedKreskoAssets[msg.sender];

            for (liquidatorRepayIndex; liquidatorRepayIndex < liquidatorAssets.length; liquidatorRepayIndex++) {
                if (liquidatorAssets[liquidatorRepayIndex] == _repayKreskoAsset) break;
            }
            mintedKreskoAssets[msg.sender].removeAddress(_repayKreskoAsset, liquidatorRepayIndex);
        }

        uint256 decimals = collateralAssets[_collateralSeized].decimals;
        FixedPoint.Unsigned memory seizedAmountUSD = decimals
            ._toCollateralFixedPointAmount(_seizeAmount)
            .mul( _collateralPriceUSD);

        // Charge liquidator burn fee because we're closing their position
        _chargeBurnFee(msg.sender, _repayKreskoAsset, _repayAmount);

        return decimals
            ._fromCollateralFixedPointAmount(seizedAmountUSD.sub(_repayAmountUSD).div(_collateralPriceUSD)
        );
    }

    /**
     * @notice Remove Kresko assets and collateral assets from the liquidated user's holdings.
     * @param _account The account to attempt to liquidate.
     * @param _krAssetDebt The amount of Kresko assets that the liquidated user owes.
     * @param _repayAmount The amount of the Kresko asset to be repaid.
     * @param _seizeAmount The calculated amount of collateral assets to be seized.
     * @param _repayKreskoAsset The address of the Kresko asset to be repaid.
     * @param _mintedKreskoAssetIndex The index of the Kresko asset in the user's minted assets array.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the account's collateral assets array.
     */
    function _liquidateAssets(
        address _account,
        uint256 _krAssetDebt,
        uint256 _repayAmount,
        uint256 _seizeAmount,
        address _repayKreskoAsset,
        uint256 _mintedKreskoAssetIndex,
        address _collateralAssetToSeize,
        uint256 _depositedCollateralAssetIndex
    ) internal returns (uint256) {
        // Subtract repaid Kresko assets from liquidated user's recorded debt.
        kreskoAssetDebt[_account][_repayKreskoAsset] = _krAssetDebt - _repayAmount;
        // If the liquidation repays the user's entire Kresko asset balance, remove it from minted assets array.
        if (_repayAmount == _krAssetDebt) {
            mintedKreskoAssets[_account].removeAddress(_repayKreskoAsset, _mintedKreskoAssetIndex);
        }

        // Get users collateral deposit amount
        uint256 collateralDeposit = collateralDeposits[_account][_collateralAssetToSeize];

        if (collateralDeposit > _seizeAmount) {
            collateralDeposits[_account][_collateralAssetToSeize] = collateralDeposit - _seizeAmount;
        } else {
            // This clause means user either has collateralDeposits equal or less than the _seizeAmount
            _seizeAmount = collateralDeposit;
            // So we set the collateralDeposits to 0
            collateralDeposits[_account][_collateralAssetToSeize] = 0;
            // And remove the asset from the deposits array.
            depositedCollateralAssets[_account].removeAddress(_collateralAssetToSeize, _depositedCollateralAssetIndex);
        }

        // Return the actual amount seized
        return _seizeAmount;
    }

    /**
     * ==================================================
     * ============== Public view functions =============
     * ==================================================
     */

    /* ==== Collateral ==== */
    /**
     * @notice Returns true if the @param _collateralAsset exists in the protocol
     */
    function collateralExists(address _collateralAsset) external view returns (bool) {
        return collateralAssets[_collateralAsset].exists;
    }

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getDepositedCollateralAssets(address _account) external view returns (address[] memory) {
        return depositedCollateralAssets[_account];
    }

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function getDepositedCollateralAssetIndex(address _account, address _collateralAsset)
        public
        view
        returns (uint256 i)
    {
        for (i; i < depositedCollateralAssets[_account].length; i++) {
            if (depositedCollateralAssets[_account][i] == _collateralAsset) {
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
        FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = depositedCollateralAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            (FixedPoint.Unsigned memory collateralValue, ) = getCollateralValueAndOraclePrice(
                asset,
                collateralDeposits[_account][asset],
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue = totalCollateralValue.add(collateralValue);
        }

        return totalCollateralValue;
    }

    /**
     * @notice Get an account's minimum collateral value required to back a Kresko asset amount at a given collateralization ratio.
     * @dev Accounts that have their collateral value under the minimum collateral value are considered unhealthy,
     *      accounts with their collateral value under the liquidation threshold are considered liquidatable.
     * @param _account The account to calculate the minimum collateral value for.
     * @param _ratio The collateralization ratio required: higher ratio = more collateral required
     * @return The minimum collateral value at a given collateralization ratio for a given account.
     */
    function getAccountMinimumCollateralValueAtRatio(
        address _account,
        FixedPoint.Unsigned memory _ratio
    ) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 amount = kreskoAssetDebt[_account][asset];
            minCollateralValue = minCollateralValue.add(getMinimumCollateralValueAtRatio(asset, amount, _ratio));
        }

        return minCollateralValue;
    }

    /**
     * @notice Get the minimum collateral value required to back a Kresko asset amount at a given collateralization ratio.
     * @param _krAsset The address of the Kresko asset.
     * @param _amount The Kresko Asset debt amount.
     * @param _ratio The collateralization ratio required: higher ratio = more collateral required
     * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
     */
 function getMinimumCollateralValueAtRatio(
        address _krAsset,
        uint256 _amount,
        FixedPoint.Unsigned memory _ratio
    )
        public
        view
        kreskoAssetExistsMaybeNotMintable(_krAsset)
        returns (FixedPoint.Unsigned memory minCollateralValue)
    {
        // Calculate the Kresko asset's value weighted by its k-factor.
        FixedPoint.Unsigned memory weightedKreskoAssetValue = getKrAssetValue(_krAsset, _amount, false);
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return weightedKreskoAssetValue.mul(_ratio);
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to calculate the collateral value for.
     * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) public view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
        CollateralAsset memory collateralAsset = collateralAssets[_collateralAsset];

        FixedPoint.Unsigned memory fixedPointAmount = collateralAsset.decimals._toCollateralFixedPointAmount(_amount);
        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(collateralAsset.oracle.latestAnswer()));
        FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

        if (!_ignoreCollateralFactor) {
            value = value.mul(collateralAsset.factor);
        }
        return (value, oraclePrice);
    }

    /* ==== Kresko Assets ==== */

    /**
     * @notice Returns true if the @param _krAsset exists in the protocol
     */
    function krAssetExists(address _krAsset) external view returns (bool) {
        return kreskoAssets[_krAsset].exists;
    }

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(address _account) external view returns (address[] memory) {
        return mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return i = index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(address _account, address _kreskoAsset) public view returns (uint256 i) {
        for (i; i < mintedKreskoAssets[_account].length; i++) {
            if (mintedKreskoAssets[_account][i] == _kreskoAsset) {
                break;
            }
        }
    }

    /**
     * @notice Gets the Kresko asset value in USD of a particular account.
     * @param _account The account to calculate the Kresko asset value for.
     * @return The Kresko asset value of a particular account.
     */
    function getAccountKrAssetValue(address _account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(0);

        address[] memory assets = mintedKreskoAssets[_account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            value = value.add(getKrAssetValue(asset, kreskoAssetDebt[_account][asset], false));
        }
        return value;
    }

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) public view returns (FixedPoint.Unsigned memory) {
        KrAsset memory krAsset = kreskoAssets[_kreskoAsset];

        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(krAsset.oracle.latestAnswer()));

        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(_amount).mul(oraclePrice);

        if (!_ignoreKFactor) {
            value = value.mul(krAsset.kFactor);
        }

        return value;
    }

    /* ==== Liquidation ==== */

    /**
     * @notice Calculates if an account's current collateral value is under its minimum collateral value
     * @dev Returns true if the account's current collateral value is below the minimum collateral value
     * required to consider the position healthy.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(address _account) public view returns (bool) {
        // Get the value of the account's current deposited collateral.
        FixedPoint.Unsigned memory accountCollateralValue = getAccountCollateralValue(_account);
        // Get the account's current minimum collateral value required to maintain current debts.
        FixedPoint.Unsigned memory minAccountCollateralValue = getAccountMinimumCollateralValueAtRatio(_account, liquidationThreshold);

        return accountCollateralValue.isLessThan(minAccountCollateralValue);
    }

    /**
     * @dev Calculates the total value that can be liquidated for a liquidation pair
     * @param _account address to liquidate
     * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
     * @param _collateralAssetToSeize address of the collateral asset being seized from the liquidatee
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function calculateMaxLiquidatableValueForAssets(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) public view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        // Minimum collateral value required for the krAsset position
        FixedPoint.Unsigned memory minCollateralValue = getMinimumCollateralValueAtRatio(
            _repayKreskoAsset,
            kreskoAssetDebt[_account][_repayKreskoAsset],
            liquidationThreshold
        );

        // Collateral value for this position
        (FixedPoint.Unsigned memory collateralValueAvailable, ) = getCollateralValueAndOraclePrice(
            _collateralAssetToSeize,
            collateralDeposits[_account][_collateralAssetToSeize],
            false // take cFactor into consideration
        );
        if (collateralValueAvailable.isGreaterThanOrEqual(minCollateralValue)) {
            return FixedPoint.Unsigned(0);
        } else {
            // Get the factors of the assets
            FixedPoint.Unsigned memory kFactor = kreskoAssets[_repayKreskoAsset].kFactor;
            FixedPoint.Unsigned memory cFactor = collateralAssets[_collateralAssetToSeize].factor;

            // Calculate how much value is under
            FixedPoint.Unsigned memory valueUnderMin = minCollateralValue.sub(collateralValueAvailable);

            // Get the divisor which calculates the max repayment from the underwater value
            FixedPoint.Unsigned memory repayDivisor = kFactor.mul(minimumCollateralizationRatio).sub(
                liquidationIncentiveMultiplier.sub(burnFee).mul(cFactor)
            );

            // Max repayment value for this pair
            maxLiquidatableUSD = valueUnderMin.div(repayDivisor);

            // Get the future collateral value that is being used for the liquidation
            FixedPoint.Unsigned memory collateralValueRepaid = maxLiquidatableUSD.div(
                kFactor.mul(liquidationIncentiveMultiplier.add(burnFee))
            );

            // If it's more than whats available get the max value from how much value is available instead.
            if (collateralValueRepaid.isGreaterThan(collateralValueAvailable)) {
                // Reverse the divisor formula to achieve the max repayment from available collateral.
                // We end up here if the user has multiple positions with different risk profiles.
                maxLiquidatableUSD = collateralValueAvailable.div(collateralValueRepaid.div(valueUnderMin));
            }

            // Cascade the liquidations if user has multiple collaterals and cFactor < 1.
            // This is desired because pairs with low cFactor have higher collateral requirement
            // than positions with high cFactor.

            // Main reason here is keep the liquidations from happening only on pairs that have a high risk profile.
            if (depositedCollateralAssets[_account].length > 1 && cFactor.isLessThan(ONE_HUNDRED_PERCENT)) {
                // To mitigate:
                // cFactor^4 the collateral available (cFactor = 1 == nothing happens)
                // Get the ratio between max liquidatable USD and diminished collateral available
                // = (higher value -> higher the risk ratio of this pair)
                // Divide the maxValue by this ratio and a diminishing max value is returned.

                // For a max profit liquidation strategy jumps to other pairs must happen before
                // the liquidation value of the risky position becomes the most profitable again.

                return
                    maxLiquidatableUSD.div(maxLiquidatableUSD.div(collateralValueAvailable.mul(cFactor.pow(4)))).mul(
                        // Include a burnFee surplus in the liquidation
                        // so the users can repay their debt.
                        FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(burnFee)
                    );
            } else {
                // For collaterals with cFactor = 1 / accounts with only single collateral
                // the debt is just repaid in full with a single transaction
                return maxLiquidatableUSD.mul(FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(burnFee));
            }
        }
    }
}
