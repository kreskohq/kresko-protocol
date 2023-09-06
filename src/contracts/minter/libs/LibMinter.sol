// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable not-rely-on-time
// solhint-disable-next-line
/* solhint-disable state-visibility */

import {SafeERC20} from "common/SafeERC20.sol";
import {IERC20Permit} from "common/IERC20Permit.sol";
import {Arrays} from "common/libs/Arrays.sol";
import {WadRay} from "contracts/common/libs/WadRay.sol";
import {MinterEvent} from "common/Events.sol";
import {Error} from "common/Errors.sol";
import {IKreskoAssetIssuer} from "kresko-asset/IKreskoAssetIssuer.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {LibRedstone} from "minter/libs/LibRedstone.sol";
import {RebaseMath} from "kresko-asset/Rebase.sol";
import {scdp, PoolKrAsset} from "scdp/libs/LibSCDP.sol";
import {sdi} from "scdp/libs/LibSDI.sol";

/**
 * @title Storage layout for the minter state
 * @author Kresko
 */

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
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minimumCollateralizationRatio;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    uint256 minimumDebtValue;
    /// @notice The collateralization ratio at which positions may be liquidated.
    uint256 liquidationThreshold;
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

    /// @notice Mapping of kresko asset token address to information on the Kresko asset.
    mapping(address => KrAsset) kreskoAssets;
    /// @notice Mapping of account -> krAsset -> debt amount owed to the protocol
    mapping(address => mapping(address => uint256)) kreskoAssetDebt;
    /// @notice Mapping of account -> addresses of borrowed krAssets
    mapping(address => address[]) mintedKreskoAssets;
    /// @notice Offchain oracle decimals
    uint8 extOracleDecimals;
    /// @notice Liquidation Overflow Multiplier, multiplies max liquidatable value.
    uint256 maxLiquidationMultiplier;
    /* -------------------------------------------------------------------------- */
    /*                                  ORACLE                                  */
    /* -------------------------------------------------------------------------- */

    /// @notice The oracle deviation percentage between the main oracle and fallback oracle.
    uint256 oracleDeviationPct;
    /// @notice L2 sequencer feed address
    address sequencerUptimeFeed;
    /// @notice grace period of sequencer in seconds
    uint256 sequencerGracePeriodTime;
    /// @notice timeout for oracle in seconds
    uint256 oracleTimeout;
}

// Storage position
bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

function ms() pure returns (MinterState storage state) {
    bytes32 position = MINTER_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

using LibCalculation for MinterState global;
using LibKrAsset for MinterState global;
using LibCollateral for MinterState global;
using LibAccount for MinterState global;
using LibBurn for MinterState global;
using LibMint for MinterState global;
using LibAssetUtility for KrAsset global;
using LibAssetUtility for CollateralAsset global;

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

library Constants {
    uint256 constant FP_DECIMALS = 18;

    uint256 constant FP_SCALING_FACTOR = 10 ** FP_DECIMALS;

    uint256 constant ONE_HUNDRED_PERCENT = 1 ether;

    uint256 constant BASIS_POINT = 1e14;

    /// @dev The maximum configurable close fee.
    uint256 constant MAX_CLOSE_FEE = 0.1 ether; // 10%

    /// @dev The maximum configurable open fee.
    uint256 constant MAX_OPEN_FEE = 0.1 ether; // 10%

    /// @dev The maximum configurable protocol fee per asset for collateral pool swaps.
    uint256 constant MAX_COLLATERAL_POOL_PROTOCOL_FEE = 0.5 ether; // 50%

    /// @dev Overflow over maximum liquidatable value to allow leeway for users after one happens.
    uint256 constant MIN_MAX_LIQUIDATION_MULTIPLIER = ONE_HUNDRED_PERCENT + BASIS_POINT; // 100.01% or .01% over

    /// @dev The minimum configurable minimum collateralization ratio.
    uint256 constant MIN_COLLATERALIZATION_RATIO = ONE_HUNDRED_PERCENT;

    /// @dev The minimum configurable liquidation incentive multiplier.
    /// This means liquidator only receives equal amount of collateral to debt repaid.
    uint256 constant MIN_LIQUIDATION_INCENTIVE_MULTIPLIER = ONE_HUNDRED_PERCENT;

    /// @dev The maximum configurable liquidation incentive multiplier.
    /// This means liquidator receives 25% bonus collateral compared to the debt repaid.
    uint256 constant MAX_LIQUIDATION_INCENTIVE_MULTIPLIER = 1.25 ether; // 125%

    /// @dev The minimum collateral amount for a kresko asset.
    uint256 constant MIN_KRASSET_COLLATERAL_AMOUNT = 1e12;

    /// @dev The maximum configurable minimum debt USD value. 8 decimals.
    uint256 constant MAX_MIN_DEBT_VALUE = 1_000 * 1e8; // $1,000
}

/* -------------------------------------------------------------------------- */
/*                                    ENUM                                    */
/* -------------------------------------------------------------------------- */

/**
 * @dev Protocol user facing actions
 *
 * Deposit = 0
 * Withdraw = 1,
 * Repay = 2,
 * Borrow = 3,
 * Liquidate = 4
 */
enum Action {
    Deposit,
    Withdraw,
    Repay,
    Borrow,
    Liquidation
}
/**
 * @dev Fee types
 *
 * Open = 0
 * Close = 1
 */

enum Fee {
    Open,
    Close
}

/* ========================================================================== */
/*                                   STRUCTS                                  */
/* ========================================================================== */

/**
 * @notice Initialization arguments for the protocol
 */
struct MinterInitArgs {
    address admin;
    address council;
    address treasury;
    uint8 extOracleDecimals;
    uint256 minimumCollateralizationRatio;
    uint256 minimumDebtValue;
    uint256 liquidationThreshold;
    uint256 oracleDeviationPct;
    address sequencerUptimeFeed;
    uint256 sequencerGracePeriodTime;
    uint256 oracleTimeout;
}

/**
 * @notice Configurable parameters within the protocol
 */

struct MinterParams {
    uint256 minimumCollateralizationRatio;
    uint256 minimumDebtValue;
    uint256 liquidationThreshold;
    uint256 liquidationOverflowPercentage;
    address feeRecipient;
    uint8 extOracleDecimals;
    uint256 oracleDeviationPct;
}

/**
 * @notice Information on a token that is a KreskoAsset.
 * @dev Each KreskoAsset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for KreskoAsset debt.
 * @param oracle The oracle that provides the USD price of one KreskoAsset.
 * @param supplyLimit The total supply limit of the KreskoAsset.
 * @param anchor The anchor address
 * @param closeFee The percentage paid in fees when closing a debt position of this type.
 * @param openFee The percentage paid in fees when opening a debt position of this type.
 * @param exists Whether the KreskoAsset exists within the protocol.
 */
struct KrAsset {
    uint256 kFactor;
    AggregatorV3Interface oracle;
    uint256 supplyLimit;
    address anchor;
    uint256 closeFee;
    uint256 openFee;
    bool exists;
    bytes32 redstoneId;
}

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param anchor If the collateral is a KreskoAsset, the anchor address
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 * @param liquidationIncentive The liquidation incentive for the asset
 */
struct CollateralAsset {
    uint256 factor;
    AggregatorV3Interface oracle;
    address anchor;
    uint8 decimals;
    bool exists;
    uint256 liquidationIncentive;
    bytes32 redstoneId;
}

/// @notice Configuration for pausing `Action`
struct Pause {
    bool enabled;
    uint256 timestamp0;
    uint256 timestamp1;
}

/// @notice Safety configuration for assets
struct SafetyState {
    Pause pause;
}

library LibAccount {
    using RebaseMath for uint256;
    using WadRay for uint256;
    using LibDecimals for uint256;

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(
        MinterState storage self,
        address _account
    ) internal view returns (address[] memory) {
        return self.mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getDepositedCollateralAssets(
        MinterState storage self,
        address _account
    ) internal view returns (address[] memory) {
        return self.depositedCollateralAssets[_account];
    }

    /**
     * @notice Get deposited collateral asset amount for an account
     * @notice Performs rebasing conversion for KreskoAssets
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return uint256 amount of collateral for `_asset`
     */
    function getCollateralDeposits(
        MinterState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        return self.collateralAssets[_asset].toRebasingAmount(self.collateralDeposits[_account][_asset]);
    }

    /**
     * @notice Checks if accounts collateral value is less than required.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(MinterState storage self, address _account) internal view returns (bool) {
        return
            self.getAccountCollateralValue(_account) <
            (self.getAccountMinimumCollateralValueAtRatio(_account, self.liquidationThreshold));
    }

    /**
     * @notice Overload for calculating liquidatable status with a future liquidated collateral value
     * @param _account The account to check.
     * @param _valueLiquidated Value liquidated, eg. in a batch liquidation
     * @return bool indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(
        MinterState storage self,
        address _account,
        uint256 _valueLiquidated
    ) internal view returns (bool) {
        return
            self.getAccountCollateralValue(_account) - _valueLiquidated <
            (self.getAccountMinimumCollateralValueAtRatio(_account, self.liquidationThreshold));
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return totalCollateralValue The collateral value of a particular account.
     */
    function getAccountCollateralValue(
        MinterState storage self,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 collateralValue, ) = self.getCollateralValueAndOraclePrice(
                asset,
                self.getCollateralDeposits(_account, asset),
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue += collateralValue;
            unchecked {
                i++;
            }
        }

        return totalCollateralValue;
    }

    /**
     * @notice Gets the collateral value of a particular account including extra return value for specific collateral.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @param _collateralAsset The collateral asset to get the collateral value.
     * @return totalCollateralValue The collateral value of a particular account.
     */
    function getAccountCollateralValue(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 totalCollateralValue, uint256 specificValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 collateralValue, ) = self.getCollateralValueAndOraclePrice(
                asset,
                self.getCollateralDeposits(_account, asset),
                false // Take the collateral factor into consideration.
            );
            totalCollateralValue += collateralValue;
            if (asset == _collateralAsset) {
                specificValue = collateralValue;
            }

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Gets accounts min collateral value required to cover debt at a given collateralization ratio.
     * @dev 1. Account with min collateral value under MCR will not borrow.
     *      2. Account with min collateral value under LT can be liquidated.
     * @param _account The account to calculate the minimum collateral value for.
     * @param _ratio The collateralization ratio to get min collateral value against.
     * @return The min collateral value at given collateralization ratio for the account.
     */
    function getAccountMinimumCollateralValueAtRatio(
        MinterState storage self,
        address _account,
        uint256 _ratio
    ) internal view returns (uint256) {
        return self.getAccountKrAssetValue(_account).wadMul(_ratio);
    }

    /**
     * @notice Gets the total KreskoAsset value in USD for an account.
     * @param _account The account to calculate the KreskoAsset value for.
     * @return value The KreskoAsset value of the account.
     */
    function getAccountKrAssetValue(MinterState storage self, address _account) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += self.getKrAssetValue(asset, self.getKreskoAssetDebtPrincipal(_account, asset), false);
            unchecked {
                i++;
            }
        }
        return value;
    }

    /**
     * @notice Get `_account` principal debt amount for `_asset`
     * @dev Principal debt is rebase adjusted due to possible stock splits/reverse splits
     * @param _asset The asset address
     * @param _account The account to query amount for
     * @return Amount of principal debt for `_asset`
     */
    function getKreskoAssetDebtPrincipal(
        MinterState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        return self.kreskoAssets[_asset].toRebasingAmount(self.kreskoAssetDebt[_account][_asset]);
    }

    /**
     * @notice Gets an index for the Kresko asset the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @param _kreskoAsset The asset lookup address.
     * @return i = index of the minted Kresko asset.
     */
    function getMintedKreskoAssetsIndex(
        MinterState storage self,
        address _account,
        address _kreskoAsset
    ) internal view returns (uint256 i) {
        uint256 length = self.mintedKreskoAssets[_account].length;
        require(length > 0, Error.NO_KRASSETS_MINTED);
        for (i; i < length; ) {
            if (self.mintedKreskoAssets[_account][i] == _kreskoAsset) {
                break;
            }
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Gets an index for the collateral asset the account has deposited.
     * @param _account The account to get the index for.
     * @param _collateralAsset The asset lookup address.
     * @return i = index of the minted collateral asset.
     */
    function getDepositedCollateralAssetIndex(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 i) {
        uint256 length = self.depositedCollateralAssets[_account].length;
        require(length > 0, Error.NO_COLLATERAL_DEPOSITS);
        for (i; i < length; ) {
            if (self.depositedCollateralAssets[_account][i] == _collateralAsset) {
                break;
            }
            unchecked {
                i++;
            }
        }
    }
}

/**
 * @title LibAssetUtility
 * @author Kresko
 * @notice Utility functions for KrAsset and CollateralAsset structs
 */
library LibAssetUtility {
    using WadRay for uint256;
    using LibDecimals for uint256;

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @param self the kresko asset struct
     * @param _nonRebasedAmount the amount to convert
     */
    function toRebasingAmount(KrAsset memory self, uint256 _nonRebasedAmount) internal view returns (uint256) {
        return IKreskoAssetAnchor(self.anchor).convertToAssets(_nonRebasedAmount);
    }

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @dev if collateral is not a kresko asset, returns the input
     * @param self the collateral asset struct
     * @param _nonRebasedAmount the amount to convert
     */
    function toRebasingAmount(CollateralAsset memory self, uint256 _nonRebasedAmount) internal view returns (uint256) {
        if (self.anchor == address(0)) return _nonRebasedAmount;
        return IKreskoAssetAnchor(self.anchor).convertToAssets(_nonRebasedAmount);
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @param self the kresko asset struct
     * @param _maybeRebasedAmount the amount to convert
     */
    function toNonRebasingAmount(KrAsset memory self, uint256 _maybeRebasedAmount) internal view returns (uint256) {
        return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @dev if collateral is not a kresko asset, returns the input
     * @param self the collateral asset struct
     * @param _maybeRebasedAmount the amount to convert
     */
    function toNonRebasingAmount(
        CollateralAsset memory self,
        uint256 _maybeRebasedAmount
    ) internal view returns (uint256) {
        if (self.anchor == address(0)) return _maybeRebasedAmount;
        return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with extOracleDecimals
     */
    function uintPrice(CollateralAsset memory self) private view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = self.oracle.latestRoundData();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function redstonePrice(CollateralAsset memory self) internal view returns (uint256) {
        return LibRedstone.getPrice(self.redstoneId);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function uintPrice(KrAsset memory self) private view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = self.oracle.latestRoundData();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     * @param self the kresko asset struct
     */
    function redstonePrice(KrAsset memory self) internal view returns (uint256) {
        return LibRedstone.getPrice(self.redstoneId);
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with 18 decimals
     */
    function wadPrice(CollateralAsset memory self) private view returns (uint256) {
        return uintPrice(self).oraclePriceToWad();
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with 18 decimals
     */
    function wadPrice(KrAsset memory self) private view returns (uint256) {
        return uintPrice(self).oraclePriceToWad();
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(CollateralAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return uintPrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the collateral asset struct
     * @param _assetAmount the amount to convert
     */
    function uintUSDRedstone(CollateralAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return redstonePrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return uintPrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     */
    function uintUSDRedstone(KrAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return redstonePrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the collateral asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(CollateralAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return _getPrice(uintPrice(self), redstonePrice(self), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the kresko asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(KrAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return _getPrice(uintPrice(self), self.redstonePrice(), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone in USD
     * @param self the collateral asset struct
     * @param _assetAmount the amount to convert
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintUSD(
        CollateralAsset memory self,
        uint256 _assetAmount,
        uint256 _oracleDeviationPct
    ) internal view returns (uint256) {
        return _getPrice(uintUSD(self, _assetAmount), uintUSDRedstone(self, _assetAmount), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone in USD
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintUSD(
        KrAsset memory self,
        uint256 _assetAmount,
        uint256 _oracleDeviationPct
    ) internal view returns (uint256) {
        return _getPrice(uintUSD(self, _assetAmount), uintUSDRedstone(self, _assetAmount), _oracleDeviationPct);
    }

    /**
     * @notice check the price and return it
     * @notice reverts if the price deviates more than `_oracleDeviationPct`
     * @param _chainlinkPrice chainlink price
     * @param _redstonePrice redstone price
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function _getPrice(
        uint256 _chainlinkPrice,
        uint256 _redstonePrice,
        uint256 _oracleDeviationPct
    ) internal view returns (uint256) {
        if (ms().sequencerUptimeFeed != address(0)) {
            (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(ms().sequencerUptimeFeed)
                .latestRoundData();
            bool isSequencerUp = answer == 0;
            if (!isSequencerUp) {
                return _redstonePrice;
            }
            // Make sure the grace period has passed after the
            // sequencer is back up.
            uint256 timeSinceUp = block.timestamp - startedAt;
            if (timeSinceUp <= ms().sequencerGracePeriodTime) {
                return _redstonePrice;
            }
        }
        if (_chainlinkPrice == 0 && _redstonePrice > 0) return _redstonePrice;
        if (_redstonePrice == 0) return _chainlinkPrice;
        if (
            (_redstonePrice.wadMul(1 ether - _oracleDeviationPct) <= _chainlinkPrice) &&
            (_redstonePrice.wadMul(1 ether + _oracleDeviationPct) >= _chainlinkPrice)
        ) {
            return _chainlinkPrice;
        }

        // Revert if price deviates more than `_oracleDeviationPct`
        revert(Error.ORACLE_PRICE_UNSTABLE);
    }

    function marketStatus(KrAsset memory self) internal pure returns (bool) {
        return true;
    }
}

library LibBurn {
    using Arrays for address[];

    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;

    using SafeERC20 for IERC20Permit;
    using LibCalculation for MinterState;

    /// @notice Repay user kresko asset debt.
    /// @dev Updates the principal in MinterState
    /// @param _kreskoAsset the asset being repaid
    /// @param _anchor the anchor token of the asset being repaid
    /// @param _burnAmount the asset amount being burned
    /// @param _account the account the debt is subtracted from
    function burn(
        MinterState storage self,
        address _kreskoAsset,
        address _anchor,
        uint256 _burnAmount,
        address _account
    ) internal {
        // Get the possibly rebalanced amount of destroyed tokens
        uint256 destroyed = IKreskoAssetIssuer(_anchor).destroy(_burnAmount, msg.sender);
        // Decrease the principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] -= destroyed;
    }

    /// @notice Repay user global asset debt. Updates rates for regular market.
    /// @param _kreskoAsset the asset being repaid
    /// @param _burnAmount the asset amount being burned
    function repaySwap(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _burnAmount,
        address _from
    ) internal returns (uint256 destroyed) {
        // Burn assets from the protocol, as they are sent in. Get the destroyed shares.
        destroyed = IKreskoAssetIssuer(self.kreskoAssets[_kreskoAsset].anchor).destroy(_burnAmount, _from);
        require(destroyed != 0, "repay-destroyed-amount-invalid");

        sdi().totalDebt -= sdi().previewBurn(_kreskoAsset, destroyed, false);
    }

    /**
     * @notice Charges the protocol close fee based off the value of the burned asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the close fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _burnAmount The amount of the kresko asset being burned.
     */
    function chargeCloseFee(
        MinterState storage self,
        address _account,
        address _kreskoAsset,
        uint256 _burnAmount
    ) internal {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        // Calculate the value of the fee according to the value of the krAssets being burned.
        uint256 feeValue = krAsset.uintUSD(_burnAmount, self.oracleDeviationPct).wadMul(krAsset.closeFee);

        // Do nothing if the fee value is 0.
        if (feeValue == 0) {
            return;
        }

        address[] memory accountCollateralAssets = self.depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.

        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];

            (uint256 transferAmount, uint256 feeValuePaid) = self.calcFee(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][collateralAssetAddress] -= self
                .collateralAssets[collateralAssetAddress]
                .toNonRebasingAmount(transferAmount);

            // Transfer the fee to the feeRecipient.
            IERC20Permit(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.CloseFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid);

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return;
            }
        }
    }

    /**
     * @notice Check that debt repaid does not leave a dust position, if it does:
     * return an amount that pays up to minDebtValue
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _burnAmount The amount being burned
     * @param _debtAmount The debt amount of `_account`
     * @return amount == 0 or >= minDebtAmount
     */
    function ensureNotDustPosition(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _burnAmount,
        uint256 _debtAmount
    ) internal view returns (uint256 amount) {
        // If the requested burn would put the user's debt position below the minimum
        // debt value, close up to the minimum debt value instead.
        uint256 krAssetValue = self.getKrAssetValue(_kreskoAsset, _debtAmount - _burnAmount, true);
        if (krAssetValue > 0 && krAssetValue < self.minimumDebtValue) {
            uint256 minDebtValue = self.minimumDebtValue.wadDiv(
                self.kreskoAssets[_kreskoAsset].uintPrice(self.oracleDeviationPct)
            );
            amount = _debtAmount - minDebtValue;
        } else {
            amount = _burnAmount;
        }
    }
}

/**
 * @title Library for collateral related operations
 * @author Kresko
 */
library LibCollateral {
    using LibDecimals for uint8;
    using Arrays for address[];
    using WadRay for uint256;

    /**
     * In case a collateral asset is also a kresko asset, convert an amount to anchor shares
     * @param _amount amount to possibly convert
     * @param _collateralAsset address of the collateral asset
     */
    function normalizeCollateralAmount(
        MinterState storage self,
        uint256 _amount,
        address _collateralAsset
    ) internal view returns (uint256 amount) {
        CollateralAsset memory asset = self.collateralAssets[_collateralAsset];
        if (asset.anchor != address(0)) {
            return IKreskoAssetAnchor(asset.anchor).convertToShares(_amount);
        }
        return _amount;
    }

    /**
     * @notice Get the state of a specific collateral asset
     * @param _asset Address of the asset.
     * @return State of assets `CollateralAsset` struct
     */
    function collateralAsset(MinterState storage self, address _asset) internal view returns (CollateralAsset memory) {
        return self.collateralAssets[_asset];
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to calculate the collateral value for.
     * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValueAndOraclePrice(
        MinterState storage self,
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) internal view returns (uint256, uint256) {
        CollateralAsset memory asset = self.collateralAssets[_collateralAsset];

        uint256 oraclePrice = asset.uintPrice(self.oracleDeviationPct);
        uint256 value = asset.decimals.toWad(_amount).wadMul(oraclePrice);

        if (!_ignoreCollateralFactor) {
            value = value.wadMul(asset.factor);
        }
        return (value, oraclePrice);
    }

    /**
     * @notice verifies that the account has sufficient collateral for the requested amount and records the collateral
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _collateralDeposits Collateral deposits for the account.
     * @param _depositedCollateralAssetIndex Index of the collateral asset in the account's deposited collateral assets array.
     */
    function verifyAndRecordCollateralWithdrawal(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _depositedCollateralAssetIndex
    ) internal {
        require(_withdrawAmount > 0, Error.ZERO_WITHDRAW);
        require(
            _depositedCollateralAssetIndex <= self.depositedCollateralAssets[_account].length - 1,
            Error.ARRAY_OUT_OF_BOUNDS
        );

        // Ensure that the operation passes checks MCR checks
        verifyAccountCollateral(self, _account, _collateralAsset, _withdrawAmount);

        uint256 newCollateralAmount = _collateralDeposits - _withdrawAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (self.collateralAssets[_collateralAsset].anchor != address(0)) {
            require(
                newCollateralAmount >= Constants.MIN_KRASSET_COLLATERAL_AMOUNT || newCollateralAmount == 0,
                Error.COLLATERAL_AMOUNT_TOO_LOW
            );
        }

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (newCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _depositedCollateralAssetIndex);
        }

        // Record the withdrawal.
        self.collateralDeposits[_account][_collateralAsset] = self
            .collateralAssets[_collateralAsset]
            .toNonRebasingAmount(newCollateralAmount);

        emit MinterEvent.CollateralWithdrawn(_account, _collateralAsset, _withdrawAmount);
    }

    /**
     * @notice Records account as having deposited an amount of a collateral asset.
     * @dev Token transfers are expected to be done by the caller.
     * @param _account The address of the collateral asset.
     * @param _collateralAsset The address of the collateral asset.
     * @param _depositAmount The amount of the collateral asset deposited.
     */
    function recordCollateralDeposit(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _depositAmount
    ) internal {
        // Because the depositedCollateralAssets[_account] is pushed to if the existing
        // deposit amount is 0, require the amount to be > 0. Otherwise, the depositedCollateralAssets[_account]
        // could be filled with duplicates, causing collateral to be double-counted in the collateral value.
        require(_depositAmount > 0, Error.ZERO_DEPOSIT);

        // If the account does not have an existing deposit for this collateral asset,
        // push it to the list of the account's deposited collateral assets.
        uint256 existingCollateralAmount = self.getCollateralDeposits(_account, _collateralAsset);

        if (existingCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].push(_collateralAsset);
        }

        uint256 newCollateralAmount = existingCollateralAmount + _depositAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (self.collateralAssets[_collateralAsset].anchor != address(0)) {
            require(
                newCollateralAmount >= Constants.MIN_KRASSET_COLLATERAL_AMOUNT || newCollateralAmount == 0,
                Error.COLLATERAL_AMOUNT_TOO_LOW
            );
        }

        // Record the deposit.
        unchecked {
            self.collateralDeposits[_account][_collateralAsset] = self
                .collateralAssets[_collateralAsset]
                .toNonRebasingAmount(newCollateralAmount);
        }

        emit MinterEvent.CollateralDeposited(_account, _collateralAsset, _depositAmount);
    }

    /**
     * @notice records the collateral withdrawal
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _collateralDeposits Collateral deposits for the account.
     * @param _depositedCollateralAssetIndex Index of the collateral asset in the account's deposited collateral assets array.
     */
    function recordCollateralWithdrawal(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _depositedCollateralAssetIndex
    ) internal {
        require(_withdrawAmount > 0, Error.ZERO_WITHDRAW);
        require(
            _depositedCollateralAssetIndex <= self.depositedCollateralAssets[_account].length - 1,
            Error.ARRAY_OUT_OF_BOUNDS
        );
        // ensure that the handler does not attempt to withdraw more collateral than the account has
        require(_collateralDeposits >= _withdrawAmount, Error.COLLATERAL_INSUFFICIENT_AMOUNT);

        uint256 newCollateralAmount = _collateralDeposits - _withdrawAmount;

        // If the collateral asset is also a kresko asset, ensure that the deposit amount is above the minimum.
        // This is done because kresko assets can be rebased.
        if (self.collateralAssets[_collateralAsset].anchor != address(0)) {
            require(
                newCollateralAmount >= Constants.MIN_KRASSET_COLLATERAL_AMOUNT || newCollateralAmount == 0,
                Error.COLLATERAL_AMOUNT_TOO_LOW
            );
        }

        // If the user is withdrawing all of the collateral asset, remove the collateral asset
        // from the user's deposited collateral assets array.
        if (newCollateralAmount == 0) {
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _depositedCollateralAssetIndex);
        }

        // Record the withdrawal.
        self.collateralDeposits[_account][_collateralAsset] = self
            .collateralAssets[_collateralAsset]
            .toNonRebasingAmount(newCollateralAmount);

        emit MinterEvent.UncheckedCollateralWithdrawn(_account, _collateralAsset, _withdrawAmount);
    }

    /**
     * @notice verifies that the account collateral
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     */
    function verifyAccountCollateral(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount
    ) internal view {
        // Ensure the withdrawal does not result in the account having a collateral value
        // under the minimum collateral amount required to maintain a healthy position.
        // I.e. the new account's collateral value must still exceed the account's minimum
        // collateral value.
        // Get the account's current collateral value.
        uint256 accountCollateralValue = self.getAccountCollateralValue(_account);
        // Get the collateral value that the account will lose as a result of this withdrawal.
        (uint256 withdrawnCollateralValue, ) = self.getCollateralValueAndOraclePrice(
            _collateralAsset,
            _withdrawAmount,
            false // Take the collateral factor into consideration.
        );
        // Get the account's minimum collateral value.
        uint256 accountMinCollateralValue = self.getAccountMinimumCollateralValueAtRatio(
            _account,
            self.minimumCollateralizationRatio
        );
        // Require accountMinCollateralValue <= accountCollateralValue - withdrawnCollateralValue.
        require(
            accountMinCollateralValue <= accountCollateralValue - withdrawnCollateralValue,
            Error.COLLATERAL_INSUFFICIENT_AMOUNT
        );
    }
}

/**
 * @title Calculation library for liquidation & fee values
 * @author Kresko
 */
library LibCalculation {
    struct MaxLiquidationVars {
        CollateralAsset collateral;
        uint256 accountCollateralValue;
        uint256 minCollateralValue;
        uint256 seizeCollateralAccountValue;
        uint256 maxLiquidationMultiplier;
        uint256 minimumDebtValue;
        uint256 liquidationThreshold;
        uint256 debtFactor;
    }

    using Arrays for address[];
    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;

    /**
     * @dev Calculates the total value that can be liquidated for a liquidation pair
     * @param _account address to liquidate
     * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
     * @param _seizedCollateral The collateral asset being seized in the liquidation
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function getMaxLiquidation(
        MinterState storage self,
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (uint256 maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationParams(self, _account, _repayKreskoAsset, _seizedCollateral);
        // Account is not liquidatable
        if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
            return 0;
        }

        maxLiquidatableUSD = _getMaxLiquidatableUSD(vars, _repayKreskoAsset);

        if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD < vars.minimumDebtValue) {
            return vars.minimumDebtValue;
        } else {
            return maxLiquidatableUSD;
        }
    }

    function getMaxLiquidationShared(
        MinterState storage self,
        PoolKrAsset memory _repayAssetConfig,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) internal view returns (uint256 maxLiquidatableUSD) {
        MaxLiquidationVars memory vars = _getMaxLiquidationParamsShared(self, _repayKreskoAsset, _seizedCollateral);
        // Account is not liquidatable
        if (vars.accountCollateralValue >= (vars.minCollateralValue)) {
            return 0;
        }

        maxLiquidatableUSD = _getMaxLiquidatableUSDShared(vars, _repayAssetConfig);

        if (vars.seizeCollateralAccountValue < maxLiquidatableUSD) {
            return vars.seizeCollateralAccountValue;
        } else if (maxLiquidatableUSD < vars.minimumDebtValue) {
            return vars.minimumDebtValue;
        } else {
            return maxLiquidatableUSD;
        }
    }

    /**
     * @notice Calculate amount of collateral to seize during the liquidation procesself.
     * @param _liquidationIncentiveMultiplier The liquidation incentive multiplier.
     * @param _collateralOraclePriceUSD The address of the collateral asset to be seized.
     * @param _kreskoAssetRepayAmountUSD Kresko asset amount being repaid in exchange for the seized collateral.
     */
    function calculateAmountToSeize(
        uint256 _liquidationIncentiveMultiplier,
        uint256 _collateralOraclePriceUSD,
        uint256 _kreskoAssetRepayAmountUSD
    ) internal pure returns (uint256) {
        // Seize amount = (repay amount USD * liquidation incentive / collateral price USD).
        // Denominate seize amount in collateral type
        // Apply liquidation incentive multiplier
        return _kreskoAssetRepayAmountUSD.wadMul(_liquidationIncentiveMultiplier).wadDiv(_collateralOraclePriceUSD);
    }

    /**
     * @notice Calculates the fee to be taken from a user's deposited collateral asset.
     * @param _collateralAsset The collateral asset from which to take to the fee.
     * @param _account The owner of the collateral.
     * @param _feeValue The original value of the fee.
     * @param _collateralAssetIndex The collateral asset's index in the user's depositedCollateralAssets array.
     *
     * @return transferAmount to be received as a uint256
     * @return feeValuePaid wad representing the fee value paid.
     */
    function calcFee(
        MinterState storage self,
        address _collateralAsset,
        address _account,
        uint256 _feeValue,
        uint256 _collateralAssetIndex
    ) internal returns (uint256 transferAmount, uint256 feeValuePaid) {
        uint256 depositAmount = self.getCollateralDeposits(_account, _collateralAsset);

        // Don't take the collateral asset's collateral factor into consideration.
        (uint256 depositValue, uint256 oraclePrice) = self.getCollateralValueAndOraclePrice(
            _collateralAsset,
            depositAmount,
            true
        );

        if (_feeValue < depositValue) {
            // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
            transferAmount = self.collateralAssets[_collateralAsset].decimals.fromWad(_feeValue.wadDiv(oraclePrice));
            feeValuePaid = _feeValue;
        } else {
            // If the feeValue >= depositValue, the entire deposit should be taken as the fee.
            transferAmount = depositAmount;
            feeValuePaid = depositValue;
        }

        if (transferAmount == depositAmount) {
            // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralAssetIndex);
        }

        return (transferAmount, feeValuePaid);
    }

    /**
     * @notice Calculates the maximum USD value of a given kreskoAsset that can be liquidated given a liquidation pair
     *
     * 1. Calculates the value gained per USD repaid in liquidation for a given kreskoAsset
     *
     * debtFactor = debtFactor = k * LT / cFactor;
     *
     * valPerUSD = (DebtFactor - Asset closeFee - liquidationIncentive) / DebtFactor
     *
     * 2. Calculates the maximum amount of USD value that can be liquidated given the account's collateral value
     *
     * maxLiquidatableUSD = (MCV - ACV) / valPerUSD / debtFactor / cFactor * LOM
     *
     * @dev This function is used by getMaxLiquidation and is factored out for readability
     * @param vars liquidation variables struct
     * @param _repayKreskoAsset The kreskoAsset being repaid in the liquidation
     */
    function _getMaxLiquidatableUSD(
        MaxLiquidationVars memory vars,
        KrAsset memory _repayKreskoAsset
    ) private pure returns (uint256) {
        uint256 valuePerUSDRepaid = (vars.debtFactor -
            vars.collateral.liquidationIncentive -
            _repayKreskoAsset.closeFee).wadDiv(vars.debtFactor);
        return
            (vars.minCollateralValue - vars.accountCollateralValue)
                .wadMul(vars.maxLiquidationMultiplier)
                .wadDiv(valuePerUSDRepaid)
                .wadDiv(vars.debtFactor)
                .wadDiv(vars.collateral.factor);
    }

    function _getMaxLiquidatableUSDShared(
        MaxLiquidationVars memory vars,
        PoolKrAsset memory _repayKreskoAsset
    ) private pure returns (uint256) {
        uint256 valuePerUSDRepaid = (vars.debtFactor - _repayKreskoAsset.liquidationIncentive).wadDiv(vars.debtFactor);
        return
            (vars.minCollateralValue - vars.accountCollateralValue)
                .wadMul(vars.maxLiquidationMultiplier)
                .wadDiv(valuePerUSDRepaid)
                .wadDiv(vars.debtFactor)
                .wadDiv(vars.collateral.factor);
    }

    function _getMaxLiquidationParams(
        MinterState storage state,
        address _account,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) private view returns (MaxLiquidationVars memory) {
        uint256 liquidationThreshold = state.liquidationThreshold;
        uint256 minCollateralValue = state.getAccountMinimumCollateralValueAtRatio(_account, liquidationThreshold);

        (uint256 accountCollateralValue, uint256 seizeCollateralAccountValue) = state.getAccountCollateralValue(
            _account,
            _seizedCollateral
        );

        CollateralAsset memory collateral = state.collateralAssets[_seizedCollateral];

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: accountCollateralValue,
                debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
                minCollateralValue: minCollateralValue,
                minimumDebtValue: state.minimumDebtValue,
                seizeCollateralAccountValue: seizeCollateralAccountValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: state.maxLiquidationMultiplier
            });
    }

    function _getMaxLiquidationParamsShared(
        MinterState storage state,
        KrAsset memory _repayKreskoAsset,
        address _seizedCollateral
    ) private view returns (MaxLiquidationVars memory) {
        uint256 liquidationThreshold = scdp().liquidationThreshold;
        uint256 minCollateralValue = sdi().effectiveDebtUSD().wadMul(liquidationThreshold);

        (uint256 totalCollateralValue, uint256 seizeCollateralValue) = scdp().getTotalPoolDepositValue(
            _seizedCollateral,
            scdp().totalDeposits[_seizedCollateral],
            false
        );

        CollateralAsset memory collateral = state.collateralAssets[_seizedCollateral];

        return
            MaxLiquidationVars({
                collateral: collateral,
                accountCollateralValue: totalCollateralValue,
                debtFactor: _repayKreskoAsset.kFactor.wadMul(liquidationThreshold).wadDiv(collateral.factor),
                minCollateralValue: minCollateralValue,
                minimumDebtValue: state.minimumDebtValue,
                seizeCollateralAccountValue: seizeCollateralValue,
                liquidationThreshold: liquidationThreshold,
                maxLiquidationMultiplier: state.maxLiquidationMultiplier
            });
    }
}

/**
 * @title Library for Kresko specific decimals
 */
library LibDecimals {
    /**
     * @notice For a given collateral asset and amount, returns a wad represenatation.
     * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
     *   If decimals > 18, there may be a loss of precision.
     * @param _decimals The collateral asset's number of decimals
     * @param _amount The amount of the collateral asset.
     * @return A fp of amount scaled according to the collateral asset's decimals.
     */
    function toWad(uint256 _decimals, uint256 _amount) internal pure returns (uint256) {
        // Initially, use the amount as the raw value for the fixed point.
        // which internally uses 18 decimals.
        // Most collateral assets will have 18 decimals.

        // Handle cases where the collateral asset's decimal amount is not 18.
        if (_decimals < 18) {
            // If the decimals are less than 18, multiply the amount
            // to get the correct wad value.
            // E.g. 1 full token of a 17 decimal token will  cause the
            // initial setting of amount to be 0.1, so we multiply
            // by 10 ** (18 - 17) = 10 to get it to 0.1 * 10 = 1.
            return _amount * (10 ** (18 - _decimals));
        } else if (_decimals > 18) {
            // If the decimals are greater than 18, divide the amount
            // to get the correct fixed point value.
            // Note because wad numbers are 18 decimals, this results
            // in loss of precision. E.g. if the collateral asset has 19
            // decimals and the deposit amount is only 1 uint, this will divide
            // 1 by 10 ** (19 - 18), resulting in 1 / 10 = 0
            return _amount / (10 ** (_decimals - 18));
        }
        return _amount;
    }

    /**
     * @notice For a given collateral asset and wad amount, returns the collateral amount.
     * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
     *   If decimals < 18, there may be a loss of precision.
     * @param _decimals The collateral asset's number of decimals
     * @param _wadAmount The wad amount of the collateral asset.
     * @return An amount that is compatible with the collateral asset's decimals.
     */
    function fromWad(uint256 _decimals, uint256 _wadAmount) internal pure returns (uint256) {
        // Initially, use the rawValue, which internally uses 18 decimals.
        // Most collateral assets will have 18 decimals.
        // Handle cases where the collateral asset's decimal amount is not 18.
        if (_decimals < 18) {
            // If the decimals are less than 18, divide the depositAmount
            // to get the correct collateral amount.
            // E.g. 1 full token will result in amount being 1e18 at this point,
            // so if the token has 17 decimals, divide by 10 ** (18 - 17) = 10
            // to get a value of 1e17.
            // This may result in a loss of precision.
            return _wadAmount / (10 ** (18 - _decimals));
        } else if (_decimals > 18) {
            // If the decimals are greater than 18, multiply the depositAmount
            // to get the correct fixed point value.
            // E.g. 1 full token will result in amount being 1e18 at this point,
            // so if the token has 19 decimals, multiply by 10 ** (19 - 18) = 10
            // to get a value of 1e19.
            return _wadAmount * (10 ** (_decimals - 18));
        }
        return _wadAmount;
    }

    /**
     * @notice Divides an uint256 @param _value with @param _priceWithOracleDecimals
     * @param _value Left side value of the division
     * @param wadValue result with 18 decimals
     */
    function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals) internal view returns (uint256 wadValue) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals >= 18) return _priceWithOracleDecimals;
        return (_value * 10 ** oracleDecimals) / _priceWithOracleDecimals;
    }

    /**
     * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
     * @param _wadPrice value with extOracleDecimals
     */
    function fromWadPriceToUint(uint256 _wadPrice) internal view returns (uint256 priceWithOracleDecimals) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) return _wadPrice;
        return _wadPrice / 10 ** (18 - oracleDecimals);
    }

    /**
     * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
     * @param _priceWithOracleDecimals value with extOracleDecimals
     * @return wadPrice with 18 decimals
     */
    function oraclePriceToWad(uint256 _priceWithOracleDecimals) internal view returns (uint256) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) {
            return _priceWithOracleDecimals;
        }
        return _priceWithOracleDecimals * 10 ** (18 - oracleDecimals);
    }

    /**
     * @notice Converts an int256 with extOracleDecimals into a number with 18 decimals
     * @param _priceWithOracleDecimals value with extOracleDecimals
     * @return wadPrice price with 18 decimals
     */
    function oraclePriceToWad(int256 _priceWithOracleDecimals) internal view returns (uint256) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals >= 18) return uint256(_priceWithOracleDecimals);
        return uint256(_priceWithOracleDecimals) * 10 ** (18 - oracleDecimals);
    }
}

library LibKrAsset {
    using WadRay for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                  Functions                                 */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Get the state of a specific krAsset
     * @param _asset Address of the asset.
     * @return State of assets `KrAsset` struct
     */
    function kreskoAsset(MinterState storage self, address _asset) internal view returns (KrAsset memory) {
        return self.kreskoAssets[_asset];
    }

    /**
     * @notice Get possibly rebased amount of kreskoAssets. Use when saving to storage.
     * @param _asset The asset address
     * @param _amount The account to query amount for
     * @return amount Amount of principal debt for `_asset`
     */
    function getKreskoAssetAmount(
        MinterState storage self,
        address _asset,
        uint256 _amount
    ) internal view returns (uint256 amount) {
        return self.kreskoAssets[_asset].toRebasingAmount(_amount);
    }

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getKrAssetValue(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) internal view returns (uint256) {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        uint256 value = krAsset.uintUSD(_amount, self.oracleDeviationPct);

        if (!_ignoreKFactor) {
            value = value.wadMul(krAsset.kFactor);
        }

        return value;
    }

    /**
     * @notice Get the minimum collateral value required to
     * back a Kresko asset amount at a given collateralization ratio.
     * @param _krAsset The address of the Kresko asset.
     * @param _amount The Kresko Asset debt amount.
     * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
     * @param _ratio The collateralization ratio required: higher ratio = more collateral required.
     */
    function getMinimumCollateralValueAtRatio(
        MinterState storage self,
        address _krAsset,
        uint256 _amount,
        uint256 _ratio
    ) internal view returns (uint256 minCollateralValue) {
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return self.getKrAssetValue(_krAsset, _amount, false).wadMul(_ratio);
    }
}

library LibMint {
    using Arrays for address[];

    using LibDecimals for uint8;
    using LibDecimals for uint256;
    using WadRay for uint256;

    using SafeERC20 for IERC20Permit;
    using LibCalculation for MinterState;

    /// @notice Mint kresko assets.
    /// @dev Updates the principal in MinterState
    /// @param _kreskoAsset the asset being issued
    /// @param _anchor the anchor token of the asset being issued
    /// @param _amount the asset amount being minted
    /// @param _account the account to mint the assets to
    function mint(
        MinterState storage self,
        address _kreskoAsset,
        address _anchor,
        uint256 _amount,
        address _account
    ) internal {
        // Get possibly rebalanced amount of kresko asset
        uint256 issued = IKreskoAssetIssuer(_anchor).issue(_amount, _account);
        // Increase principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] += issued;
    }

    /// @notice Mint kresko assets for shared debt pool.
    /// @dev Updates general markets stability rates and debt index.
    /// @param _kreskoAsset the asset requested
    /// @param _amount the asset amount requested
    /// @param _to the account to mint the assets to
    function mintSwap(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _amount,
        address _to
    ) internal returns (uint256 issued) {
        issued = IKreskoAssetIssuer(self.kreskoAssets[_kreskoAsset].anchor).issue(_amount, _to);
        require(issued != 0, "invalid-shared-pool-mint");

        sdi().totalDebt += sdi().previewMint(_kreskoAsset, issued, false);
    }

    /**
     * @notice Charges the protocol open fee based off the value of the minted asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the open fee from.
     * @param _kreskoAsset The address of the kresko asset being minted.
     * @param _kreskoAssetAmountMinted The amount of the kresko asset being minted.
     */
    function chargeOpenFee(
        MinterState storage self,
        address _account,
        address _kreskoAsset,
        uint256 _kreskoAssetAmountMinted
    ) internal {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        // Calculate the value of the fee according to the value of the krAssets being minted.
        uint256 feeValue = krAsset.uintUSD(_kreskoAssetAmountMinted, self.oracleDeviationPct).wadMul(krAsset.openFee);

        // Do nothing if the fee value is 0.
        if (feeValue == 0) {
            return;
        }

        address[] memory accountCollateralAssets = self.depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.
        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];

            (uint256 transferAmount, uint256 feeValuePaid) = self.calcFee(
                collateralAssetAddress,
                _account,
                feeValue,
                i
            );

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][collateralAssetAddress] -= self
                .collateralAssets[collateralAssetAddress]
                .toNonRebasingAmount(transferAmount);

            // Transfer the fee to the feeRecipient.
            IERC20Permit(collateralAssetAddress).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.OpenFeePaid(_account, collateralAssetAddress, transferAmount, feeValuePaid);

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return;
            }
        }
    }
}

abstract contract MinterModifiers {
    /**
     * @notice Reverts if a collateral asset does not exist within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetExists(address _collateralAsset) {
        require(ms().collateralAssets[_collateralAsset].exists, Error.COLLATERAL_DOESNT_EXIST);
        _;
    }

    /**
     * @notice Reverts if a collateral asset already exists within the protocol.
     * @param _collateralAsset The address of the collateral asset.
     */
    modifier collateralAssetDoesNotExist(address _collateralAsset) {
        require(!ms().collateralAssets[_collateralAsset].exists, Error.COLLATERAL_EXISTS);
        _;
    }

    /**
     * @notice Reverts if a Kresko asset does not exist within the protocol. Does not revert if
     * the Kresko asset is not mintable.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetExists(address _kreskoAsset) {
        require(ms().kreskoAssets[_kreskoAsset].exists, Error.KRASSET_DOESNT_EXIST);
        _;
    }

    /**
     * @notice Reverts if the symbol of a Kresko asset already exists within the protocol.
     * @param _kreskoAsset The address of the Kresko asset.
     */
    modifier kreskoAssetDoesNotExist(address _kreskoAsset) {
        require(!ms().kreskoAssets[_kreskoAsset].exists, Error.KRASSET_EXISTS);
        _;
    }

    /// @dev Simple check for the enabled flag
    function ensureNotPaused(address _asset, Action _action) internal view virtual {
        require(!ms().safetyState[_asset][_action].pause.enabled, Error.ACTION_PAUSED_FOR_ASSET);
    }
}
