// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IERC165} from "common/IERC165.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {Authorization, Role} from "common/libs/Authorization.sol";
import {Meta} from "common/libs/Meta.sol";

import {Error} from "common/Errors.sol";
import {MinterEvent, GeneralEvent} from "common/Events.sol";

import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";

import {IConfigurationFacet} from "../interfaces/IConfigurationFacet.sol";

import {DiamondModifiers} from "diamond/libs/LibDiamond.sol";

import {ms, MinterModifiers, MinterInitArgs, CollateralAsset, KrAsset, Constants} from "../libs/LibMinter.sol";

/**
 * @author Kresko
 * @title ConfigurationFacet
 * @notice Functionality for `Role.ADMIN` level actions.
 * @notice Can be only initialized by the deployer/owner.
 */
contract ConfigurationFacet is DiamondModifiers, MinterModifiers, IConfigurationFacet {
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
        updateOracleDeviationPct(args.oracleDeviationPct);
        updateSequencerUptimeFeed(args.sequencerUptimeFeed);
        updateSequencerGracePeriodTime(args.sequencerGracePeriodTime);
        updateOracleTimeout(args.oracleTimeout);

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
        ms().collateralAssets[_collateralAsset].liquidationIncentive = _liquidationIncentiveMultiplier;
        emit MinterEvent.LiquidationIncentiveMultiplierUpdated(_collateralAsset, _liquidationIncentiveMultiplier);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCFactor(
        address _collateralAsset,
        uint256 _cFactor
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(_cFactor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        ms().collateralAssets[_collateralAsset].factor = _cFactor;
        emit MinterEvent.CFactorUpdated(_collateralAsset, _cFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateKFactor(
        address _kreskoAsset,
        uint256 _kFactor
    ) public override kreskoAssetExists(_kreskoAsset) onlyRole(Role.ADMIN) {
        require(_kFactor >= Constants.ONE_HUNDRED_PERCENT, Error.KRASSET_INVALID_FACTOR);
        ms().kreskoAssets[_kreskoAsset].kFactor = _kFactor;
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
        require(_minimumCollateralizationRatio >= ms().liquidationThreshold, Error.PARAM_COLLATERAL_RATIO_LOW_THAN_LT);
        ms().minimumCollateralizationRatio = _minimumCollateralizationRatio;
        emit MinterEvent.MinimumCollateralizationRatioUpdated(_minimumCollateralizationRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinimumDebtValue(uint256 _minimumDebtValue) public override onlyRole(Role.ADMIN) {
        require(_minimumDebtValue <= Constants.MAX_MIN_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        ms().minimumDebtValue = _minimumDebtValue;
        emit MinterEvent.MinimumDebtValueUpdated(_minimumDebtValue);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationThreshold(uint256 _liquidationThreshold) public override onlyRole(Role.ADMIN) {
        // Liquidation threshold cannot be greater than minimum collateralization ratio

        require(_liquidationThreshold <= ms().minimumCollateralizationRatio, Error.INVALID_LT);

        ms().liquidationThreshold = _liquidationThreshold;
        emit MinterEvent.LiquidationThresholdUpdated(_liquidationThreshold);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMaxLiquidationMultiplier(uint256 _maxLiquidationMultiplier) public override onlyRole(Role.ADMIN) {
        require(
            _maxLiquidationMultiplier >= Constants.MIN_MAX_LIQUIDATION_MULTIPLIER,
            Error.PARAM_LIQUIDATION_OVERFLOW_LOW
        );
        ms().maxLiquidationMultiplier = _maxLiquidationMultiplier;
        emit MinterEvent.maxLiquidationMultiplierUpdated(_maxLiquidationMultiplier);
    }

    /// @inheritdoc IConfigurationFacet
    function updateExtOracleDecimals(uint8 _decimals) public onlyRole(Role.ADMIN) {
        ms().extOracleDecimals = _decimals;
    }

    /// @inheritdoc IConfigurationFacet
    function updateOracleDeviationPct(uint256 _oracleDeviationPct) public onlyRole(Role.ADMIN) {
        require(_oracleDeviationPct <= 1 ether, Error.INVALID_ORACLE_DEVIATION_PCT);
        ms().oracleDeviationPct = _oracleDeviationPct;
    }

    /// @inheritdoc IConfigurationFacet
    function updateSequencerUptimeFeed(address _sequencerUptimeFeed) public override onlyRole(Role.ADMIN) {
        ms().sequencerUptimeFeed = _sequencerUptimeFeed;
    }

    /// @inheritdoc IConfigurationFacet
    function updateSequencerGracePeriodTime(uint256 _sequencerGracePeriodTime) public override onlyRole(Role.ADMIN) {
        ms().sequencerGracePeriodTime = _sequencerGracePeriodTime;
    }

    /// @inheritdoc IConfigurationFacet
    function updateOracleTimeout(uint256 _oracleTimeout) public override onlyRole(Role.ADMIN) {
        ms().oracleTimeout = _oracleTimeout;
    }

    /* -------------------------------------------------------------------------- */
    /*                                 COLLATERAL                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IConfigurationFacet
    function addCollateralAsset(
        address _collateralAsset,
        CollateralAsset memory _config
    ) external nonReentrant onlyRole(Role.ADMIN) collateralAssetDoesNotExist(_collateralAsset) {
        require(_collateralAsset != address(0), Error.ADDRESS_INVALID_COLLATERAL);

        require(_config.oracle.decimals() == ms().extOracleDecimals, Error.INVALID_ORACLE_DECIMALS);
        (, int256 answer, , , ) = _config.oracle.latestRoundData();
        require(answer > 0, Error.ADDRESS_INVALID_ORACLE);

        require(_config.factor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        require(
            _config.liquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _config.liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );
        bool isKrAsset = ms().kreskoAssets[_collateralAsset].exists;
        require(
            !isKrAsset ||
                (IERC165(_collateralAsset).supportsInterface(type(IKISS).interfaceId)) ||
                IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
            Error.KRASSET_INVALID_ANCHOR
        );

        /* ---------------------------------- Save ---------------------------------- */
        ms().collateralAssets[_collateralAsset] = CollateralAsset({
            factor: _config.factor,
            oracle: _config.oracle,
            liquidationIncentive: _config.liquidationIncentive,
            anchor: _config.anchor,
            exists: true,
            decimals: IERC20Permit(_collateralAsset).decimals(),
            redstoneId: _config.redstoneId
        });

        emit MinterEvent.CollateralAssetAdded(
            _collateralAsset,
            _config.factor,
            address(_config.oracle),
            _config.anchor,
            _config.liquidationIncentive
        );
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralAsset(
        address _collateralAsset,
        CollateralAsset memory _config
    ) external onlyRole(Role.ADMIN) collateralAssetExists(_collateralAsset) {
        // Setting the factor to 0 effectively sunsets a collateral asset, which is intentionally allowed.
        require(_config.factor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        require(
            _config.liquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _config.liquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );

        CollateralAsset memory collateralAsset = ms().collateralAssets[_collateralAsset];

        /* ------------------------------ Update anchor ----------------------------- */
        if (_config.anchor != address(0)) {
            bool krAsset = ms().kreskoAssets[_collateralAsset].exists;
            require(
                !krAsset ||
                    (IERC165(_collateralAsset).supportsInterface(type(IKISS).interfaceId)) ||
                    IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
                Error.KRASSET_INVALID_ANCHOR
            );
            collateralAsset.anchor = _config.anchor;
        }

        /* ------------------------------- Price feed ------------------------------- */
        if (address(_config.oracle) != address(0)) {
            require(_config.oracle.decimals() == ms().extOracleDecimals, Error.INVALID_ORACLE_DECIMALS);
            (, int256 answer, , , ) = _config.oracle.latestRoundData();
            require(answer > 0, Error.ADDRESS_INVALID_ORACLE);
            collateralAsset.oracle = _config.oracle;
        }

        collateralAsset.redstoneId = _config.redstoneId;

        /* --------------------------------- cFactor -------------------------------- */
        collateralAsset.factor = _config.factor;

        /* ------------------------------ liqIncentive ------------------------------ */
        collateralAsset.liquidationIncentive = _config.liquidationIncentive;

        ms().collateralAssets[_collateralAsset] = collateralAsset;

        emit MinterEvent.CollateralAssetUpdated(
            _collateralAsset,
            collateralAsset.factor,
            address(collateralAsset.oracle),
            collateralAsset.anchor,
            collateralAsset.liquidationIncentive
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                               Kresko Assets                                */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IConfigurationFacet
    function addKreskoAsset(
        address _krAsset,
        KrAsset memory _config
    ) external onlyRole(Role.ADMIN) kreskoAssetDoesNotExist(_krAsset) {
        require(_config.kFactor >= Constants.ONE_HUNDRED_PERCENT, Error.KRASSET_INVALID_FACTOR);
        require(_config.closeFee <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_config.openFee <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);
        require(
            IERC165(_krAsset).supportsInterface(type(IKISS).interfaceId) ||
                IERC165(_krAsset).supportsInterface(type(IKreskoAsset).interfaceId),
            Error.KRASSET_INVALID_CONTRACT
        );
        require(
            IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
            Error.KRASSET_INVALID_ANCHOR
        );
        // The diamond needs the operator role
        require(IKreskoAsset(_krAsset).hasRole(Role.OPERATOR, address(this)), Error.NOT_OPERATOR);

        // Oracle decimals must match the configuration.
        require(_config.oracle.decimals() == ms().extOracleDecimals, Error.INVALID_ORACLE_DECIMALS);
        (, int256 answer, , , ) = _config.oracle.latestRoundData();
        require(answer != 0, Error.ADDRESS_INVALID_ORACLE);

        /* ---------------------------------- Save ---------------------------------- */
        ms().kreskoAssets[_krAsset] = KrAsset({
            kFactor: _config.kFactor,
            oracle: _config.oracle,
            anchor: _config.anchor,
            supplyLimit: _config.supplyLimit,
            closeFee: _config.closeFee,
            openFee: _config.openFee,
            exists: true,
            redstoneId: _config.redstoneId
        });

        emit MinterEvent.KreskoAssetAdded(
            _krAsset,
            _config.anchor,
            address(_config.oracle),
            _config.kFactor,
            _config.supplyLimit,
            _config.closeFee,
            _config.openFee
        );
    }

    /// @inheritdoc IConfigurationFacet
    function updateKreskoAsset(
        address _krAsset,
        KrAsset memory _config
    ) external onlyRole(Role.ADMIN) kreskoAssetExists(_krAsset) {
        require(_config.kFactor >= Constants.ONE_HUNDRED_PERCENT, Error.KRASSET_INVALID_FACTOR);
        require(_config.closeFee <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_config.openFee <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);
        require(
            IERC165(_krAsset).supportsInterface(type(IKISS).interfaceId) ||
                IERC165(_krAsset).supportsInterface(type(IKreskoAsset).interfaceId),
            Error.KRASSET_INVALID_CONTRACT
        );

        KrAsset memory krAsset = ms().kreskoAssets[_krAsset];

        /* --------------------------------- Anchor --------------------------------- */
        if (_config.anchor != address(0)) {
            require(
                IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
                Error.KRASSET_INVALID_ANCHOR
            );
            krAsset.anchor = _config.anchor;
        }

        /* ------------------------------- Price feed ------------------------------- */
        if (address(_config.oracle) != address(0)) {
            require(_config.oracle.decimals() == ms().extOracleDecimals, Error.INVALID_ORACLE_DECIMALS);
            krAsset.oracle = _config.oracle;
            (, int256 answer, , , ) = _config.oracle.latestRoundData();
            require(answer != 0, Error.ADDRESS_INVALID_ORACLE);
        }
        krAsset.redstoneId = _config.redstoneId;
        /* -------------------------- Factors, Fees, Limits ------------------------- */
        krAsset.kFactor = _config.kFactor;
        krAsset.supplyLimit = _config.supplyLimit;
        krAsset.closeFee = _config.closeFee;
        krAsset.openFee = _config.openFee;

        /* ---------------------------------- Save ---------------------------------- */
        ms().kreskoAssets[_krAsset] = krAsset;

        emit MinterEvent.KreskoAssetUpdated(
            _krAsset,
            krAsset.anchor,
            address(krAsset.oracle),
            krAsset.kFactor,
            krAsset.supplyLimit,
            krAsset.closeFee,
            krAsset.openFee
        );
    }
}
