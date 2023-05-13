// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IERC165} from "../../shared/IERC165.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";
import {IKreskoAssetAnchor} from "../../kreskoasset/IKreskoAssetAnchor.sol";
import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";
import {IKreskoAssetIssuer} from "../../kreskoasset/IKreskoAssetIssuer.sol";
import {IKISS} from "../../kiss/interfaces/IKISS.sol";

import {IConfigurationFacet} from "../interfaces/IConfigurationFacet.sol";

import {Error} from "../../libs/Errors.sol";
import {MinterEvent, GeneralEvent} from "../../libs/Events.sol";
import {Authorization, Role} from "../../libs/Authorization.sol";
import {Meta} from "../../libs/Meta.sol";

import {DiamondModifiers, MinterModifiers} from "../../shared/Modifiers.sol";

import {ds} from "../../diamond/DiamondStorage.sol";

// solhint-disable-next-line
import {MinterInitArgs, CollateralAsset, KrAsset, AggregatorV2V3Interface, FixedPoint, Constants} from "../MinterTypes.sol";
import {ms} from "../MinterStorage.sol";

/**
 * @author Kresko
 * @title ConfigurationFacet
 * @notice Functionality for `Role.ADMIN` level actions.
 * @notice Can be only initialized by the deployer/owner.
 */
contract ConfigurationFacet is DiamondModifiers, MinterModifiers, IConfigurationFacet {
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPoint for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                 Initialize                                 */
    /* -------------------------------------------------------------------------- */

    function initialize(MinterInitArgs calldata args) external onlyOwner {
        require(ms().initializations == 0, Error.ALREADY_INITIALIZED);
        // Temporarily set ADMIN role for deployer
        Authorization._grantRole(Role.DEFAULT_ADMIN, msg.sender);
        Authorization._grantRole(Role.ADMIN, msg.sender);

        // Grant the admin role to admin
        Authorization._grantRole(Role.DEFAULT_ADMIN, args.admin);
        Authorization._grantRole(Role.ADMIN, args.admin);

        /**
         * @notice Council can be set only by this specific function.
         * Requirements:
         *
         * - address `_council` must implement ERC165 and a specific multisig interfaceId.
         * - reverts if above is not true.
         */
        Authorization.setupSecurityCouncil(args.council);

        updateFeeRecipient(args.treasury);
        updateMinimumCollateralizationRatio(args.minimumCollateralizationRatio);
        updateMinimumDebtValue(args.minimumDebtValue);
        updateLiquidationThreshold(args.liquidationThreshold);
        updateExtOracleDecimals(args.extOracleDecimals);
        updateMaxLiquidationMultiplier(Constants.MIN_MAX_LIQUIDATION_MULTIPLIER);

        ms().initializations = 1;
        ms().domainSeparator = Meta.domainSeparator("Kresko Minter", "V1");
        emit GeneralEvent.Initialized(args.admin, 1);
    }

    /// @inheritdoc IConfigurationFacet
    function updateFeeRecipient(address _feeRecipient) public override onlyRole(Role.ADMIN) {
        require(_feeRecipient != address(0), Error.ADDRESS_INVALID_FEERECIPIENT);
        ms().feeRecipient = _feeRecipient;
        emit MinterEvent.FeeRecipientUpdated(_feeRecipient);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationIncentiveMultiplier(
        address _collateralAsset,
        uint256 _liquidationIncentiveMultiplier
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(
            _liquidationIncentiveMultiplier >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _liquidationIncentiveMultiplier <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );
        ms().collateralAssets[_collateralAsset].liquidationIncentive = _liquidationIncentiveMultiplier.toFixedPoint();
        emit MinterEvent.LiquidationIncentiveMultiplierUpdated(_collateralAsset, _liquidationIncentiveMultiplier);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCFactor(
        address _collateralAsset,
        uint256 _cFactor
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(_cFactor <= FixedPoint.FP_SCALING_FACTOR, Error.COLLATERAL_INVALID_FACTOR);
        ms().collateralAssets[_collateralAsset].factor = _cFactor.toFixedPoint();
        emit MinterEvent.CFactorUpdated(_collateralAsset, _cFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateKFactor(
        address _kreskoAsset,
        uint256 _kFactor
    ) public override kreskoAssetExists(_kreskoAsset) onlyRole(Role.ADMIN) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, Error.KRASSET_INVALID_FACTOR);
        ms().kreskoAssets[_kreskoAsset].kFactor = _kFactor.toFixedPoint();
        emit MinterEvent.CFactorUpdated(_kreskoAsset, _kFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinimumCollateralizationRatio(
        uint256 _minimumCollateralizationRatio
    ) public override onlyRole(Role.ADMIN) {
        require(
            _minimumCollateralizationRatio >= Constants.MIN_COLLATERALIZATION_RATIO,
            Error.PARAM_MIN_COLLATERAL_RATIO_LOW
        );
        ms().minimumCollateralizationRatio = _minimumCollateralizationRatio.toFixedPoint();
        emit MinterEvent.MinimumCollateralizationRatioUpdated(_minimumCollateralizationRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinimumDebtValue(uint256 _minimumDebtValue) public override onlyRole(Role.ADMIN) {
        require(_minimumDebtValue <= Constants.MAX_MIN_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        ms().minimumDebtValue = _minimumDebtValue.toFixedPoint();
        emit MinterEvent.MinimumDebtValueUpdated(_minimumDebtValue);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationThreshold(uint256 _liquidationThreshold) public override onlyRole(Role.ADMIN) {
        // Liquidation threshold cannot be greater than minimum collateralization ratio
        FixedPoint.Unsigned memory newThreshold = _liquidationThreshold.toFixedPoint();
        require(newThreshold.isLessThanOrEqual(ms().minimumCollateralizationRatio), Error.INVALID_LT);

        ms().liquidationThreshold = newThreshold;
        emit MinterEvent.LiquidationThresholdUpdated(_liquidationThreshold);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMaxLiquidationMultiplier(uint256 _maxLiquidationMultiplier) public override onlyRole(Role.ADMIN) {
        require(
            _maxLiquidationMultiplier >= Constants.MIN_MAX_LIQUIDATION_MULTIPLIER,
            Error.PARAM_LIQUIDATION_OVERFLOW_LOW
        );
        ms().maxLiquidationMultiplier = _maxLiquidationMultiplier.toFixedPoint();
        emit MinterEvent.maxLiquidationMultiplierUpdated(_maxLiquidationMultiplier);
    }

    /// @inheritdoc IConfigurationFacet
    function updateAMMOracle(address _ammOracle) external onlyRole(Role.ADMIN) {
        ms().ammOracle = _ammOracle;
        emit MinterEvent.AMMOracleUpdated(_ammOracle);
    }

    /// @inheritdoc IConfigurationFacet
    function updateExtOracleDecimals(uint8 _decimals) public onlyRole(Role.ADMIN) {
        ms().extOracleDecimals = _decimals;
    }

    /* -------------------------------------------------------------------------- */
    /*                                 COLLATERAL                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IConfigurationFacet
    function addCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        uint256 _liquidationIncentiveMultiplier,
        address _priceFeedOracle,
        address _marketStatusOracle
    ) external nonReentrant onlyRole(Role.ADMIN) collateralAssetDoesNotExist(_collateralAsset) {
        require(_collateralAsset != address(0), Error.ADDRESS_INVALID_COLLATERAL);
        require(_priceFeedOracle != address(0), Error.ADDRESS_INVALID_ORACLE);
        require(
            AggregatorV2V3Interface(_priceFeedOracle).decimals() == ms().extOracleDecimals,
            Error.INVALID_ORACLE_DECIMALS
        );
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, Error.COLLATERAL_INVALID_FACTOR);
        require(
            _liquidationIncentiveMultiplier >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _liquidationIncentiveMultiplier <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );
        bool isKrAsset = ms().kreskoAssets[_collateralAsset].exists;
        require(
            !isKrAsset ||
                (IERC165(_collateralAsset).supportsInterface(type(IKISS).interfaceId)) ||
                IERC165(_anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
            Error.KRASSET_INVALID_ANCHOR
        );

        /* ---------------------------------- Save ---------------------------------- */
        ms().collateralAssets[_collateralAsset] = CollateralAsset({
            factor: _factor.toFixedPoint(),
            oracle: AggregatorV2V3Interface(_priceFeedOracle),
            liquidationIncentive: _liquidationIncentiveMultiplier.toFixedPoint(),
            marketStatusOracle: AggregatorV2V3Interface(_marketStatusOracle),
            anchor: _anchor,
            exists: true,
            decimals: IERC20Upgradeable(_collateralAsset).decimals()
        });

        emit MinterEvent.CollateralAssetAdded(
            _collateralAsset,
            _factor,
            _priceFeedOracle,
            _marketStatusOracle,
            _anchor
        );
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        uint256 _liquidationIncentiveMultiplier,
        address _priceFeedOracle,
        address _marketStatusOracle
    ) external onlyRole(Role.ADMIN) collateralAssetExists(_collateralAsset) {
        // Setting the factor to 0 effectively sunsets a collateral asset, which is intentionally allowed.
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, Error.COLLATERAL_INVALID_FACTOR);
        require(
            _liquidationIncentiveMultiplier >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _liquidationIncentiveMultiplier <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );

        /* ------------------------------ Update anchor ----------------------------- */
        if (_anchor != address(0)) {
            bool krAsset = ms().kreskoAssets[_collateralAsset].exists;
            require(
                !krAsset ||
                    (IERC165(_collateralAsset).supportsInterface(type(IKISS).interfaceId)) ||
                    IERC165(_anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
                Error.KRASSET_INVALID_ANCHOR
            );
            ms().collateralAssets[_collateralAsset].anchor = _anchor;
        }

        /* -------------------------- Market status oracle -------------------------- */
        if (_marketStatusOracle != address(0)) {
            ms().collateralAssets[_collateralAsset].marketStatusOracle = AggregatorV2V3Interface(_marketStatusOracle);
        }

        /* ------------------------------- Price feed ------------------------------- */
        if (_priceFeedOracle != address(0)) {
            require(
                AggregatorV2V3Interface(_priceFeedOracle).decimals() == ms().extOracleDecimals,
                Error.INVALID_ORACLE_DECIMALS
            );
            ms().collateralAssets[_collateralAsset].oracle = AggregatorV2V3Interface(_priceFeedOracle);
        }

        /* --------------------------------- cFactor -------------------------------- */
        ms().collateralAssets[_collateralAsset].factor = _factor.toFixedPoint();

        /* ------------------------------ liqIncentive ------------------------------ */
        ms().collateralAssets[_collateralAsset].liquidationIncentive = _liquidationIncentiveMultiplier.toFixedPoint();

        emit MinterEvent.CollateralAssetUpdated(
            _collateralAsset,
            _factor,
            _priceFeedOracle,
            _marketStatusOracle,
            _anchor
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                               Kresko Assets                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IConfigurationFacet
    function addKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _priceFeedOracle,
        address _marketStatusOracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external onlyRole(Role.ADMIN) kreskoAssetDoesNotExist(_krAsset) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, Error.KRASSET_INVALID_FACTOR);
        require(_priceFeedOracle != address(0), Error.ADDRESS_INVALID_ORACLE);
        require(_closeFee <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_openFee <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);
        require(
            IERC165(_krAsset).supportsInterface(type(IKISS).interfaceId) ||
                IERC165(_krAsset).supportsInterface(type(IKreskoAsset).interfaceId),
            Error.KRASSET_INVALID_CONTRACT
        );
        require(IERC165(_anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId), Error.KRASSET_INVALID_ANCHOR);
        // The diamond needs the operator role
        require(IKreskoAsset(_krAsset).hasRole(Role.OPERATOR, address(this)), Error.NOT_OPERATOR);

        // Oracle decimals must match the configuration.
        require(
            AggregatorV2V3Interface(_priceFeedOracle).decimals() == ms().extOracleDecimals,
            Error.INVALID_ORACLE_DECIMALS
        );

        /* ---------------------------------- Save ---------------------------------- */
        ms().kreskoAssets[_krAsset] = KrAsset({
            kFactor: _kFactor.toFixedPoint(),
            oracle: AggregatorV2V3Interface(_priceFeedOracle),
            marketStatusOracle: AggregatorV2V3Interface(_marketStatusOracle),
            anchor: _anchor,
            supplyLimit: _supplyLimit,
            closeFee: _closeFee.toFixedPoint(),
            openFee: _openFee.toFixedPoint(),
            exists: true
        });

        emit MinterEvent.KreskoAssetAdded(
            _krAsset,
            _anchor,
            _priceFeedOracle,
            _marketStatusOracle,
            _kFactor,
            _supplyLimit,
            _closeFee,
            _openFee
        );
    }

    /// @inheritdoc IConfigurationFacet
    function updateKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _priceFeedOracle,
        address _marketStatusOracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external onlyRole(Role.ADMIN) kreskoAssetExists(_krAsset) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, Error.KRASSET_INVALID_FACTOR);
        require(_closeFee <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_openFee <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);
        require(
            IERC165(_krAsset).supportsInterface(type(IKISS).interfaceId) ||
                IERC165(_krAsset).supportsInterface(type(IKreskoAsset).interfaceId),
            Error.KRASSET_INVALID_CONTRACT
        );

        KrAsset memory krAsset = ms().kreskoAssets[_krAsset];

        /* --------------------------------- Anchor --------------------------------- */
        if (address(_anchor) != address(0)) {
            require(
                IERC165(_anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
                Error.KRASSET_INVALID_ANCHOR
            );
            krAsset.anchor = _anchor;
        }

        /* ------------------------------ Market status ----------------------------- */
        if (address(_marketStatusOracle) != address(0)) {
            krAsset.marketStatusOracle = AggregatorV2V3Interface(_marketStatusOracle);
        }

        /* ------------------------------- Price feed ------------------------------- */
        if (address(_priceFeedOracle) != address(0)) {
            require(
                AggregatorV2V3Interface(_priceFeedOracle).decimals() == ms().extOracleDecimals,
                Error.INVALID_ORACLE_DECIMALS
            );
            krAsset.oracle = AggregatorV2V3Interface(_priceFeedOracle);
        }

        /* -------------------------- Factors, Fees, Limits ------------------------- */
        krAsset.kFactor = _kFactor.toFixedPoint();
        krAsset.supplyLimit = _supplyLimit;
        krAsset.closeFee = _closeFee.toFixedPoint();
        krAsset.openFee = _openFee.toFixedPoint();

        /* ---------------------------------- Save ---------------------------------- */
        ms().kreskoAssets[_krAsset] = krAsset;

        emit MinterEvent.KreskoAssetUpdated(
            _krAsset,
            _anchor,
            _priceFeedOracle,
            _marketStatusOracle,
            _kFactor,
            _supplyLimit,
            _closeFee,
            _openFee
        );
    }
}
