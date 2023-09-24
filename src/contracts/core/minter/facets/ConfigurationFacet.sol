// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IERC165} from "vendor/IERC165.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {Auth} from "common/Auth.sol";
import {Role} from "common/Types.sol";
import {Error} from "common/Errors.sol";
import {DiamondEvent} from "common/Events.sol";

import {IKreskoAsset} from "kresko-asset/IKreskoAsset.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {IKISS} from "kiss/interfaces/IKISS.sol";

import {DSModifiers} from "diamond/Modifiers.sol";
import {ds} from "diamond/State.sol";

import {IConfigurationFacet} from "minter/interfaces/IConfigurationFacet.sol";
import {MEvent} from "minter/Events.sol";
import {ms} from "minter/State.sol";
import {MinterInitArgs, KrAsset, CollateralAsset} from "minter/Types.sol";
import {Constants} from "minter/Constants.sol";
import {MSModifiers} from "minter/Modifiers.sol";
import {OracleConfiguration, OracleType} from "oracle/Types.sol";
import {setOraclesForAsset} from "oracle/funcs/Common.sol";

/**
 * @author Kresko
 * @title ConfigurationFacet
 * @notice Functionality for `Role.ADMIN` level actions.
 * @notice Can be only initialized by the deployer/owner.
 */
contract ConfigurationFacet is DSModifiers, MSModifiers, IConfigurationFacet {
    /* -------------------------------------------------------------------------- */
    /*                                 Initialize                                 */
    /* -------------------------------------------------------------------------- */

    function initializeMinter(MinterInitArgs calldata args) external onlyOwner {
        require(ds().storageVersion == 1, Error.ALREADY_INITIALIZED);

        // Temporarily set ADMIN role for deployer
        Auth._grantRole(Role.DEFAULT_ADMIN, msg.sender);
        Auth._grantRole(Role.ADMIN, msg.sender);

        // Grant the admin role to admin
        Auth._grantRole(Role.DEFAULT_ADMIN, args.admin);
        Auth._grantRole(Role.ADMIN, args.admin);

        /**
         * @notice Council can be set only by this specific function.
         * Requirements:
         *
         * - address `_council` must implement ERC165 and a specific multisig interfaceId.
         * - reverts if above is not true.
         */
        Auth.setupSecurityCouncil(args.council);

        updateFeeRecipient(args.treasury);
        updateMinCollateralRatio(args.minCollateralRatio);
        updateMinDebtValue(args.minDebtValue);
        updateLiquidationThreshold(args.liquidationThreshold);
        updateExtOracleDecimals(args.extOracleDecimals);
        updateOracleDeviationPct(args.oracleDeviationPct);
        updateSequencerUptimeFeed(args.sequencerUptimeFeed);
        updateSequencerGracePeriodTime(args.sequencerGracePeriodTime);
        updateOracleTimeout(args.oracleTimeout);
        updatePhase(args.phase);
        updateKreskian(args.kreskian);
        updateQuestForKresk(args.questForKresk);

        emit DiamondEvent.Initialized(args.admin, ds().storageVersion++);
    }

    /// @inheritdoc IConfigurationFacet
    function updateFeeRecipient(address _newFeeRecipient) public override onlyRole(Role.ADMIN) {
        require(_newFeeRecipient != address(0), Error.ADDRESS_INVALID_FEERECIPIENT);

        ms().feeRecipient = _newFeeRecipient;
        emit MEvent.FeeRecipientUpdated(_newFeeRecipient);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationIncentiveOf(
        address _collateralAsset,
        uint256 _newLiquidationIncentive
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(
            _newLiquidationIncentive >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _newLiquidationIncentive <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );

        ms().collateralAssets[_collateralAsset].liquidationIncentive = _newLiquidationIncentive;
        emit MEvent.LiquidationIncentiveMultiplierUpdated(_collateralAsset, _newLiquidationIncentive);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralFactor(
        address _collateralAsset,
        uint256 _newFactor
    ) public override collateralAssetExists(_collateralAsset) onlyRole(Role.ADMIN) {
        require(_newFactor <= Constants.ONE_HUNDRED_PERCENT, Error.COLLATERAL_INVALID_FACTOR);
        ms().collateralAssets[_collateralAsset].factor = _newFactor;
        emit MEvent.CFactorUpdated(_collateralAsset, _newFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateKFactor(
        address _kreskoAsset,
        uint256 _newFactor
    ) public override kreskoAssetExists(_kreskoAsset) onlyRole(Role.ADMIN) {
        require(_newFactor >= Constants.ONE_HUNDRED_PERCENT, Error.KRASSET_INVALID_FACTOR);
        ms().kreskoAssets[_kreskoAsset].kFactor = _newFactor;
        emit MEvent.CFactorUpdated(_kreskoAsset, _newFactor);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinCollateralRatio(uint256 _newMinCollateralRatio) public override onlyRole(Role.ADMIN) {
        require(_newMinCollateralRatio >= Constants.MIN_COLLATERALIZATION_RATIO, Error.PARAM_MIN_COLLATERAL_RATIO_LOW);
        require(_newMinCollateralRatio >= ms().liquidationThreshold, Error.PARAM_COLLATERAL_RATIO_LOW_THAN_LT);
        ms().minCollateralRatio = _newMinCollateralRatio;
        emit MEvent.MinimumCollateralizationRatioUpdated(_newMinCollateralRatio);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMinDebtValue(uint256 _newMinDebtValue) public override onlyRole(Role.ADMIN) {
        require(_newMinDebtValue <= Constants.MAX_MIN_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        ms().minDebtValue = _newMinDebtValue;

        emit MEvent.MinimumDebtValueUpdated(_newMinDebtValue);
    }

    /// @inheritdoc IConfigurationFacet
    function updateLiquidationThreshold(uint256 _newThreshold) public override onlyRole(Role.ADMIN) {
        require(_newThreshold >= Constants.MIN_COLLATERALIZATION_RATIO, "lt-too-low");
        require(_newThreshold <= ms().minCollateralRatio, Error.INVALID_LT);
        ms().liquidationThreshold = _newThreshold;
        ms().maxLiquidationRatio = _newThreshold + Constants.ONE_PERCENT;
        emit MEvent.LiquidationThresholdUpdated(_newThreshold);
    }

    /// @inheritdoc IConfigurationFacet
    function updateMaxLiquidationRatio(uint256 _newMaxLiquidationRatio) public override onlyRole(Role.ADMIN) {
        require(_newMaxLiquidationRatio >= ms().liquidationThreshold, Error.PARAM_LIQUIDATION_OVERFLOW_LOW);
        ms().maxLiquidationRatio = _newMaxLiquidationRatio;

        emit MEvent.MaxLiquidationRatioUpdated(_newMaxLiquidationRatio);
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
    function updateSequencerGracePeriodTime(uint256 _sequencerGracePeriodTime) public onlyRole(Role.ADMIN) {
        ms().sequencerGracePeriodTime = _sequencerGracePeriodTime;
    }

    /// @inheritdoc IConfigurationFacet
    function updateOracleTimeout(uint256 _oracleTimeout) public onlyRole(Role.ADMIN) {
        ms().oracleTimeout = _oracleTimeout;
    }

    /// @inheritdoc IConfigurationFacet
    function updatePhase(uint8 _phase) public override onlyRole(Role.ADMIN) {
        ms().phase = _phase;
    }

    /// @inheritdoc IConfigurationFacet
    function updateKreskian(address _kreskian) public override onlyRole(Role.ADMIN) {
        ms().kreskian = _kreskian;
    }

    /// @inheritdoc IConfigurationFacet
    function updateQuestForKresk(address _questForKresk) public override onlyRole(Role.ADMIN) {
        ms().questForKresk = _questForKresk;
    }

    /* -------------------------------------------------------------------------- */
    /*                                 COLLATERAL                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IConfigurationFacet
    function addCollateralAsset(
        address _collateralAsset,
        OracleConfiguration memory _oracles,
        CollateralAsset memory _config
    ) external nonReentrant onlyRole(Role.ADMIN) collateralAssetDoesNotExist(_collateralAsset) {
        require(_collateralAsset != address(0), Error.ADDRESS_INVALID_COLLATERAL);
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
            anchor: _config.anchor,
            decimals: IERC20Permit(_collateralAsset).decimals(),
            exists: true,
            factor: _config.factor,
            liquidationIncentive: _config.liquidationIncentive,
            id: _config.id,
            oracles: _config.oracles
        });

        setOraclesForAsset(_config.id, _oracles, address(this));
        require(ms().collateralAssets[_collateralAsset].pushedPrice().price != 0, Error.ZERO_PRICE);

        emit MEvent.CollateralAssetAdded(_collateralAsset, _config.factor, _config.anchor, _config.liquidationIncentive);
    }

    /// @inheritdoc IConfigurationFacet
    function updateCollateralAsset(
        address _collateralAsset,
        OracleConfiguration memory _oracles,
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

        collateralAsset.id = _config.id;
        /* --------------------------------- cFactor -------------------------------- */
        collateralAsset.factor = _config.factor;
        /* ------------------------------ liqIncentive ------------------------------ */
        collateralAsset.liquidationIncentive = _config.liquidationIncentive;
        /* ------------------------------- Price feed ------------------------------- */
        collateralAsset.oracles = _config.oracles;
        setOraclesForAsset(_config.id, _oracles, address(this));
        require(collateralAsset.pushedPrice().price != 0, Error.ZERO_PRICE);
        /* ---------------------------------- Save ---------------------------------- */
        ms().collateralAssets[_collateralAsset] = collateralAsset;
        emit MEvent.CollateralAssetUpdated(
            _collateralAsset,
            collateralAsset.factor,
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
        OracleConfiguration memory _oracles,
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
        require(IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId), Error.KRASSET_INVALID_ANCHOR);
        // The diamond needs the operator role
        require(IKreskoAsset(_krAsset).hasRole(Role.OPERATOR, address(this)), Error.NOT_OPERATOR);

        /* ---------------------------------- Save ---------------------------------- */
        ms().kreskoAssets[_krAsset] = KrAsset({
            anchor: _config.anchor,
            closeFee: _config.closeFee,
            exists: true,
            supplyLimit: _config.supplyLimit,
            kFactor: _config.kFactor,
            openFee: _config.openFee,
            id: _config.id,
            oracles: _config.oracles
        });

        /* --------------------------------- Oracles -------------------------------- */
        setOraclesForAsset(_config.id, _oracles, address(this));
        require(ms().kreskoAssets[_krAsset].pushedPrice().price != 0, Error.ZERO_PRICE);

        emit MEvent.KreskoAssetAdded(
            _krAsset,
            _config.anchor,
            _config.kFactor,
            _config.supplyLimit,
            _config.closeFee,
            _config.openFee
        );
    }

    /// @inheritdoc IConfigurationFacet
    function updateKreskoAsset(
        address _krAsset,
        OracleConfiguration memory _oracles,
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

        krAsset.id = _config.id;
        /* --------------------------------- Anchor --------------------------------- */
        if (_config.anchor != address(0)) {
            require(
                IERC165(_config.anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
                Error.KRASSET_INVALID_ANCHOR
            );
            krAsset.anchor = _config.anchor;
        }
        /* ------------------------------- Price feed ------------------------------- */
        krAsset.oracles = _config.oracles;
        setOraclesForAsset(_config.id, _oracles, address(this));
        require(ms().kreskoAssets[_krAsset].pushedPrice().price != 0, Error.ZERO_PRICE);
        /* -------------------------- Factors, Fees, Limits ------------------------- */
        krAsset.kFactor = _config.kFactor;
        krAsset.supplyLimit = _config.supplyLimit;
        krAsset.closeFee = _config.closeFee;
        krAsset.openFee = _config.openFee;
        /* ---------------------------------- Save ---------------------------------- */
        ms().kreskoAssets[_krAsset] = krAsset;

        emit MEvent.KreskoAssetUpdated(
            _krAsset,
            krAsset.anchor,
            krAsset.kFactor,
            krAsset.supplyLimit,
            krAsset.closeFee,
            krAsset.openFee
        );
    }

    function updateCollateralOracleOrder(
        address _collateralAsset,
        OracleType[2] memory _newOrder
    ) external onlyRole(Role.ADMIN) collateralAssetExists(_collateralAsset) {
        ms().collateralAssets[_collateralAsset].oracles = _newOrder;
        require(ms().collateralAssets[_collateralAsset].pushedPrice().price != 0, Error.ZERO_PRICE);
    }

    function updateKrAssetOracleOrder(
        address _kreskoAsset,
        OracleType[2] memory _newOrder
    ) external onlyRole(Role.ADMIN) kreskoAssetExists(_kreskoAsset) {
        ms().kreskoAssets[_kreskoAsset].oracles = _newOrder;
        require(ms().kreskoAssets[_kreskoAsset].pushedPrice().price != 0, Error.ZERO_PRICE);
    }
}
