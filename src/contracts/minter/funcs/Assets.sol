// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Redstone} from "libs/Redstone.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {safePrice, oraclePrice, oraclePriceToWad} from "common/funcs/Prices.sol";
import {WadRay} from "libs/WadRay.sol";

import {KrAsset, CollateralAsset} from "minter/Types.sol";

library MAssets {
    using WadRay for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                Rebase Utils                                */
    /* -------------------------------------------------------------------------- */

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
    function toNonRebasingAmount(CollateralAsset memory self, uint256 _maybeRebasedAmount) internal view returns (uint256) {
        if (self.anchor == address(0)) return _maybeRebasedAmount;
        return IKreskoAssetAnchor(self.anchor).convertToShares(_maybeRebasedAmount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Price Utils                                */
    /* -------------------------------------------------------------------------- */

    function marketStatus(KrAsset memory self) internal pure returns (bool) {
        return true;
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with extOracleDecimals
     */
    function _uintPrice(CollateralAsset memory self) private view returns (uint256) {
        return oraclePrice(self.oracle);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function redstonePrice(CollateralAsset memory self) internal view returns (uint256) {
        return Redstone.getPrice(self.redstoneId);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function _uintPrice(KrAsset memory self) private view returns (uint256) {
        return oraclePrice(self.oracle);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     * @param self the kresko asset struct
     */
    function redstonePrice(KrAsset memory self) internal view returns (uint256) {
        return Redstone.getPrice(self.redstoneId);
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with 18 decimals
     */
    function _wadPrice(CollateralAsset memory self) private view returns (uint256) {
        return oraclePriceToWad(oraclePrice(self.oracle));
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with 18 decimals
     */
    function _wadPrice(KrAsset memory self) private view returns (uint256) {
        return oraclePriceToWad(oraclePrice(self.oracle));
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function _uintUSD(CollateralAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return oraclePrice(self.oracle).wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the collateral asset struct
     * @param _assetAmount the amount to convert
     */
    function _uintUSDRedstone(CollateralAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return redstonePrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function _uintUSD(KrAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return oraclePrice(self.oracle).wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     */
    function _uintUSDRedstone(KrAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return redstonePrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the collateral asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(CollateralAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return safePrice(oraclePrice(self.oracle), redstonePrice(self), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the kresko asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(KrAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return safePrice(oraclePrice(self.oracle), self.redstonePrice(), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone in USD
     * @param self the collateral asset struct
     * @param _assetAmount the amount to convert
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintUSD(
        CollateralAsset memory self,
        uint256 _assetAmount,
        uint256 _oracleDeviationPct
    ) internal view returns (uint256) {
        return safePrice(_uintUSD(self, _assetAmount), _uintUSDRedstone(self, _assetAmount), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone in USD
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return safePrice(_uintUSD(self, _assetAmount), _uintUSDRedstone(self, _assetAmount), _oracleDeviationPct);
    }
}
