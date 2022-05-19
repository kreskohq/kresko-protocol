// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../../../libraries/FixedPoint.sol";
import "../../../libraries/FixedPointMath.sol";
import "../../../libraries/Arrays.sol";

/* solhint-disable no-inline-assembly */
/* solhint-disable state-visibility */

/*
 * Storage for the Kresko minter app.
 */

/*
 * ==================================================
 * =================== Constants ====================
 * ==================================================
 */

uint256 constant ONE_HUNDRED_PERCENT = 1e18;

//  The maximum configurable burn fee.
uint256 constant MAX_BURN_FEE = 5e16; // 5%

// The minimum configurable minimum collateralization ratio.
uint256 constant MIN_COLLATERALIZATION_RATIO = 1e18; // 100%

// The minimum configurable liquidation incentive multiplier.
// This means liquidator only receives equal amount of collateral to debt repaid.
uint256 constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = 1e18; // 100%

// The maximum configurable liquidation incentive multiplier.
// This means liquidator receives 25% bonus collateral compared to the debt repaid.
uint256 constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25e18; // 125%

// The maximum configurable minimum debt USD value.
uint256 constant MAX_DEBT_VALUE = 1000e18; // $1,000

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
    bool exists;
    bool mintable;
    uint256 marketCapUSDLimit;
}

library LibKresko {
    /**
     * @notice Emitted when the a trusted contract is added/removed.
     * @param contractAddress A trusted contract (eg. Kresko Zapper).
     * @param allowed true if the contract was added, false if removed
     * @param targetContract the target contract to operate on
     */
    event OperatorToggled(address indexed contractAddress, address indexed targetContract, bool indexed allowed);

    /* -------------------------------------------------------------------------- */
    /*                                   Storage                                  */
    /* -------------------------------------------------------------------------- */

    bytes32 constant KRESKO_STORAGE_POSITION = keccak256("kresko.general.storage");

    struct krStorage {
        mapping(address => mapping(address => bool)) operators;
    }

    function kr() internal pure returns (krStorage storage kr_) {
        bytes32 position = KRESKO_STORAGE_POSITION;
        assembly {
            kr_.slot := position
        }
    }

    /**
     * @notice Toggles a trusted contract to perform restricted actions on targets (eg. helper contracts).
     * @param _operator contract that is trusted.
     * @param _target contract allowed to operate on
     */
    function toggleOperator(address _operator, address _target) external {
        bool allowed = !kr().operators[_operator][_target];

        kr().operators[_operator][_target] = allowed;

        emit OperatorToggled(_operator, _target, allowed);
    }

    /**
     * @notice Ensure caller is a trusted contracts
     * @param _target triggers the check
     * @param _condition triggers the check
     */
    modifier onlyOperator(address _target, bool _condition) {
        if (_condition) {
            require(kr().operators[msg.sender][_target], "KR: Unauthorized caller");
        }
        _;
    }
}
