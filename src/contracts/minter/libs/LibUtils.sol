// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {CollateralAsset, KrAsset} from "../MinterTypes.sol";
import {LibDecimals, FixedPoint} from "../libs/LibDecimals.sol";
import {IKreskoAssetAnchor} from "../../kreskoasset/IKreskoAssetAnchor.sol";

library LibUtils {
    using FixedPoint for int256;
    using FixedPoint for uint256;
    using FixedPoint for FixedPoint.Unsigned;
    using LibDecimals for int256;

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @param asset the kresko asset struct
     * @param amount the amount to convert
     */
    function toRebasingAmount(KrAsset memory asset, uint256 amount) internal view returns (uint256) {
        return IKreskoAssetAnchor(asset.anchor).convertToAssets(amount);
    }

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @dev if collateral is not a kresko asset, return 0
     * @param asset the collateral asset struct
     * @param amount the amount to convert
     */
    function toRebasingAmount(CollateralAsset memory asset, uint256 amount) internal view returns (uint256) {
        if (asset.anchor == address(0)) return amount;
        return IKreskoAssetAnchor(asset.anchor).convertToAssets(amount);
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @param asset the kresko asset struct
     * @param amount the amount to convert
     */
    function toStaticAmount(KrAsset memory asset, uint256 amount) internal view returns (uint256) {
        return IKreskoAssetAnchor(asset.anchor).convertToShares(amount);
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @dev if collateral is not a kresko asset, return 0
     * @param asset the collateral asset struct
     * @param amount the amount to convert
     */
    function toStaticAmount(CollateralAsset memory asset, uint256 amount) internal view returns (uint256) {
        if (asset.anchor == address(0)) return amount;
        return IKreskoAssetAnchor(asset.anchor).convertToShares(amount);
    }

    /**
     * @notice Get the price of @param asset in uint256
     */
    function uintPrice(CollateralAsset memory asset) internal view returns (uint256) {
        return uint256(asset.oracle.latestAnswer());
    }

    /**
     * @notice Get the price of @param asset in uint256
     */
    function uintPrice(KrAsset memory asset) internal view returns (uint256) {
        return uint256(asset.oracle.latestAnswer());
    }

    /**
     * @notice Get the price of @param asset in uint256
     */
    function wadPrice(CollateralAsset memory asset) internal view returns (uint256) {
        return asset.oracle.latestAnswer().oraclePriceToWad();
    }

    /**
     * @notice Get the price of @param asset in uint256
     */
    function wadPrice(KrAsset memory asset) internal view returns (uint256) {
        return asset.oracle.latestAnswer().oraclePriceToWad();
    }

    /**
     * @notice Get the price of @param asset in FixedPoint.Unsigned
     */
    function fixedPointPrice(CollateralAsset memory asset) internal view returns (FixedPoint.Unsigned memory) {
        return asset.oracle.latestAnswer().toFixedPoint();
    }

    /**
     * @notice Get the price of @param asset in FixedPoint.Unsigned
     */
    function fixedPointPrice(KrAsset memory asset) internal view returns (FixedPoint.Unsigned memory) {
        return asset.oracle.latestAnswer().toFixedPoint();
    }

    /**
     * @notice Get value of @param amount of @param asset in uint256
     */
    function uintUSD(CollateralAsset memory asset, uint256 amount) internal view returns (uint256) {
        return asset.uintPrice() * amount;
    }

    /**
     * @notice Get value of @param amount of @param asset in uint256
     */
    function uintUSD(KrAsset memory asset, uint256 amount) internal view returns (uint256) {
        return asset.uintPrice() * amount;
    }

    /**
     * @notice Get value of @param amount of @param asset in FixedPoint.Unsigned
     */
    function fixedPointUSD(CollateralAsset memory asset, uint256 amount)
        internal
        view
        returns (FixedPoint.Unsigned memory)
    {
        return asset.fixedPointPrice().mul(amount.toFixedPoint());
    }

    /**
     * @notice Get value of @param amount of @param asset in FixedPoint.Unsigned
     */
    function fixedPointUSD(KrAsset memory asset, uint256 amount) internal view returns (FixedPoint.Unsigned memory) {
        return asset.fixedPointPrice().mul(amount.toFixedPoint());
    }
}
