// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;

import {IDepositWithdrawFacet} from "../interfaces/IDepositWithdrawFacet.sol";

import {Error} from "../../libs/Errors.sol";
import {MinterEvent} from "../../libs/Events.sol";
import {Role} from "../../libs/Authorization.sol";
import {Arrays} from "../../libs/Arrays.sol";
import {SafeERC20, IERC20Permit} from "../../shared/SafeERC20.sol";
import {MinterModifiers} from "../MinterModifiers.sol";
import {DiamondModifiers} from "../../diamond/DiamondModifiers.sol";
import {Action, KrAsset} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";
import {ICollateralReceiver} from "../interfaces/ICollateralReceiver.sol";
import {LibPrice} from "../libs/LibPrice.sol";
import {IKreskoAsset} from "../../kreskoasset/IKreskoAsset.sol";

/**
 * @author Kresko
 * @title DepositWithdrawFacet
 * @notice Main end-user functionality concerning collateral asset deposits and withdrawals within the Kresko protocol
 */
contract OracleTestFacet is DiamondModifiers, MinterModifiers {
    using SafeERC20 for IERC20Permit;
    using Arrays for address[];

    function getMePrices(address asset) external view returns (uint256, uint256) {
        return (LibPrice.getPrice(bytes32("ETH")), ms().collateralAssets[asset].uintPrice());
    }

    function getMePricesOne(
        address collateral,
        address kreskoAsset
    ) external view returns (uint256, uint256, uint256, uint256) {
        return (
            ms().collateralAssets[collateral].uintPrice(),
            LibPrice.getPrice(ms().collateralAssets[collateral].redstone),
            ms().kreskoAssets[kreskoAsset].uintPrice(),
            LibPrice.getPrice(ms().kreskoAssets[kreskoAsset].redstone)
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Collateral                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Withdraws sender's collateral from the protocol.
     * @dev Requires that the post-withdrawal collateral value does not violate minimum collateral requirement.
     * @param _account The address to withdraw assets for.
     * @param _collateralAsset The address of the collateral asset.
     * @param _withdrawAmount The amount of the collateral asset to withdraw.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the sender's deposited collateral
     * assets array. Only needed if withdrawing the entire deposit of a particular collateral asset.
     */
    function withdrawCollateralRedstone(
        address _account,
        address _collateralAsset,
        uint256 _withdrawAmount,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant collateralAssetExists(_collateralAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        if (ms().safetyStateSet) {
            ensureNotPaused(_collateralAsset, Action.Withdraw);
        }

        uint256 collateralDeposits = ms().getCollateralDeposits(_account, _collateralAsset);
        _withdrawAmount = (_withdrawAmount > collateralDeposits ? collateralDeposits : _withdrawAmount);

        ms().verifyAndRecordCollateralWithdrawalRedstone(
            _account,
            _collateralAsset,
            _withdrawAmount,
            collateralDeposits,
            _depositedCollateralAssetIndex
        );

        IERC20Permit(_collateralAsset).safeTransfer(_account, _withdrawAmount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  KrAssets                                  */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Mints new Kresko assets.
     * @param _account The address to mint assets for.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _mintAmount The amount of the Kresko asset to be minted.
     */
    function mintKreskoAssetRedstone(
        address _account,
        address _kreskoAsset,
        uint256 _mintAmount
    ) external nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        require(_mintAmount > 0, Error.ZERO_MINT);

        MinterState storage s = ms();
        if (s.safetyStateSet) {
            super.ensureNotPaused(_kreskoAsset, Action.Borrow);
        }

        // Enforce krAsset's total supply limit
        KrAsset memory krAsset = s.kreskoAssets[_kreskoAsset];
        require(krAsset.marketStatusOracle.latestMarketOpen(), Error.KRASSET_MARKET_CLOSED);

        require(
            IKreskoAsset(_kreskoAsset).totalSupply() + _mintAmount <= krAsset.supplyLimit,
            Error.KRASSET_MAX_SUPPLY_REACHED
        );

        if (krAsset.openFee > 0) {
            s.chargeOpenFee(_account, _kreskoAsset, _mintAmount);
        }
        {
            // Get the account's current minimum collateral value required to maintain current debts.
            // Calculate additional collateral amount required to back requested additional mint.
            // Verify that minter has sufficient collateral to back current debt + new requested debt.
            require(
                s.getAccountMinimumCollateralValueAtRatioRedstone(_account, s.minimumCollateralizationRatio) +
                    s.getMinimumCollateralValueAtRatioRedstone(
                        _kreskoAsset,
                        _mintAmount,
                        s.minimumCollateralizationRatio
                    ) <=
                    s.getAccountCollateralValueRedstone(_account),
                Error.KRASSET_COLLATERAL_LOW
            );
        }

        // The synthetic asset debt position must be greater than the minimum debt position value
        uint256 existingDebt = s.getKreskoAssetDebtScaled(_account, _kreskoAsset);
        require(krAsset.uintUSD(existingDebt + _mintAmount) >= s.minimumDebtValue, Error.KRASSET_MINT_AMOUNT_LOW);

        // If the account does not have an existing debt for this Kresko Asset,
        // push it to the list of the account's minted Kresko Assets.
        if (existingDebt == 0) {
            s.mintedKreskoAssets[_account].push(_kreskoAsset);
        }

        // Record the mint.
        s.mint(_kreskoAsset, krAsset.anchor, _mintAmount, _account);

        // Emit logs
        emit MinterEvent.KreskoAssetMinted(_account, _kreskoAsset, _mintAmount);
    }

    function burnKreskoAssetRedstone(
        address _account,
        address _kreskoAsset,
        uint256 _burnAmount,
        uint256 _mintedKreskoAssetIndex
    ) external nonReentrant kreskoAssetExists(_kreskoAsset) onlyRoleIf(_account != msg.sender, Role.MANAGER) {
        require(_burnAmount > 0, Error.ZERO_BURN);
        MinterState storage s = ms();

        if (s.safetyStateSet) {
            ensureNotPaused(_kreskoAsset, Action.Repay);
        }

        // Get accounts principal debt
        uint256 debtAmount = s.getKreskoAssetDebtPrincipal(_account, _kreskoAsset);

        if (_burnAmount != type(uint256).max) {
            require(_burnAmount <= debtAmount, Error.KRASSET_BURN_AMOUNT_OVERFLOW);
            // Ensure principal left is either 0 or >= minDebtValue
            _burnAmount = s.ensureNotDustPosition(_kreskoAsset, _burnAmount, debtAmount);
        } else {
            // _burnAmount of uint256 max, burn all principal debt
            _burnAmount = debtAmount;
        }

        // If sender repays all principal debt of asset with no stability rate, remove it from minted assets array.
        // For assets with stability rate the revomal is done when repaying interest
        if (irs().srAssets[_kreskoAsset].asset == address(0) && _burnAmount == debtAmount) {
            s.mintedKreskoAssets[_account].removeAddress(_kreskoAsset, _mintedKreskoAssetIndex);
        }
        // Charge the burn fee from collateral of _account
        s.chargeCloseFee(_account, _kreskoAsset, _burnAmount);

        // Record the burn
        s.repay(_kreskoAsset, s.kreskoAssets[_kreskoAsset].anchor, _burnAmount, _account);

        // Emit logs
        emit MinterEvent.KreskoAssetBurned(_account, _kreskoAsset, _burnAmount);
    }
}
