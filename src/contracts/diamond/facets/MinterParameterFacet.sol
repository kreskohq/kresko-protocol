// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IMinterParameterFacet} from "../interfaces/IMinterParameterFacet.sol";

import "../shared/Meta.sol";
import "../shared/AccessControl.sol";
import "../shared/Errors.sol";
import "../shared/Events.sol";
import "../libraries/FixedPoint.sol";
import {MinterModifiers} from "../shared/Modifiers.sol";
import {MinterInitParams} from "../storage/MinterStructs.sol";
import {MinterStorage, MinterState} from "../storage/MinterStorage.sol";

contract MinterParameterFacet is MinterModifiers, IMinterParameterFacet {
    /* -------------------------------------------------------------------------- */
    /*                                  Constants                                 */
    /* -------------------------------------------------------------------------- */

    uint256 constant ONE_HUNDRED_PERCENT = 1e18;

    /// @notice The maximum configurable burn fee.
    uint256 constant MAX_BURN_FEE = 5e16; // 5%

    /// @notice The minimum configurable minimum collateralization ratio.
    uint256 constant MIN_COLLATERALIZATION_RATIO = 1e18; // 100%

    /// @notice The minimum configurable liquidation incentive multiplier.
    /// This means liquidator only receives equal amount of collateral to debt repaid.
    uint256 constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = 1e18; // 100%

    /// @notice The maximum configurable liquidation incentive multiplier.
    /// This means liquidator receives 25% bonus collateral compared to the debt repaid.
    uint256 constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25e18; // 125%

    /// @notice The maximum configurable minimum debt USD value.
    uint256 constant MAX_DEBT_VALUE = 1000e18; // $1,000

    function initialize(MinterInitParams calldata params) external onlyOwner {
        MinterState storage s = ms();
        require(!s.initialized, Error.ALREADY_INITIALIZED);
        MinterStorage.initialize();
        AccessControl.grantRole(MINTER_OPERATOR_ROLE, params.operator);

        // Minter protocol version domain
        s.domainSeparator = Meta.domainSeparator("Kresko Minter", "V1");

        // Set paramateres
        s.feeRecipient = params.feeRecipient;
        s.burnFee = FixedPoint.Unsigned(params.burnFee);
        s.liquidationIncentiveMultiplier = FixedPoint.Unsigned(params.liquidationIncentiveMultiplier);
        s.minimumCollateralizationRatio = FixedPoint.Unsigned(params.minimumCollateralizationRatio);
        s.minimumDebtValue = FixedPoint.Unsigned(params.minimumDebtValue);

        ds().supportedInterfaces[type(IMinterParameterFacet).interfaceId] = true;
        emit GeneralEvent.Initialized(params.operator, s.storageVersion);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Updates the burn fee.
     * @param _burnFee The new burn fee as a raw value for a FixedPoint.Unsigned.
     */
    function updateBurnFee(uint256 _burnFee) external override onlyRole(MINTER_OPERATOR_ROLE) {
        require(_burnFee <= MAX_BURN_FEE, Error.PARAM_BURN_FEE_TOO_HIGH);
        ms().burnFee = FixedPoint.Unsigned(_burnFee);
        emit MinterEvent.BurnFeeUpdated(_burnFee);
    }

    /**
     * @notice Updates the fee recipient.
     * @param _feeRecipient The new fee recipient.
     */
    function updateFeeRecipient(address _feeRecipient) external override onlyRole(MINTER_OPERATOR_ROLE) {
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
        onlyRole(MINTER_OPERATOR_ROLE)
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
        onlyRole(MINTER_OPERATOR_ROLE)
    {
        require(_minimumCollateralizationRatio >= MIN_COLLATERALIZATION_RATIO, Error.PARAM_MIN_COLLATERAL_RATIO_LOW);
        ms().minimumCollateralizationRatio = FixedPoint.Unsigned(_minimumCollateralizationRatio);
        emit MinterEvent.MinimumCollateralizationRatioUpdated(_minimumCollateralizationRatio);
    }

    /**
     * @dev Updates the contract's minimum debt value.
     * @param _minimumDebtValue The new minimum debt value as a raw value for a FixedPoint.Unsigned.
     */
    function updateMinimumDebtValue(uint256 _minimumDebtValue) external override onlyRole(MINTER_OPERATOR_ROLE) {
        require(_minimumDebtValue <= MAX_DEBT_VALUE, Error.PARAM_MIN_DEBT_AMOUNT_HIGH);
        ms().minimumDebtValue = FixedPoint.Unsigned(_minimumDebtValue);
        emit MinterEvent.MinimumDebtValueUpdated(_minimumDebtValue);
    }
}
