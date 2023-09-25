// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Redstone} from "libs/Redstone.sol";
import {WadRay} from "libs/WadRay.sol";
import {safePrice, oraclePriceToWad, pushPrice} from "common/funcs/Prices.sol";
import {PushPrice} from "common/Types.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {ms} from "minter/State.sol";
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
    /*                                   Prices                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the price from the oracles
     * @return uint256 List of oracle prices.
     */
    function price(CollateralAsset memory self) internal view returns (uint256) {
        return safePrice(self.id, self.oracles, ms().oracleDeviationPct);
    }

    /**
     * @notice gets the price from the oracles
     * @return uint256 List of oracle prices.
     */
    function price(KrAsset memory self) internal view returns (uint256) {
        return safePrice(self.id, self.oracles, ms().oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the collateral asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function price(CollateralAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return safePrice(self.id, self.oracles, _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the kresko asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function price(KrAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return safePrice(self.id, self.oracles, _oracleDeviationPct);
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with 18 decimals
     */
    function wadPrice(CollateralAsset memory self) private view returns (uint256) {
        return oraclePriceToWad(self.price());
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with 18 decimals
     */
    function wadPrice(KrAsset memory self) private view returns (uint256) {
        return oraclePriceToWad(self.price());
    }

    /**
     * @notice Gets the push price from the oracles
     * @return uint256 Push-oracle price
     */
    function pushedPrice(CollateralAsset memory self) internal view returns (PushPrice memory) {
        return pushPrice(self.oracles, self.id);
    }

    /**
     * @notice Gets the push price from the oracles
     * @return uint256 Push-oracle price
     */
    function pushedPrice(KrAsset memory self) internal view returns (PushPrice memory) {
        return pushPrice(self.oracles, self.id);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Price Utils                                */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(CollateralAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.price().wadMul(_assetAmount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.price().wadMul(_assetAmount);
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
        return self.price(_oracleDeviationPct).wadMul(_assetAmount);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone in USD
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return self.price(_oracleDeviationPct).wadMul(_assetAmount);
    }

    function marketStatus(KrAsset memory self) internal pure returns (bool) {
        return true;
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function redstonePrice(CollateralAsset memory self) internal view returns (uint256) {
        return Redstone.getPrice(self.id);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     * @param self the kresko asset struct
     */
    function redstonePrice(KrAsset memory self) internal view returns (uint256) {
        return Redstone.getPrice(self.id);
    }
}
