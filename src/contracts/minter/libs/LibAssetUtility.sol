// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;
import {CollateralAsset, KrAsset} from "../MinterTypes.sol";
import {LibDecimals} from "../libs/LibDecimals.sol";
import {IKreskoAssetAnchor} from "../../kreskoasset/IKreskoAssetAnchor.sol";
import {WadRay} from "../../libs/WadRay.sol";

/**
 * @title LibAssetUtility
 * @author Kresko
 * @notice Utility functions for KrAsset and CollateralAsset structs
 */
library LibAssetUtility {
    using WadRay for uint256;
    using LibDecimals for int256;

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @param self the kresko asset struct
     * @param _nonRebasedAmount the amount to convert
     */
    function toRebasingAmount(KrAsset memory self, uint256 _nonRebasedAmount) internal view returns (uint256) {
        return IKreskoAssetAnchor(self.anchor).convertToAssets(_nonRebasedAmount);
    }

    /**
     * @notice Amount of non rebasing tokens -> amount of rebasing tokens
     * @dev if collateral is not a kresko asset, returns the input
     * @param self the collateral asset struct
     * @param _nonRebasedAmount the amount to convert
     */
    function toRebasingAmount(CollateralAsset memory self, uint256 _nonRebasedAmount) internal view returns (uint256) {
        if (self.anchor == address(0)) return _nonRebasedAmount;
        return IKreskoAssetAnchor(self.anchor).convertToAssets(_nonRebasedAmount);
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @param self the kresko asset struct
     * @param _maybeRebasedAmount the amount to convert
     */
    function toNonRebasingAmount(KrAsset memory self, uint256 _maybeRebasedAmount) internal view returns (uint256) {
        return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
    }

    /**
     * @notice Amount of rebasing tokens -> amount of non rebasing tokens
     * @dev if collateral is not a kresko asset, returns the input
     * @param self the collateral asset struct
     * @param _maybeRebasedAmount the amount to convert
     */
    function toNonRebasingAmount(
        CollateralAsset memory self,
        uint256 _maybeRebasedAmount
    ) internal view returns (uint256) {
        if (self.anchor == address(0)) return _maybeRebasedAmount;
        return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with extOracleDecimals
     */
    function uintPrice(CollateralAsset memory self) internal view returns (uint256) {
        return uint256(self.oracle.latestAnswer());
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function uintPrice(KrAsset memory self) internal view returns (uint256) {
        return uint256(self.oracle.latestAnswer());
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with 18 decimals
     */
    function wadPrice(CollateralAsset memory self) internal view returns (uint256) {
        return self.oracle.latestAnswer().oraclePriceToWad();
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with 18 decimals
     */
    function wadPrice(KrAsset memory self) internal view returns (uint256) {
        return self.oracle.latestAnswer().oraclePriceToWad();
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(CollateralAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.uintPrice().wadMul(_assetAmount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.uintPrice().wadMul(_assetAmount);
    }
}
