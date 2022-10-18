// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {IUniswapV2Oracle} from "../interfaces/IUniswapV2Oracle.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";

library LibKrAsset {
    using FixedPoint for FixedPoint.Unsigned;

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
    ) internal view returns (FixedPoint.Unsigned memory) {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];

        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(uint256(krAsset.oracle.latestAnswer()));
        FixedPoint.Unsigned memory value = FixedPoint.Unsigned(_amount).mul(oraclePrice);

        if (!_ignoreKFactor) {
            value = value.mul(krAsset.kFactor);
        }

        return value;
    }

    function getKrAssetAMMPrice(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _amount
    ) internal view returns (FixedPoint.Unsigned memory) {
        return FixedPoint.Unsigned(IUniswapV2Oracle(self.ammOracle).consultKrAsset(_kreskoAsset, _amount));
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
        FixedPoint.Unsigned memory _ratio
    ) internal view returns (FixedPoint.Unsigned memory minCollateralValue) {
        // Calculate the Kresko asset's value weighted by its k-factor.
        FixedPoint.Unsigned memory weightedKreskoAssetValue = self.getKrAssetValue(_krAsset, _amount, false);
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return weightedKreskoAssetValue.mul(_ratio);
    }
}
