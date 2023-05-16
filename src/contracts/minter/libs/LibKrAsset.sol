// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {IUniswapV2Oracle} from "../interfaces/IUniswapV2Oracle.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";

library LibKrAsset {
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPoint for uint256;
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
    ) internal view returns (FixedPoint.Unsigned memory) {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        FixedPoint.Unsigned memory value = krAsset.fixedPointUSD(_amount);

        if (!_ignoreKFactor) {
            value = FixedPoint.Unsigned(value.rawValue.wadMul(krAsset.kFactor.rawValue));
        }

        return value;
    }

    function getKrAssetAMMPrice(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _amount
    ) internal view returns (FixedPoint.Unsigned memory) {
        if (self.ammOracle == address(0)) {
            return FixedPoint.Unsigned(0);
        }
        return IUniswapV2Oracle(self.ammOracle).consultKrAsset(_kreskoAsset, _amount).toFixedPoint();
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
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return self.getKrAssetValue(_krAsset, _amount, false).mul(_ratio);
    }
}
