// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {IMinterAdminFacet} from "../interfaces/IMinterAdminFacet.sol";
import {ICollateralFacet} from "../interfaces/ICollateralFacet.sol";
import {IKreskoAsset} from "../interfaces/IKreskoAsset.sol";
import {INonRebasingWrapperToken} from "../interfaces/INonRebasingWrapperToken.sol";

import {AccessControl, Roles} from "../shared/AccessControl.sol";
import {ds, DiamondModifiers, MinterModifiers, Meta} from "../shared/Modifiers.sol";
import "../shared/Constants.sol";

import {ms, MinterState, MinterEvent, FixedPoint, Error, IERC20MetadataUpgradeable} from "../storage/MinterStorage.sol";
import {MinterInitParams, KrAsset, CollateralAsset, AggregatorV2V3Interface} from "../storage/minter/Structs.sol";

contract MinterAdminFacet is DiamondModifiers, MinterModifiers, IMinterAdminFacet {
    /* -------------------------------------------------------------------------- */
    /*                                 Initializer                                */
    /* -------------------------------------------------------------------------- */
    function initialize(MinterInitParams calldata params) external onlyOwner {
        MinterState storage s = ms();
        require(!s.initialized, Error.ALREADY_INITIALIZED);
        s.initialize(params.operator);
        AccessControl.grantRole(Roles.MINTER_OPERATOR, params.operator);

        // Minter protocol version domain
        s.domainSeparator = Meta.domainSeparator("Kresko Minter", "V1");

        // Set paramateres
        s.feeRecipient = params.feeRecipient;
        s.burnFee = FixedPoint.Unsigned(params.burnFee);
        s.liquidationIncentiveMultiplier = FixedPoint.Unsigned(params.liquidationIncentiveMultiplier);
        s.minimumCollateralizationRatio = FixedPoint.Unsigned(params.minimumCollateralizationRatio);
        s.minimumDebtValue = FixedPoint.Unsigned(params.minimumDebtValue);
        s.secondsUntilStalePrice = params.secondsUntilStalePrice;

        ds().supportedInterfaces[type(IMinterAdminFacet).interfaceId] = true;
        ds().supportedInterfaces[type(ICollateralFacet).interfaceId] = true;
    }

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

        ms().collateralAssets[_collateralAsset] = CollateralAsset({
            factor: FixedPoint.Unsigned(_factor),
            oracle: AggregatorV2V3Interface(_oracle),
            underlyingRebasingToken: underlyingRebasingToken,
            exists: true,
            decimals: IERC20MetadataUpgradeable(_collateralAsset).decimals()
        });
        emit MinterEvent.CollateralAssetAdded(_collateralAsset, _factor, _oracle);
    }

    /**
     * @notice Updates a previously added collateral asset.
     * @dev Only callable by the owner.
     * @param _collateralAsset The address of the collateral asset.
     * @param _factor The new collateral factor as a raw value for a FixedPoint.Unsigned. Must be <= 1e18.
     * @param _oracle The new oracle address for the collateral asset.
     */
    function updateCollateralAsset(
        address _collateralAsset,
        uint256 _factor,
        address _oracle
    ) external onlyOwner collateralAssetExists(_collateralAsset) {
        require(_oracle != address(0), "KR: !oracleAddr");
        // Setting the factor to 0 effectively sunsets a collateral asset, which is intentionally allowed.
        require(_factor <= FixedPoint.FP_SCALING_FACTOR, "KR: factor > 1FP");

        ms().collateralAssets[_collateralAsset].factor = FixedPoint.Unsigned(_factor);
        ms().collateralAssets[_collateralAsset].oracle = AggregatorV2V3Interface(_oracle);
        emit MinterEvent.CollateralAssetUpdated(_collateralAsset, _factor, _oracle);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Adds a Kresko asset to the protocol.
     * @dev Only callable by the owner and cannot be called more than once for a given symbol.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _symbol The symbol of the Kresko asset.
     * @param _kFactor The k-factor of the Kresko asset as a raw value for a FixedPoint.Unsigned. Must be >= 1e18.
     * @param _oracle The oracle address for the Kresko asset.
     * @param _marketCapUSDLimit The initial market capitalization USD limit for the Kresko asset.
     */
    function addKreskoAsset(
        address _kreskoAsset,
        string calldata _symbol,
        uint256 _kFactor,
        address _oracle,
        uint256 _marketCapUSDLimit
    ) external onlyOwner nonNullString(_symbol) kreskoAssetDoesNotExist(_kreskoAsset, _symbol) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, "KR: kFactor < 1FP");
        require(_oracle != address(0), "KR: !oracleAddr");
        IKreskoAsset kreskoAsset = IKreskoAsset(_kreskoAsset);
        require(kreskoAsset.hasRole(kreskoAsset.OPERATOR_ROLE(), address(this)), Error.NOT_OPERATOR);

        // Store symbol to prevent duplicate KreskoAsset symbols.
        ms().kreskoAssetSymbols[_symbol] = true;

        // Deploy KreskoAsset contract and store its details.
        ms().kreskoAssets[_kreskoAsset] = KrAsset({
            kFactor: FixedPoint.Unsigned(_kFactor),
            oracle: AggregatorV2V3Interface(_oracle),
            exists: true,
            mintable: true,
            marketCapUSDLimit: _marketCapUSDLimit
        });
        emit MinterEvent.KreskoAssetAdded(_kreskoAsset, _symbol, _kFactor, _oracle, _marketCapUSDLimit);
    }

    /**
     * @notice Updates the k-factor of a previously added Kresko asset.
     * @dev Only callable by the owner.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _kFactor The new k-factor as a raw value for a FixedPoint.Unsigned. Must be >= 1e18.
     * @param _oracle The new oracle address for the Kresko asset's USD value.
     * @param _mintable The new mintable value.
     * @param _marketCapUSDLimit The new market capitalization USD limit.
     */
    function updateKreskoAsset(
        address _kreskoAsset,
        uint256 _kFactor,
        address _oracle,
        bool _mintable,
        uint256 _marketCapUSDLimit
    ) external onlyOwner kreskoAssetExistsMaybeNotMintable(_kreskoAsset) {
        require(_kFactor >= FixedPoint.FP_SCALING_FACTOR, "KR: kFactor < 1FP");
        require(_oracle != address(0), "KR: !oracleAddr");

        KrAsset memory krAsset = ms().kreskoAssets[_kreskoAsset];
        krAsset.kFactor = FixedPoint.Unsigned(_kFactor);
        krAsset.oracle = AggregatorV2V3Interface(_oracle);
        krAsset.mintable = _mintable;
        krAsset.marketCapUSDLimit = _marketCapUSDLimit;
        ms().kreskoAssets[_kreskoAsset] = krAsset;

        emit MinterEvent.KreskoAssetUpdated(_kreskoAsset, _kFactor, _oracle, _mintable, _marketCapUSDLimit);
    }

    /**
     * @notice Updates the burn fee.
     * @param _burnFee The new burn fee as a raw value for a FixedPoint.Unsigned.
     */
    function updateBurnFee(uint256 _burnFee) external override onlyRole(Roles.MINTER_OPERATOR) {
        require(_burnFee <= MAX_BURN_FEE, Error.PARAM_BURN_FEE_TOO_HIGH);
        ms().burnFee = FixedPoint.Unsigned(_burnFee);
        emit MinterEvent.BurnFeeUpdated(_burnFee);
    }

    /**
     * @notice Updates the fee recipient.
     * @param _feeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _feeRecipient) external override onlyRole(Roles.MINTER_OPERATOR) {
        require(_feeRecipient != address(0), Error.ADDRESS_INVALID_FEERECIPIENT);
        ms().feeRecipient = _feeRecipient;
        emit MinterEvent.FeeRecipientUpdated(_feeRecipient);
    }

    /**
     * @notice Updates the liquidation incentive multiplier.
     * @param _liquidationIncentiveMultiplier The new liquidation incentive multiplie.
     */
    function updateLiquidationIncentiveMultiplier(uint256 _liquidationIncentiveMultiplier)
        external
        override
        onlyRole(Roles.MINTER_OPERATOR)
    {
        require(
            _liquidationIncentiveMultiplier >= MIN_LIQUIDATION_INCENTIVE_MULTIPLIER,
            Error.PARAM_LIQUIDATION_INCENTIVE_LOW
        );
        require(
            _liquidationIncentiveMultiplier <= MAX_LIQUIDATION_INCENTIVE_MULTIPLIER,
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
        external
        override
        onlyRole(Roles.MINTER_OPERATOR)
    {
        require(_minimumCollateralizationRatio >= MIN_COLLATERALIZATION_RATIO, Error.PARAM_MIN_COLLATERAL_RATIO_LOW);
        ms().minimumCollateralizationRatio = FixedPoint.Unsigned(_minimumCollateralizationRatio);
        emit MinterEvent.MinimumCollateralizationRatioUpdated(_minimumCollateralizationRatio);
    }

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _minimumDebtValue The new minimum debt value as a raw value for a FixedPoint.Unsigned.
     */
    function updateMinimumDebtValue(uint256 _minimumDebtValue) external override onlyRole(Roles.MINTER_OPERATOR) {
        require(_minimumDebtValue <= MAX_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        ms().minimumDebtValue = FixedPoint.Unsigned(_minimumDebtValue);
        emit MinterEvent.MinimumDebtValueUpdated(_minimumDebtValue);
    }

    /**
     * @dev Updates the contract's seconds until stale price value
     * @param _secondsUntilStalePrice The new seconds until stale price.
     */
    function updateSecondsUntilStalePrice(uint256 _secondsUntilStalePrice) external onlyOwner {
        ms().secondsUntilStalePrice = _secondsUntilStalePrice;
        emit MinterEvent.SecondsUntilStalePriceUpdated(_secondsUntilStalePrice);
    }
}
