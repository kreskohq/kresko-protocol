// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

// import {WadRay} from "libs/WadRay.sol";
// import {toWad} from "common/funcs/Math.sol";
// import {cs} from "common/State.sol";
// import {Asset} from "common/Types.sol";
// import {Percents} from "common/Constants.sol";
// import {SCDPState, sdi} from "scdp/State.sol";
// import {SCDPAssetData} from "scdp/Types.sol";

// library SGlobal {
//     using WadRay for uint256;

//     /**
//      * @notice Checks whether the shared debt pool can be liquidated.
//      */
//     function isLiquidatableSCDP(SCDPState storage self) internal view returns (bool) {
//         return self.debtExceedsCollateral(self.liquidationThreshold);
//     }

//     /**
//      * @notice Checks whether the collateral value is below debt (*ratio) supplied.
//      * @param _ratio ratio to check
//      */
//     function debtExceedsCollateral(SCDPState storage self, uint256 _ratio) internal view returns (bool) {
//         return
//             sdi().effectiveDebtValue().wadMul(_ratio) >
//             self.totalCollateralValueSCDP(
//                 false // dont ignore cFactor
//             );
//     }

//     /**
//      * @notice Returns the value of the krAsset held in the pool at a ratio.
//      * @param _ratio ratio
//      * @param _ignorekFactor ignore kFactor
//      * @return value in USD
//      */
//     function totalDebtValueAtRatioSCDP(
//         SCDPState storage self,
//         uint256 _ratio,
//         bool _ignorekFactor
//     ) internal view returns (uint256 value) {
//         address[] memory assets = self.krAssets;
//         for (uint256 i; i < assets.length; ) {
//             Asset storage asset = cs().assets[assets[i]];
//             uint256 debtAmount = asset.toRebasingAmount(self.assetData[assets[i]].debt);
//             unchecked {
//                 if (debtAmount != 0) {
//                     value += asset.debtAmountToValue(debtAmount, _ignorekFactor);
//                 }
//                 i++;
//             }
//         }

//         if (_ratio != Percents.HUNDRED) {
//             value = value.wadMul(_ratio);
//         }
//     }

//     /**
//      * @notice Calculates the total collateral value of collateral assets in the pool.
//      * @param _ignoreFactors whether to ignore factors
//      * @return value in USD
//      */
//     function totalCollateralValueSCDP(SCDPState storage self, bool _ignoreFactors) internal view returns (uint256 value) {
//         address[] memory assets = self.collaterals;
//         for (uint256 i; i < assets.length; ) {
//             Asset storage asset = cs().assets[assets[i]];
//             uint256 depositAmount = self.totalDepositAmount(assets[i], asset);
//             if (depositAmount != 0) {
//                 value += asset.collateralAmountToValue(depositAmount, _ignoreFactors);
//             }

//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /**
//      * @notice Returns the value of the collateral asset in the pool and the value of the amount.
//      * Saves gas for getting the values in the same execution.
//      * @param _collateralAsset collateral asset
//      * @param _amount amount of collateral asset
//      * @param _ignoreFactors whether to ignore cFactor and kFactor
//      */
//     function collateralValueSCDP(
//         SCDPState storage self,
//         address _collateralAsset,
//         uint256 _amount,
//         bool _ignoreFactors
//     ) internal view returns (uint256 totalValue, uint256 amountValue) {
//         address[] memory assets = self.collaterals;
//         for (uint256 i; i < assets.length; ) {
//             Asset storage asset = cs().assets[assets[i]];
//             uint256 depositAmount = self.totalDepositAmount(assets[i], asset);
//             if (depositAmount != 0) {
//                 (uint256 assetValue, uint256 price) = asset.collateralAmountToValueWithPrice(depositAmount, _ignoreFactors);
//                 totalValue += assetValue;
//                 if (assets[i] == _collateralAsset) {
//                     amountValue = toWad(asset.decimals, _amount).wadMul(_ignoreFactors ? price : price.wadMul(asset.factor));
//                 }
//             }

//             unchecked {
//                 i++;
//             }
//         }
//     }

//     /**
//      * @notice Get pool collateral deposits of an asset.
//      * @param _assetAddress The asset address
//      * @param _asset The asset struct
//      * @return Amount of scaled debt.
//      */
//     function totalDepositAmount(
//         SCDPState storage self,
//         address _assetAddress,
//         Asset storage _asset
//     ) internal view returns (uint128) {
//         return uint128(_asset.toRebasingAmount(self.assetData[_assetAddress].totalDeposits));
//     }

//     /**
//      * @notice Get pool user collateral deposits of an asset.
//      * @param _assetAddress The asset address
//      * @param _asset The asset struct
//      * @return Amount of scaled debt.
//      */
//     function userDepositAmount(
//         SCDPState storage self,
//         address _assetAddress,
//         Asset storage _asset
//     ) internal view returns (uint256) {
//         SCDPAssetData memory assetData = self.assetData[_assetAddress];
//         return _asset.toRebasingAmount(assetData.totalDeposits - assetData.swapDeposits);
//     }

//     /**
//      * @notice Get "swap" collateral deposits.
//      * @param _assetAddress The asset address
//      * @param _asset The asset struct.
//      * @return Amount of debt.
//      */
//     function swapDepositAmount(
//         SCDPState storage self,
//         address _assetAddress,
//         Asset storage _asset
//     ) internal view returns (uint128) {
//         return uint128(_asset.toRebasingAmount(self.assetData[_assetAddress].swapDeposits));
//     }
// }
