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
import {fromWad} from "common/funcs/Conversions.sol";
import {krAssetAmountToValue, collateralAmountToValue, collateralAmountRead} from "./Conversions.sol";
import {CollateralAsset, KrAsset} from "common/libs/Assets.sol";
import {Constants} from "minter/Constants.sol";

using LibMinter for MinterState global;

// Storage position
bytes32 constant MINTER_STORAGE_POSITION = keccak256("kresko.minter.storage");

function ms() pure returns (MinterState storage state) {
    bytes32 position = MINTER_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

/**
 * @title Storage layout for the minter state
 * @author Kresko
 */
struct MinterState {
    /* -------------------------------------------------------------------------- */
    /*                           Configurable Parameters                          */
    /* -------------------------------------------------------------------------- */

    /// @notice The recipient of protocol fees.
    address feeRecipient;
    /// @notice The minimum ratio of collateral to debt that can be taken by direct action.
    uint256 minCollateralRatio;
    /// @notice The minimum USD value of an individual synthetic asset debt position.
    uint256 minDebtValue;
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
    uint256 minCollateralRatio;
    uint256 minDebtValue;
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
    uint256 minCollateralRatio;
    uint256 minDebtValue;
    uint256 liquidationThreshold;
    uint256 maxLiquidationMultiplier;
    address feeRecipient;
    uint8 extOracleDecimals;
    uint256 oracleDeviationPct;
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

library LibMinter {
    using WadRay for uint256;
    using Arrays for address[];
    using SafeERC20 for IERC20Permit;

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param _account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */

    function accountDebtAssets(MinterState storage self, address _account) internal view returns (address[] memory) {
        return self.mintedKreskoAssets[_account];
    }

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param _account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function accountCollateralAssets(
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
    function accountCollateralAmount(
        MinterState storage self,
        address _account,
        address _asset
    ) internal view returns (uint256) {
        return collateralAmountRead(_asset, self.collateralDeposits[_account][_asset]);
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param _account The account to calculate the collateral value for.
     * @return totalCollateralValue The collateral value of a particular account.
     */
    function accountCollateralValue(
        MinterState storage self,
        address _account
    ) internal view returns (uint256 totalCollateralValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];

            (uint256 collateralValue, ) = collateralAmountToValue(
                asset,
                self.accountCollateralAmount(_account, asset),
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
     * @return specificValue The collateral value of a particular account.
     */
    function accountCollateralAssetValue(
        MinterState storage self,
        address _account,
        address _collateralAsset
    ) internal view returns (uint256 totalCollateralValue, uint256 specificValue) {
        address[] memory assets = self.depositedCollateralAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 collateralValue, ) = collateralAmountToValue(
                asset,
                self.accountCollateralAmount(_account, asset),
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
    function accountMinCollateralAtRatio(
        MinterState storage self,
        address _account,
        uint256 _ratio
    ) internal view returns (uint256) {
        return self.accountDebtValue(_account).wadMul(_ratio);
    }

    /**
     * @notice Gets the total debt value in USD for an account.
     * @param _account The account to calculate the KreskoAsset value for.
     * @return value The KreskoAsset debt value of the account.
     */
    function accountDebtValue(MinterState storage self, address _account) internal view returns (uint256 value) {
        address[] memory assets = self.mintedKreskoAssets[_account];
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += krAssetAmountToValue(asset, self.accountDebtAmount(_account, asset), false);
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
    function accountDebtAmount(
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
    function accountMintIndex(
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
    function accountDepositIndex(
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

    /* -------------------------------------------------------------------------- */
    /*                            Kresko Assets Actions                           */
    /* -------------------------------------------------------------------------- */

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
        // Increase principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] += IKreskoAssetIssuer(_anchor).issue(_amount, _account);
    }

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
        // Decrease the principal debt
        self.kreskoAssetDebt[_account][_kreskoAsset] -= IKreskoAssetIssuer(_anchor).destroy(_burnAmount, msg.sender);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Collateral Actions                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Verifies that the account has sufficient collateral for the requested amount and records the collateral
     * @param _account The address of the account to verify the collateral for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _collateralDeposits Collateral deposits for the account.
     * @param _collateralIndex Index of the collateral asset in the account's deposited collateral assets array.
     */
    function handleWithdrawal(
        MinterState storage self,
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount,
        uint256 _collateralDeposits,
        uint256 _collateralIndex
    ) internal {
        require(_withdrawAmount > 0, Error.ZERO_WITHDRAW);
        require(_collateralIndex <= self.depositedCollateralAssets[_account].length - 1, Error.ARRAY_OUT_OF_BOUNDS);

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
            self.depositedCollateralAssets[_account].removeAddress(_collateralAsset, _collateralIndex);
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
    function handleDeposit(
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
        uint256 existingCollateralAmount = self.accountCollateralAmount(_account, _collateralAsset);

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
    function recordWithdrawal(
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

    /* -------------------------------------------------------------------------- */
    /*                              Collateral Views                              */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Get the state of a specific collateral asset
     * @param _asset Address of the asset.
     * @return State of assets `CollateralAsset` struct
     */
    function collateralAsset(MinterState storage self, address _asset) internal view returns (CollateralAsset memory) {
        return self.collateralAssets[_asset];
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
        uint256 collateralValue = self.accountCollateralValue(_account);
        // Get the collateral value that the account will lose as a result of this withdrawal.
        (uint256 withdrawnCollateralValue, ) = collateralAmountToValue(
            _collateralAsset,
            _withdrawAmount,
            false // Take the collateral factor into consideration.
        );
        // Get the account's minimum collateral value.
        uint256 minCollateralValue = self.accountMinCollateralAtRatio(_account, self.minCollateralRatio);
        // Require accountMinCollateralValue <= accountCollateralValue - withdrawnCollateralValue.
        require(minCollateralValue <= collateralValue - withdrawnCollateralValue, Error.COLLATERAL_INSUFFICIENT_AMOUNT);
    }

    /**
     * @notice Check that debt repaid does not leave a dust position, if it does:
     * return an amount that pays up to minDebtValue
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _burnAmount The amount being burned
     * @param _debtAmount The debt amount of `_account`
     * @return amount == 0 or >= minDebtAmount
     */
    function handleDustPosition(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _burnAmount,
        uint256 _debtAmount
    ) internal view returns (uint256 amount) {
        // If the requested burn would put the user's debt position below the minimum
        // debt value, close up to the minimum debt value instead.
        uint256 krAssetValue = krAssetAmountToValue(_kreskoAsset, _debtAmount - _burnAmount, true);
        if (krAssetValue > 0 && krAssetValue < self.minDebtValue) {
            uint256 minDebtValue = self.minDebtValue.wadDiv(
                self.kreskoAssets[_kreskoAsset].uintPrice(self.oracleDeviationPct)
            );
            amount = _debtAmount - minDebtValue;
        } else {
            amount = _burnAmount;
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                             Kresko Asset Views                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Get the state of a specific krAsset
     * @param _asset Address of the asset.
     * @return State of assets `KrAsset` struct
     */
    function kreskoAsset(MinterState storage self, address _asset) internal view returns (KrAsset memory) {
        return self.kreskoAssets[_asset];
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Fees                                    */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Charges the protocol open fee based off the value of the minted asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the open fee from.
     * @param _kreskoAsset The address of the kresko asset being minted.
     * @param _kreskoAssetAmountMinted The amount of the kresko asset being minted.
     */
    function handleOpenFee(
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

        address[] memory accountCollaterals = self.depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.
        for (uint256 i = accountCollaterals.length - 1; i >= 0; i--) {
            address currentCollateral = accountCollaterals[i];

            (uint256 transferAmount, uint256 feeValuePaid) = self.calcFee(currentCollateral, _account, feeValue, i);

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][currentCollateral] -= self
                .collateralAssets[currentCollateral]
                .toNonRebasingAmount(transferAmount);

            // Transfer the fee to the feeRecipient.
            IERC20Permit(currentCollateral).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.OpenFeePaid(_account, currentCollateral, transferAmount, feeValuePaid);

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return;
            }
        }
    }

    /**
     * @notice Charges the protocol close fee based off the value of the burned asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param _account The account to charge the close fee from.
     * @param _kreskoAsset The address of the kresko asset being burned.
     * @param _burnAmount The amount of the kresko asset being burned.
     */
    function handleCloseFee(
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

        address[] memory accountCollaterals = self.depositedCollateralAssets[_account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.

        for (uint256 i = accountCollaterals.length - 1; i >= 0; i--) {
            address currentCollateral = accountCollaterals[i];

            (uint256 transferAmount, uint256 feeValuePaid) = self.calcFee(currentCollateral, _account, feeValue, i);

            // Remove the transferAmount from the stored deposit for the account.
            self.collateralDeposits[_account][currentCollateral] -= self
                .collateralAssets[currentCollateral]
                .toNonRebasingAmount(transferAmount);

            // Transfer the fee to the feeRecipient.
            IERC20Permit(currentCollateral).safeTransfer(self.feeRecipient, transferAmount);
            emit MinterEvent.CloseFeePaid(_account, currentCollateral, transferAmount, feeValuePaid);

            feeValue = feeValue - feeValuePaid;
            // If the entire fee has been paid, no more action needed.
            if (feeValue == 0) {
                return;
            }
        }
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
        uint256 depositAmount = self.accountCollateralAmount(_account, _collateralAsset);

        // Don't take the collateral asset's collateral factor into consideration.
        (uint256 depositValue, uint256 oraclePrice) = collateralAmountToValue(_collateralAsset, depositAmount, true);

        if (_feeValue < depositValue) {
            // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
            transferAmount = fromWad(self.collateralAssets[_collateralAsset].decimals, _feeValue.wadDiv(oraclePrice));
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
}
