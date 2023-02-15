// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IInterestLiquidationFacet} from "../interfaces/IInterestLiquidationFacet.sol";
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
 * @notice Main end-user functionality concerning liquidations of accrued KISS interest within the Kresko protocol
 */
contract InterestLiquidationFacet is DiamondModifiers, IInterestLiquidationFacet {
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
     * @notice Attempts to batch liquidate all KISS interest accrued for an account in a unhealthy position
     * @notice Liquidator must have the KISS balance required with the Kresko contract approved
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

        // Loop all accounts minted assets and sum all accrued kiss interest
        uint256 kissAmountToRepay;
        for (uint256 i; i < mintedKreskoAssets.length; i++) {
            address repayKreskoAsset = mintedKreskoAssets[i];
            // Repays the full interest of this asset on behalf of the account being liquidated
            kissAmountToRepay += ms().repayFullStabilityRateInterest(_account, repayKreskoAsset);
            // If the liquidation repays the user's entire Kresko asset balance, remove it from minted assets array.
            if (ms().kreskoAssetDebt[_account][repayKreskoAsset] == 0) {
                ms().mintedKreskoAssets[_account].removeAddress(repayKreskoAsset, i);
            }
            // Check if the status with amount repaid is still underwater, if so no further liquidation is needed
            if (
                !ms().isAccountLiquidatable(
                    _account,
                    kissAmountToRepay.fromWadPriceToFixedPoint().mul(ms().liquidationIncentiveMultiplier)
                )
            ) break;
        }

        // Emit a separate event for batch repayment itself
        emit InterestRateEvent.StabilityRateInterestBatchRepaid(_account, kissAmountToRepay);

        // Seize collateral and send to liquidator according to the repayment made
        uint256 collateralSeizeAmount = _seizeAndTransferCollateral(
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
            collateralSeizeAmount
        );
    }

    /**
     * @notice Attempts to liquidate all KISS interest accrued for an account in a unhealthy position
     * @notice Liquidator must have the KISS balance required with the Kresko contract approved
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

        // Repays the full interest of this asset on behalf of the account being liquidated
        uint256 kissRepayAmount = ms().repayFullStabilityRateInterest(_account, _repayKreskoAsset);

        uint256 mintedKreskoAssetIndex = ms().getMintedKreskoAssetsIndex(_account, _repayKreskoAsset);

        // Seize collateral and send to liquidator according to the repayment made
        uint256 collateralAmountSeized = _seizeAndTransferCollateral(
            _account,
            _collateralAssetToSeize,
            ms().getDepositedCollateralAssetIndex(_account, _collateralAssetToSeize),
            kissRepayAmount
        );

        // If the liquidation repays the user's entire Kresko asset balance, remove it from minted assets array.
        if (ms().kreskoAssetDebt[_account][_repayKreskoAsset] == 0) {
            ms().mintedKreskoAssets[_account].removeAddress(_repayKreskoAsset, mintedKreskoAssetIndex);
        }

        emit MinterEvent.InterestLiquidationOccurred(
            _account,
            msg.sender,
            _repayKreskoAsset,
            kissRepayAmount, // without the liquidation bonus
            _collateralAssetToSeize,
            collateralAmountSeized // with the liquidation bonus
        );
    }

    /**
     * @notice Internal function to perform collateral seizing when interest gets liquidated
     * @dev
     * @param _account Account being liquidated
     * @param _collateralAssetToSeize Collateral asset used to liquidate the debt
     * @param _depositedCollateralAssetIndex Deposit index for the liquidated accounts collateral
     * @param _kissRepayAmount Accrued KISS interest value being liquidated
     */
    function _seizeAndTransferCollateral(
        address _account,
        address _collateralAssetToSeize,
        uint256 _depositedCollateralAssetIndex,
        uint256 _kissRepayAmount
    ) internal returns (uint256 seizeAmount) {
        MinterState storage s = ms();

        seizeAmount = s.collateralAssets[_collateralAssetToSeize].decimals.fromCollateralFixedPointAmount(
            LibCalculation.calculateAmountToSeize(
                s.liquidationIncentiveMultiplier,
                s.collateralAssets[_collateralAssetToSeize].fixedPointPrice(),
                _kissRepayAmount.fromWadPriceToFixedPoint()
            )
        );

        // Collateral deposits for the seized asset of the account being liquidated
        uint256 collateralDeposit = s.getCollateralDeposits(_account, _collateralAssetToSeize);

        // Default case where deposits are greater than the seized amount
        if (collateralDeposit > seizeAmount) {
            // Convert the value being seized into non-rebasing value
            s.collateralDeposits[_account][_collateralAssetToSeize] -= ms()
                .collateralAssets[_collateralAssetToSeize]
                .toNonRebasingAmount(seizeAmount);
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
