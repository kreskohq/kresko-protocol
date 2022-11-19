// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {ILiquidationFacet} from "../interfaces/ILiquidationFacet.sol";
import {IKreskoAssetIssuer} from "../../kreskoasset/IKreskoAssetIssuer.sol";

import {Arrays} from "../../libs/Arrays.sol";
import {Error} from "../../libs/Errors.sol";
import {LibDecimals, FixedPoint} from "../libs/LibDecimals.sol";
import {LibCalculation} from "../libs/LibCalculation.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {MinterEvent, InterestRateEvent} from "../../libs/Events.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";
import {DiamondModifiers} from "../../shared/Modifiers.sol";

import {Constants, KrAsset} from "../MinterTypes.sol";
import {ms, MinterState} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";

/**
 * @author Kresko
 * @title InterestLiquidationFacet
 * @notice Main end-user functionality concerning liquidations of interest within the Kresko protocol
 */
contract InterestLiquidationFacet is DiamondModifiers {
    using Arrays for address[];
    using LibDecimals for uint8;
    using LibDecimals for FixedPoint.Unsigned;
    using LibDecimals for uint256;
    using WadRay for uint256;
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPoint for uint256;
    using FixedPoint for int256;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    /**
     * @notice Attempts to batch liquidate all interest accrued for an account in a unhealthy position
     * @notice Liquidator must have the KISS balance required and have the contract approved to spend it
     * @notice Checks liquidatable status on each iteration liquidating only what is necessary
     * @param _account The account to attempt to liquidate.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     */
    function batchLiquidateInterest(address _account, address _collateralAssetToSeize) external nonReentrant {
        // Borrower cannot liquidate themselves
        require(msg.sender != _account, Error.SELF_LIQUIDATION);
        // Check that this account is below its minimum collateralization ratio and can be liquidated.
        require(ms().isAccountLiquidatable(_account), Error.NOT_LIQUIDATABLE);
        // Collateral exists
        require(ms().collateralAssets[_collateralAssetToSeize].exists, Error.COLLATERAL_DOESNT_EXIST);

        address[] memory mintedKreskoAssets = ms().getMintedKreskoAssets(_account);

        // Loop all minted assets and add up all interest value
        uint256 kissAmountToRepay;
        for (uint256 i; i < mintedKreskoAssets.length; i++) {
            if (
                !ms().isAccountLiquidatable(
                    _account,
                    kissAmountToRepay.fromWadPriceToFixedPoint().mul(ms().liquidationIncentiveMultiplier)
                )
            ) break;
            address repayKreskoAsset = mintedKreskoAssets[i];
            kissAmountToRepay += ms().repayFullStabilityRateInterest(_account, repayKreskoAsset);
            // If the liquidation repays the user's entire Kresko asset balance, remove it from minted assets array.
            if (ms().kreskoAssetDebt[_account][repayKreskoAsset] == 0) {
                ms().mintedKreskoAssets[_account].removeAddress(repayKreskoAsset, i);
            }
        }

        emit InterestRateEvent.StabilityRateInterestBatchRepaid(_account, kissAmountToRepay);

        // Perform the liquidation
        uint256 collateralAmount = _liquidateInterest(
            _account,
            _collateralAssetToSeize,
            ms().getDepositedCollateralAssetIndex(_account, _collateralAssetToSeize),
            kissAmountToRepay
        );

        emit MinterEvent.BatchInterestLiquidationOccurred(
            _account,
            msg.sender,
            _collateralAssetToSeize,
            kissAmountToRepay,
            collateralAmount
        );
    }

    /**
     * @notice Attempts to liquidate all interest accrued for an account in a unhealthy position
     * @notice Liquidator must have the KISS balance required and have the contract approved to spend it
     * @param _account The account to attempt to liquidate.
     * @param _repayKreskoAsset The address of the Kresko asset to be repaid.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     */
    function liquidateInterest(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) external nonReentrant {
        // Borrower cannot liquidate themselves
        require(msg.sender != _account, Error.SELF_LIQUIDATION);
        // krAsset exists
        require(ms().kreskoAssets[_repayKreskoAsset].exists, Error.KRASSET_DOESNT_EXIST);
        // Check that this account is below its minimum collateralization ratio and can be liquidated.
        require(ms().isAccountLiquidatable(_account), Error.NOT_LIQUIDATABLE);
        // Collateral exists
        require(ms().collateralAssets[_collateralAssetToSeize].exists, Error.COLLATERAL_DOESNT_EXIST);

        uint256 kissAmountToRepay = ms().repayFullStabilityRateInterest(_account, _repayKreskoAsset);
        uint256 mintedKreskoAssetIndex = ms().getMintedKreskoAssetsIndex(_account, _repayKreskoAsset);

        // Perform the liquidation
        uint256 collateralAmount = _liquidateInterest(
            _account,
            _collateralAssetToSeize,
            ms().getDepositedCollateralAssetIndex(_account, _collateralAssetToSeize),
            kissAmountToRepay
        );

        // If the liquidation repays the user's entire Kresko asset balance, remove it from minted assets array.
        if (ms().kreskoAssetDebt[_account][_repayKreskoAsset] == 0) {
            ms().mintedKreskoAssets[_account].removeAddress(_repayKreskoAsset, mintedKreskoAssetIndex);
        }

        emit MinterEvent.InterestLiquidationOccurred(
            _account,
            msg.sender,
            _repayKreskoAsset,
            kissAmountToRepay,
            _collateralAssetToSeize,
            collateralAmount
        );
    }

    /// Internal function to handle the actual collateral liquidation
    function _liquidateInterest(
        address _account,
        address _collateralAssetToSeize,
        uint256 _depositedCollateralAssetIndex,
        uint256 kissAmountToRepay
    ) internal returns (uint256 seizeAmount) {
        MinterState storage s = ms();

        seizeAmount = s.collateralAssets[_collateralAssetToSeize].decimals.fromCollateralFixedPointAmount(
            LibCalculation.calculateAmountToSeize(
                s.liquidationIncentiveMultiplier,
                s.collateralAssets[_collateralAssetToSeize].fixedPointPrice(),
                kissAmountToRepay.fromWadPriceToFixedPoint()
            )
        );

        // Get users collateral deposit amount
        uint256 collateralDeposit = s.getCollateralDeposits(_account, _collateralAssetToSeize);

        if (collateralDeposit > seizeAmount) {
            s.collateralDeposits[_account][_collateralAssetToSeize] -= ms()
                .collateralAssets[_collateralAssetToSeize]
                .toStaticAmount(seizeAmount);
        } else {
            // This clause means user either has collateralDeposits equal or less than the _seizeAmount
            seizeAmount = collateralDeposit;
            // So we set the collateralDeposits to 0
            s.collateralDeposits[_account][_collateralAssetToSeize] = 0;
            // And remove the asset from the deposits array.
            s.depositedCollateralAssets[_account].removeAddress(
                _collateralAssetToSeize,
                _depositedCollateralAssetIndex
            );
        }

        // Send liquidator the seized collateral.
        IERC20Upgradeable(_collateralAssetToSeize).safeTransfer(msg.sender, seizeAmount);
    }
}
