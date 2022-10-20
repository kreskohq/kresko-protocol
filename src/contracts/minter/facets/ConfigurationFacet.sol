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
 * @title Functionality for `Role.OPERATOR` level actions
 * @author Kresko
 * @notice Can be only initialized by the `Role.ADMIN`
 */

contract ConfigurationFacet is DiamondModifiers, MinterModifiers, IConfigurationFacet {
    using FixedPoint for FixedPoint.Unsigned;

    /* -------------------------------------------------------------------------- */
    /*                                 Initializer                                */
    /* -------------------------------------------------------------------------- */
    function initialize(MinterInitArgs calldata args) external onlyOwner {
        require(ms().initializations == 0, Error.ALREADY_INITIALIZED);
        Authorization._grantRole(Role.OPERATOR, args.operator);
        /**
         * @notice Council can be set only by this specific function.
         * Requirements:
         *
         * - address `_council` must implement ERC165 and a specific multisig interfaceId.
         * - reverts if above is not true.
         */
        Authorization.setupSecurityCouncil(args.council);

        /// @dev Temporarily set operator role for calling the update functions
        Authorization._grantRole(Role.OPERATOR, msg.sender);

        updateFeeRecipient(args.feeRecipient);
        updateLiquidationIncentiveMultiplier(args.liquidationIncentiveMultiplier);
        updateMinimumCollateralizationRatio(args.minimumCollateralizationRatio);
        updateMinimumDebtValue(args.minimumDebtValue);
        updateLiquidationThreshold(args.liquidationThreshold);

        /// @dev Revoke the operator role
        Authorization.revokeRole(Role.OPERATOR, msg.sender);

        ms().initializations = 1;
        ms().domainSeparator = Meta.domainSeparator("Kresko Minter", "V1");
        emit GeneralEvent.Initialized(args.operator, 1);
    }

    function setAmmOracle(address _ammOracle) external onlyOwner {
        ms().ammOracle = _ammOracle;
    }

    /**
     * @notice Adds a collateral asset to the protocol.
     * @dev Only callable by the owner and cannot be called more than once for an asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _anchor Underlying anchor for a krAsset collateral, needs to support IKreskoAssetAnchor.
     * @param _factor The collateral factor of the collateral asset as a raw value for a FixedPoint.Unsigned.
     * Must be <= 1e18.
     * @param _oracle The oracle address for the collateral asset's USD value.
     */
    function addCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        address _oracle
    ) external nonReentrant onlyRole(Role.OPERATOR) collateralAssetDoesNotExist(_collateralAsset) {
        require(_collateralAsset != address(0), Error.ADDRESS_INVALID_COLLATERAL);
        require(_oracle != address(0), Error.ADDRESS_INVALID_ORACLE);
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, Error.COLLATERAL_INVALID_FACTOR);

        bool krAsset = ms().kreskoAssets[_collateralAsset].exists;
        require(
            !krAsset ||
                (IERC165(_collateralAsset).supportsInterface(type(IKISS).interfaceId)) ||
                IERC165(_anchor).supportsInterface(type(IKreskoAssetIssuer).interfaceId),
            Error.KRASSET_INVALID_ANCHOR
        );

        ms().collateralAssets[_collateralAsset] = CollateralAsset({
            factor: FixedPoint.Unsigned(_factor),
            oracle: AggregatorV2V3Interface(_oracle),
            anchor: _anchor,
            exists: true,
            decimals: IERC20Upgradeable(_collateralAsset).decimals()
        });
        emit MinterEvent.CollateralAssetAdded(_collateralAsset, _factor, _oracle, _anchor);
    }

    /**
     * @notice Updates a previously added collateral asset.
     * @dev Only callable by the owner.
     * @param _collateralAsset The address of the collateral asset.
     * @param _anchor Underlying anchor for a krAsset collateral, needs to support IKreskoAssetAnchor.
     * @param _factor The new collateral factor as a raw value for a FixedPoint.Unsigned. Must be <= 1e18.
     * @param _oracle The new oracle address for the collateral asset.
     */
    function updateCollateralAsset(
        address _collateralAsset,
        address _anchor,
        uint256 _factor,
        address _oracle
    ) external onlyRole(Role.OPERATOR) collateralAssetExists(_collateralAsset) {
        require(_oracle != address(0), Error.ADDRESS_INVALID_ORACLE);
        // Setting the factor to 0 effectively sunsets a collateral asset, which is intentionally allowed.
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, Error.COLLATERAL_INVALID_FACTOR);

        if (_anchor != address(0)) {
            ms().collateralAssets[_collateralAsset].anchor = _anchor;
        }
        ms().collateralAssets[_collateralAsset].factor = FixedPoint.Unsigned(_factor);
        ms().collateralAssets[_collateralAsset].oracle = AggregatorV2V3Interface(_oracle);

        emit MinterEvent.CollateralAssetUpdated(_collateralAsset, _factor, _oracle, _anchor);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Adds a Kresko asset to the protocol.
     * @dev Only callable by the owner.
     * @param _krAsset The address of the wrapped Kresko asset, needs to support IKreskoAsset.
     * @param _anchor Underlying anchor for the krAsset, needs to support IKreskoAssetAnchor.
     * @param _kFactor The k-factor of the Kresko asset as a raw value for a FixedPoint.Unsigned. Must be >= 1e18.
     * @param _oracle The oracle address for the Kresko asset.
     * @param _supplyLimit The initial total supply limit for the Kresko asset.
     * @param _closeFee The initial close fee percentage for the Kresko asset.
     * @param _openFee The initial open fee percentage for the Kresko asset.
     */
    function addKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _oracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external onlyRole(Role.OPERATOR) kreskoAssetDoesNotExist(_krAsset) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, Error.KRASSET_INVALID_FACTOR);
        require(_oracle != address(0), Error.ADDRESS_INVALID_ORACLE);

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

        // Store details.
        ms().kreskoAssets[_krAsset] = KrAsset({
            kFactor: FixedPoint.Unsigned(_kFactor),
            oracle: AggregatorV2V3Interface(_oracle),
            anchor: _anchor,
            supplyLimit: _supplyLimit,
            closeFee: FixedPoint.Unsigned(_closeFee),
            openFee: FixedPoint.Unsigned(_openFee),
            exists: true
        });
        emit MinterEvent.KreskoAssetAdded(_krAsset, _anchor, _oracle, _kFactor, _supplyLimit, _closeFee, _openFee);
    }

    /**
     * @notice Updates the k-factor of a previously added Kresko asset.
     * @dev Only callable by the owner.
     * @param _krAsset The address of the Kresko asset.
     * @param _anchor Underlying anchor for a krAsset.
     * @param _kFactor The new k-factor as a raw value for a FixedPoint.Unsigned. Must be >= 1e18.
     * @param _oracle The new oracle address for the Kresko asset's USD value.
     * @param _supplyLimit The new total supply limit for the Kresko asset.
     * @param _closeFee The new close fee percentage for the Kresko asset.
     * @param _openFee The new open fee percentage for the Kresko asset.
     */
    function updateKreskoAsset(
        address _krAsset,
        address _anchor,
        uint256 _kFactor,
        address _oracle,
        uint256 _supplyLimit,
        uint256 _closeFee,
        uint256 _openFee
    ) external onlyRole(Role.OPERATOR) kreskoAssetExists(_krAsset) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, Error.KRASSET_INVALID_FACTOR);
        require(_oracle != address(0), Error.ADDRESS_INVALID_ORACLE);
        require(_closeFee <= Constants.MAX_CLOSE_FEE, Error.PARAM_CLOSE_FEE_TOO_HIGH);
        require(_openFee <= Constants.MAX_OPEN_FEE, Error.PARAM_OPEN_FEE_TOO_HIGH);

        KrAsset memory krAsset = ms().kreskoAssets[_krAsset];

        if (address(_anchor) != address(0)) {
            krAsset.anchor = _anchor;
        }
        if (address(_oracle) != address(0)) {
            krAsset.oracle = AggregatorV2V3Interface(_oracle);
        }

        krAsset.kFactor = FixedPoint.Unsigned(_kFactor);
        krAsset.supplyLimit = _supplyLimit;
        krAsset.closeFee = FixedPoint.Unsigned(_closeFee);
        krAsset.openFee = FixedPoint.Unsigned(_openFee);
        ms().kreskoAssets[_krAsset] = krAsset;

        emit MinterEvent.KreskoAssetUpdated(_krAsset, _anchor, _oracle, _kFactor, _supplyLimit, _closeFee, _openFee);
    }

    /**
     * @notice Updates the fee recipient.
     * @param _feeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _feeRecipient) public override onlyRole(Role.OPERATOR) {
        require(_feeRecipient != address(0), Error.ADDRESS_INVALID_FEERECIPIENT);
        ms().feeRecipient = _feeRecipient;
        emit MinterEvent.FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @notice Updates the liquidation incentive multiplier.
     * @param _liquidationIncentiveMultiplier The new liquidation incentive multiplie.
     */
    function updateLiquidationIncentiveMultiplier(uint256 _liquidationIncentiveMultiplier)
        public
        override
        onlyRole(Role.OPERATOR)
    {
        require(
            _liquidationIncentiveMultiplier >= Constants.MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _liquidationIncentiveMultiplier <= Constants.MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_HIGH
        );
        ms().liquidationIncentiveMultiplier = FixedPoint.Unsigned(_liquidationIncentiveMultiplier);
        emit MinterEvent.LiquidationIncentiveMultiplierUpdated(_liquidationIncentiveMultiplier);
    }

    /**
     * @dev Updates the contract's collateralization ratio.
     * @param _minimumCollateralizationRatio The new minimum collateralization ratio as a raw value
     * for a FixedPoint.Unsigned.
     */
    function updateMinimumCollateralizationRatio(uint256 _minimumCollateralizationRatio)
        public
        override
        onlyRole(Role.OPERATOR)
    {
        require(
            _minimumCollateralizationRatio >= Constants.MIN_COLLATERALIZATION_RATIO,
            Error.PARAM_MIN_COLLATERAL_RATIO_LOW
        );
        ms().minimumCollateralizationRatio = FixedPoint.Unsigned(_minimumCollateralizationRatio);
        emit MinterEvent.MinimumCollateralizationRatioUpdated(_minimumCollateralizationRatio);
    }

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _minimumDebtValue The new minimum debt value as a raw value for a FixedPoint.Unsigned.
     */
    function updateMinimumDebtValue(uint256 _minimumDebtValue) public override onlyRole(Role.OPERATOR) {
        require(_minimumDebtValue <= Constants.MAX_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        ms().minimumDebtValue = FixedPoint.Unsigned(_minimumDebtValue);
        emit MinterEvent.MinimumDebtValueUpdated(_minimumDebtValue);
    }

    /**
     * @dev Updates the contract's liquidation threshold value
     * @param _liquidationThreshold The new liquidation threshold value
     */
    function updateLiquidationThreshold(uint256 _liquidationThreshold) public override onlyRole(Role.OPERATOR) {
        // Liquidation threshold cannot be greater than minimum collateralization ratio
        require(
            FixedPoint.Unsigned(_liquidationThreshold).isLessThanOrEqual(ms().minimumCollateralizationRatio),
            Error.INVALID_LT
        );
        ms().liquidationThreshold = FixedPoint.Unsigned(_liquidationThreshold);
        emit MinterEvent.LiquidationThresholdUpdated(_liquidationThreshold);
    }
}
