// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../shared/Constants.sol";
import {IKreskoAsset} from "../interfaces/IKreskoAsset.sol";
import {FPConversions} from "../libraries/FPConversions.sol";
import {DiamondModifiers} from "../shared/Modifiers.sol";
import {ms, MinterState, FixedPoint, MinterEvent, IERC20MetadataUpgradeable, SafeERC20Upgradeable, Arrays} from "../storage/MinterStorage.sol";

contract LiquidationFacet is DiamondModifiers {
    using FPConversions for uint8;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using Arrays for address[];

    /**
     * @notice Attempts to liquidate an account by repaying the portion of the account's Kresko asset
     *         debt, receiving in return a portion of the account's collateral at a discounted rate.
     * @param _account The account to attempt to liquidate.
     * @param _repayKreskoAsset The address of the Kresko asset to be repaid.
     * @param _repayAmount The amount of the Kresko asset to be repaid.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     * @param _mintedKreskoAssetIndex The index of the Kresko asset in the account's minted assets array.
     * @param _depositedCollateralAssetIndex Index of the collateral asset in the account's collateral assets array.
     */

    function liquidate(
        address _account,
        address _repayKreskoAsset,
        uint256 _repayAmount,
        address _collateralAssetToSeize,
        uint256 _mintedKreskoAssetIndex,
        uint256 _depositedCollateralAssetIndex
    ) external nonReentrant {
        MinterState storage s = ms();
        {
            require(s.kreskoAssets[_repayKreskoAsset].exists, "KR: !krAssetExist");
            require(s.collateralAssets[_collateralAssetToSeize].exists, "KR: !collateralExists");
            require(_repayAmount > 0, "KR: 0-repay");
            uint256 priceTimestamp = uint256(s.kreskoAssets[_repayKreskoAsset].oracle.latestTimestamp());
            require(block.timestamp < priceTimestamp + s.secondsUntilStalePrice, "KR: stale price");
            // Borrower cannot liquidate themselves
            require(msg.sender != _account, "KR: self liquidation");
            // Check that this account is below its minimum collateralization ratio and can be liquidated.
            require(s.isAccountLiquidatable(_account), "KR: !accountLiquidatable");
        }

        // Repay amount USD = repay amount * KR asset USD exchange rate.
        FixedPoint.Unsigned memory repayAmountUSD = FixedPoint.Unsigned(_repayAmount).mul(
            FixedPoint.Unsigned(uint256(s.kreskoAssets[_repayKreskoAsset].oracle.latestAnswer()))
        );

        // Get the token debt amount
        uint256 krAssetDebt = s.kreskoAssetDebt[_account][_repayKreskoAsset];
        // Avoid stack too deep error
        {
            // Liquidator may not repay more value than what the liquidation pair allows
            // Nor repay more tokens than the account holds debt for the asset
            FixedPoint.Unsigned memory maxLiquidation = s.calculateMaxLiquidatableValueForAssets(
                _account,
                _repayKreskoAsset,
                _collateralAssetToSeize
            );
            require(krAssetDebt >= _repayAmount, "KR: repayAmount > debtAmount");
            require(repayAmountUSD.isLessThanOrEqual(maxLiquidation), "KR: repayUSD > maxUSD");
        }

        FixedPoint.Unsigned memory collateralPriceUSD = FixedPoint.Unsigned(
            uint256(s.collateralAssets[_collateralAssetToSeize].oracle.latestAnswer())
        );

        // Get the actual seized amount
        uint256 seizeAmount = _liquidateAssets(
            _account,
            krAssetDebt,
            _repayAmount,
            s.collateralAssets[_collateralAssetToSeize].decimals._fromCollateralFixedPointAmount(
                s.liquidationIncentiveMultiplier._calculateAmountToSeize(collateralPriceUSD, repayAmountUSD)
            ),
            _repayKreskoAsset,
            _mintedKreskoAssetIndex,
            _collateralAssetToSeize,
            _depositedCollateralAssetIndex
        );

        // Charge burn fee from the liquidated user
        s.chargeBurnFee(_account, _repayKreskoAsset, _repayAmount);

        // Burn the received Kresko assets, removing them from circulation.
        IKreskoAsset(_repayKreskoAsset).burn(msg.sender, _repayAmount);

        // Send liquidator the seized collateral.
        IERC20MetadataUpgradeable(_collateralAssetToSeize).safeTransfer(msg.sender, seizeAmount);

        emit MinterEvent.LiquidationOccurred(
            _account,
            msg.sender,
            _repayKreskoAsset,
            _repayAmount,
            _collateralAssetToSeize,
            seizeAmount
        );
    }

    /**
     * @notice Remove Kresko assets and collateral assets from the liquidated user's holdings.
     * @param _account The account to attempt to liquidate.
     * @param _krAssetDebt The amount of Kresko assets that the liquidated user owes.
     * @param _repayAmount The amount of the Kresko asset to be repaid.
     * @param _seizeAmount The calculated amount of collateral assets to be seized.
     * @param _repayKreskoAsset The address of the Kresko asset to be repaid.
     * @param _mintedKreskoAssetIndex The index of the Kresko asset in the user's minted assets array.
     * @param _collateralAssetToSeize The address of the collateral asset to be seized.
     * @param _depositedCollateralAssetIndex The index of the collateral asset in the account's collateral assets array.
     */
    function _liquidateAssets(
        address _account,
        uint256 _krAssetDebt,
        uint256 _repayAmount,
        uint256 _seizeAmount,
        address _repayKreskoAsset,
        uint256 _mintedKreskoAssetIndex,
        address _collateralAssetToSeize,
        uint256 _depositedCollateralAssetIndex
    ) internal returns (uint256) {
        MinterState storage s = ms();
        // Subtract repaid Kresko assets from liquidated user's recorded debt.
        s.kreskoAssetDebt[_account][_repayKreskoAsset] = _krAssetDebt - _repayAmount;
        // If the liquidation repays the user's entire Kresko asset balance, remove it from minted assets array.
        if (_repayAmount == _krAssetDebt) {
            s.mintedKreskoAssets[_account].removeAddress(_repayKreskoAsset, _mintedKreskoAssetIndex);
        }

        // Get users collateral deposit amount
        uint256 collateralDeposit = s.collateralDeposits[_account][_collateralAssetToSeize];

        if (collateralDeposit > _seizeAmount) {
            s.collateralDeposits[_account][_collateralAssetToSeize] = collateralDeposit - _seizeAmount;
        } else {
            // This clause means user either has collateralDeposits equal or less than the _seizeAmount
            _seizeAmount = collateralDeposit;
            // So we set the collateralDeposits to 0
            s.collateralDeposits[_account][_collateralAssetToSeize] = 0;
            // And remove the asset from the deposits array.
            s.depositedCollateralAssets[_account].removeAddress(
                _collateralAssetToSeize,
                _depositedCollateralAssetIndex
            );
        }

        // Return the actual amount seized
        return _seizeAmount;
    }

    /**
     * @notice Calculates if an account's current collateral value is under its minimum collateral value
     * @dev Returns true if the account's current collateral value is below the minimum collateral value
     * required to consider the position healthy.
     * @param _account The account to check.
     * @return A boolean indicating if the account can be liquidated.
     */
    function isAccountLiquidatable(address _account) external view returns (bool) {
        return ms().isAccountLiquidatable(_account);
    }

    /**
     * @dev Calculates the total value that can be liquidated for a liquidation pair
     * @param _account address to liquidate
     * @param _repayKreskoAsset address of the kreskoAsset being repaid on behalf of the liquidatee
     * @param _collateralAssetToSeize address of the collateral asset being seized from the liquidatee
     * @return maxLiquidatableUSD USD value that can be liquidated, 0 if the pair has no liquidatable value
     */
    function calculateMaxLiquidatableValueForAssets(
        address _account,
        address _repayKreskoAsset,
        address _collateralAssetToSeize
    ) external view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        return ms().calculateMaxLiquidatableValueForAssets(_account, _repayKreskoAsset, _collateralAssetToSeize);
    }
}
