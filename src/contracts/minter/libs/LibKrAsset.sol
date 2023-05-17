// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;

import {WadRay} from "../../libs/WadRay.sol";
import {IUniswapV2Oracle} from "../interfaces/IUniswapV2Oracle.sol";
import {KrAsset} from "../MinterTypes.sol";
import {MinterState} from "../MinterState.sol";

library LibKrAsset {
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
    ) internal view returns (uint256) {
        KrAsset memory krAsset = self.kreskoAssets[_kreskoAsset];
        uint256 value = krAsset.uintUSD(_amount);

        if (!_ignoreKFactor) {
            value = value.wadMul(krAsset.kFactor);
        }

        return value;
    }

    function getKrAssetAMMPrice(
        MinterState storage self,
        address _kreskoAsset,
        uint256 _amount
    ) internal view returns (uint256) {
        if (self.ammOracle == address(0)) {
            return 0;
        }
        return IUniswapV2Oracle(self.ammOracle).consultKrAsset(_kreskoAsset, _amount);
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
        uint256 _ratio
    ) internal view returns (uint256 minCollateralValue) {
        // Calculate the collateral value required to back this Kresko asset amount at the given ratio
        return self.getKrAssetValue(_krAsset, _amount, false).wadMul(_ratio);
    }
}
