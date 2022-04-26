// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./utils/OwnableUpgradeable.sol";

import "./interfaces/IKreskoAsset.sol";
import "./interfaces/INonRebasingWrapperToken.sol";
import "./flux/interfaces/AggregatorV2V3Interface.sol";

import "./libraries/FixedPoint.sol";
import "./libraries/FixedPointMath.sol";
import "./libraries/Arrays.sol";

import "./Storage1.sol";

/**
 * @title Worker that executes core functionality of the Kresko protocol.
 * @notice 
 */
contract KreskoWorker is Storage1 {

    using FixedPoint for FixedPoint.Unsigned;
    using FixedPointMath for uint8;
    using FixedPointMath for uint256;

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
    ) public view returns (FixedPoint.Unsigned memory maxLiquidatableUSD) {
        // Minimum collateral value required for the krAsset position
        FixedPoint.Unsigned memory minCollateralValue = getMinimumCollateralValue(
            _repayKreskoAsset,
            kreskoAssetDebt[_account][_repayKreskoAsset]
        );

        // Collateral value for this position
        (FixedPoint.Unsigned memory collateralValueAvailable, ) = getCollateralValueAndOraclePrice(
            _collateralAssetToSeize,
            collateralDeposits[_account][_collateralAssetToSeize],
            false // take cFactor into consideration
        );
        if (collateralValueAvailable.isGreaterThanOrEqual(minCollateralValue)) {
            return FixedPoint.Unsigned(0);
        } else {
            // Get the factors of the assets
            FixedPoint.Unsigned memory kFactor = kreskoAssets[_repayKreskoAsset].kFactor;
            FixedPoint.Unsigned memory cFactor = collateralAssets[_collateralAssetToSeize].factor;

            // Calculate how much value is under
            FixedPoint.Unsigned memory valueUnderMin = minCollateralValue.sub(collateralValueAvailable);

            // Get the divisor which calculates the max repayment from the underwater value
            FixedPoint.Unsigned memory repayDivisor = kFactor.mul(minimumCollateralizationRatio).sub(
                liquidationIncentiveMultiplier.sub(burnFee).mul(cFactor)
            );

            // Max repayment value for this pair
            maxLiquidatableUSD = valueUnderMin.div(repayDivisor);

            // Get the future collateral value that is being used for the liquidation
            FixedPoint.Unsigned memory collateralValueRepaid = maxLiquidatableUSD.div(
                kFactor.mul(liquidationIncentiveMultiplier.add(burnFee))
            );

            // If it's more than whats available get the max value from how much value is available instead.
            if (collateralValueRepaid.isGreaterThan(collateralValueAvailable)) {
                // Reverse the divisor formula to achieve the max repayment from available collateral.
                // We end up here if the user has multiple positions with different risk profiles.
                maxLiquidatableUSD = collateralValueAvailable.div(collateralValueRepaid.div(valueUnderMin));
            }

            // Cascade the liquidations if user has multiple collaterals and cFactor < 1.
            // This is desired because pairs with low cFactor have higher collateral requirement
            // than positions with high cFactor.

            // Main reason here is keep the liquidations from happening only on pairs that have a high risk profile.
            if (depositedCollateralAssets[_account].length > 1 && cFactor.isLessThan(ONE_HUNDRED_PERCENT)) {
                // To mitigate:
                // cFactor^4 the collateral available (cFactor = 1 == nothing happens)
                // Get the ratio between max liquidatable USD and diminished collateral available
                // = (higher value -> higher the risk ratio of this pair)
                // Divide the maxValue by this ratio and a diminishing max value is returned.

                // For a max profit liquidation strategy jumps to other pairs must happen before
                // the liquidation value of the risky position becomes the most profitable again.

                return
                    maxLiquidatableUSD.div(maxLiquidatableUSD.div(collateralValueAvailable.mul(cFactor.pow(4)))).mul(
                        // Include a burnFee surplus in the liquidation
                        // so the users can repay their debt.
                        FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(burnFee)
                    );
            } else {
                // For collaterals with cFactor = 1 / accounts with only single collateral
                // the debt is just repaid in full with a single transaction
                return maxLiquidatableUSD.mul(FixedPoint.Unsigned(ONE_HUNDRED_PERCENT).add(burnFee));
            }
        }
    }

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) public view returns (FixedPoint.Unsigned memory) {
        KrAsset memory krAsset = kreskoAssets[_kreskoAsset];

        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(krAsset.oracle.latestAnswer()));

        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(_amount).mul(oraclePrice);

        if (!_ignoreKFactor) {
            value = value.mul(krAsset.kFactor);
        }

        return value;
    }

    /**
     * @notice Get the minimum collateral value required to keep a individual debt position healthy.
     * @param _krAsset The address of the Kresko asset.
     * @param _amount The Kresko Asset debt amount.
     * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
     */
    function getMinimumCollateralValue(address _krAsset, uint256 _amount)
        public
        view
        returns (FixedPoint.Unsigned memory minCollateralValue)
    {
        require(kreskoAssets[_krAsset].exists, "KR: !krAssetExist");

        // Calculate the Kresko asset's value weighted by its k-factor.
        FixedPoint.Unsigned memory weightedKreskoAssetValue = getKrAssetValue(_krAsset, _amount, false);
        // Calculate the minimum collateral required to back this Kresko asset amount.
        return weightedKreskoAssetValue.mul(minimumCollateralizationRatio);
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to calculate the collateral value for.
     * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) public view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
        CollateralAsset memory collateralAsset = collateralAssets[_collateralAsset];

        FixedPoint.Unsigned memory fixedPointAmount = collateralAsset.decimals._toCollateralFixedPointAmount(_amount);
        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(collateralAsset.oracle.latestAnswer()));
        FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

        if (!_ignoreCollateralFactor) {
            value = value.mul(collateralAsset.factor);
        }
        return (value, oraclePrice);
    }

}