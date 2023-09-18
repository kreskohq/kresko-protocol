// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {toWad} from "common/funcs/Math.sol";
import {collateralAmountRead, collateralAmountToValue} from "minter/funcs/Conversions.sol";
import {CollateralAsset} from "minter/Types.sol";
import {ms} from "minter/State.sol";
import {SCDPKrAsset} from "scdp/Types.sol";
import {SCDPState} from "scdp/State.sol";

library SCommon {
    using WadRay for uint256;

    /**
     * @notice Checks whether the shared debt pool can be liquidated.
     */
    function isLiquidatableSCDP(SCDPState storage self) internal view returns (bool) {
        return !self.checkSCDPRatio(self.liquidationThreshold);
    }

    // /**
    //  * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
    //  * @param _collateralRatio ratio to check
    //  */
    // function checkSCDPRatioWithdrawal(SCDPState storage self, uint256 _collateralRatio) internal view returns (bool) {
    //     return
    //         self.totalCollateralValueSCDP(
    //             false // dont ignore cFactor
    //         ) >= self.totalDebtValueAtRatioSCDP(_collateralRatio, false); // dont ignore kFactors or MCR;
    // }

    /**
     * @notice Checks whether the collateral ratio is equal to or above to ratio supplied.
     * @param _ratio ratio to check
     */
    function checkSCDPRatio(SCDPState storage self, uint256 _ratio) internal view returns (bool) {
        return
            self.totalCollateralValueSCDP(
                false // dont ignore cFactor
            ) >= self.effectiveDebtValue().wadMul(_ratio);
    }

    /**
     * @notice Calculates the total collateral value of collateral assets in the pool.
     * @param _ignoreFactors whether to ignore factors
     * @return value in USD
     */
    function totalCollateralValueSCDP(SCDPState storage self, bool _ignoreFactors) internal view returns (uint256 value) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, ) = collateralAmountToValue(asset, self.totalDepositAmount(asset), _ignoreFactors);
            value += assetValue;

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Returns the value of the collateral asset in the pool and the value of the amount.
     * Saves gas for getting the values in the same execution.
     * @param _collateralAsset collateral asset
     * @param _amount amount of collateral asset
     * @param _ignoreFactors whether to ignore cFactor and kFactor
     */
    function collateralValueSCDP(
        SCDPState storage self,
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreFactors
    ) internal view returns (uint256 totalValue, uint256 amountValue) {
        address[] memory assets = self.collaterals;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 assetValue, uint256 price) = collateralAmountToValue(
                asset,
                self.totalDepositAmount(asset),
                _ignoreFactors
            );

            totalValue += assetValue;
            if (asset == _collateralAsset) {
                CollateralAsset memory collateral = ms().collateralAssets[_collateralAsset];
                amountValue = toWad(collateral.decimals, _amount).wadMul(
                    _ignoreFactors ? price : price.wadMul(collateral.factor)
                );
            }

            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Get pool collateral deposits of an asset.
     * @param _asset The asset address
     * @return Amount of scaled debt.
     */
    function totalDepositAmount(SCDPState storage self, address _asset) internal view returns (uint256) {
        return collateralAmountRead(_asset, self.totalDeposits[_asset]);
    }

    /**
     * @notice Get pool user collateral deposits of an asset.
     * @param _asset The asset address
     * @return Amount of scaled debt.
     */
    function userDepositAmount(SCDPState storage self, address _asset) internal view returns (uint256) {
        return collateralAmountRead(_asset, self.totalDeposits[_asset] - self.swapDeposits[_asset]);
    }

    /**
     * @notice Get "swap" collateral deposits.
     * @param _asset The asset address
     * @return Amount of debt.
     */
    function swapDepositAmount(SCDPState storage self, address _asset) internal view returns (uint256) {
        return collateralAmountRead(_asset, self.swapDeposits[_asset]);
    }

    /**
     * @notice Check that assets can be swapped.
     * @return feePercentage fee percentage for this swap
     */
    function checkAssets(
        SCDPState storage self,
        address _assetIn,
        address _assetOut
    ) internal view returns (uint256 feePercentage, uint256 protocolFee) {
        require(self.isSwapEnabled[_assetIn][_assetOut], "swap-disabled");
        require(self.isEnabled[_assetIn], "asset-in-disabled");
        require(self.isEnabled[_assetOut], "asset-out-disabled");
        require(_assetIn != _assetOut, "same-asset");
        SCDPKrAsset memory assetIn = self.krAsset[_assetIn];
        SCDPKrAsset memory assetOut = self.krAsset[_assetOut];

        feePercentage = assetOut.openFee + assetIn.closeFee;
        protocolFee = assetIn.protocolFee + assetOut.protocolFee;
    }
}
