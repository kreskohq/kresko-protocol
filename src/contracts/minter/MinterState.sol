// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {LibKrAsset} from "./libs/LibKrAsset.sol";
import {LibAccount} from "./libs/LibAccount.sol";
import {LibCollateral} from "./libs/LibCollateral.sol";
import {LibCalc} from "./libs/LibCalculation.sol";
import {LibRepay} from "./libs/LibRepay.sol";
import {LibMint} from "./libs/LibMint.sol";
import {Action, SafetyState, CollateralAsset, KrAsset, FixedPoint} from "./MinterTypes.sol";

/* solhint-disable state-visibility */

using LibCalc for MinterState global;
using LibKrAsset for MinterState global;
using LibCollateral for MinterState global;
using LibAccount for MinterState global;
using LibRepay for MinterState global;
using LibMint for MinterState global;

/// @title Complete storage layout for the minter state
struct MinterState {
    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Initialization version
    uint256 initializations;
    bytes32 domainSeparator;
    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */

    /// @notice The recipient of protocol fees.
    address feeRecipient;
    /// @notice The AMM oracle address.
    address ammOracle;
    /// @notice The factor used to calculate the incentive a liquidator receives in the form of seized collateral.
    FixedPoint.Unsigned liquidationIncentiveMultiplier;
    /// @notice The absolute minimum ratio of collateral value to debt value used to calculate collateral requirements.
    FixedPoint.Unsigned minimumCollateralizationRatio;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    FixedPoint.Unsigned minimumDebtValue;
    /// @notice The collateralization ratio at which positions may be liquidated.
    FixedPoint.Unsigned liquidationThreshold;
    /// @notice Flag tells if there is a need to perform safety checks on user actions
    bool safetyStateSet;
    /// @notice asset -> action -> state
    mapping(address => mapping(Action => SafetyState)) safetyState;
    /* -------------------------------------------------------------------------- */
    /*                              Collateral Assets                             */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of collateral asset token address to information on the collateral asset.
    mapping(address => CollateralAsset) collateralAssets;
    /**
     * @notice Mapping of account -> asset -> deposit amount
     */
    mapping(address => mapping(address => uint256)) collateralDeposits;
    /// @notice Mapping of account -> collateral asset addresses deposited
    mapping(address => address[]) depositedCollateralAssets;
    /* -------------------------------------------------------------------------- */
    /*                                Kresko Assets                               */
    /* -------------------------------------------------------------------------- */

    /// @notice Mapping of Kresko asset token address to information on the Kresko asset.
    mapping(address => KrAsset) kreskoAssets;
    /// @notice Mapping of account -> krAsset -> debt amount owed to the protocol
    mapping(address => mapping(address => uint256)) kreskoAssetDebt;
    /// @notice Mapping of account -> addresses of borrowed krAssets
    mapping(address => address[]) mintedKreskoAssets;
}
