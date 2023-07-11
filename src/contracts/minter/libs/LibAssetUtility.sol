// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.20;
import {CollateralAsset, KrAsset} from "../MinterTypes.sol";
import {LibDecimals} from "../libs/LibDecimals.sol";
import {IKreskoAssetAnchor} from "../../kreskoasset/IKreskoAssetAnchor.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {Error} from "../../libs/Errors.sol";
import {LibRedstone} from "./LibRedstone.sol";
import {ms} from "../MinterStorage.sol";
import {AggregatorV3Interface} from "../../vendor/AggregatorV3Interface.sol";

/**
 * @title LibAssetUtility
 * @author Kresko
 * @notice Utility functions for KrAsset and CollateralAsset structs
 */
library LibAssetUtility {
    using WadRay for uint256;
    using LibDecimals for uint256;

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
        (, int256 answer, , uint256 updatedAt, ) = self.oracle.latestRoundData();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function redstonePrice(CollateralAsset memory self) internal view returns (uint256) {
        return LibRedstone.getPrice(self.redstoneId);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     */
    function uintPrice(KrAsset memory self) internal view returns (uint256) {
        (, int256 answer, , uint256 updatedAt, ) = self.oracle.latestRoundData();
        require(answer >= 0, Error.NEGATIVE_ORACLE_PRICE);
        // returning zero if oracle price is too old so that fallback oracle is used instead.
        if (block.timestamp - updatedAt > ms().oracleTimeout) {
            return 0;
        }
        return uint256(answer);
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with extOracleDecimals
     * @param self the kresko asset struct
     */
    function redstonePrice(KrAsset memory self) internal view returns (uint256) {
        return LibRedstone.getPrice(self.redstoneId);
    }

    /**
     * @notice Get the oracle price of a collateral asset in uint256 with 18 decimals
     */
    function wadPrice(CollateralAsset memory self) internal view returns (uint256) {
        return self.uintPrice().oraclePriceToWad();
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with 18 decimals
     */
    function wadPrice(KrAsset memory self) internal view returns (uint256) {
        return self.uintPrice().oraclePriceToWad();
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(CollateralAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.uintPrice().wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the collateral asset struct
     * @param _assetAmount the amount to convert
     */
    function uintUSDRedstone(CollateralAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.redstonePrice().wadMul(_assetAmount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.uintPrice().wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     */
    function uintUSDRedstone(KrAsset memory self, uint256 _assetAmount) internal view returns (uint256) {
        return self.redstonePrice().wadMul(_assetAmount);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the collateral asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(CollateralAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return _getPrice(self.uintPrice(), self.redstonePrice(), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone
     * @param self the kresko asset struct
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintPrice(KrAsset memory self, uint256 _oracleDeviationPct) internal view returns (uint256) {
        return _getPrice(self.uintPrice(), self.redstonePrice(), _oracleDeviationPct);
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
        return _getPrice(self.uintUSD(_assetAmount), self.uintUSDRedstone(_assetAmount), _oracleDeviationPct);
    }

    /**
     * @notice Get Aggregrated price from chainlink oracle and redstone in USD
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function uintUSD(
        KrAsset memory self,
        uint256 _assetAmount,
        uint256 _oracleDeviationPct
    ) internal view returns (uint256) {
        return _getPrice(self.uintUSD(_assetAmount), self.uintUSDRedstone(_assetAmount), _oracleDeviationPct);
    }

    /**
     * @notice check the price and return it
     * @notice reverts if the price deviates more than `_oracleDeviationPct`
     * @param _chainlinkPrice chainlink price
     * @param _redstonePrice redstone price
     * @param _oracleDeviationPct the deviation percentage to use for the oracle
     */
    function _getPrice(
        uint256 _chainlinkPrice,
        uint256 _redstonePrice,
        uint256 _oracleDeviationPct
    ) internal view returns (uint256) {
        if (ms().sequencerUptimeFeed != address(0)) {
            (, int256 answer, uint256 startedAt, , ) = AggregatorV3Interface(ms().sequencerUptimeFeed)
                .latestRoundData();
            bool isSequencerUp = answer == 0;
            if (!isSequencerUp) {
                return _redstonePrice;
            }
            // Make sure the grace period has passed after the
            // sequencer is back up.
            uint256 timeSinceUp = block.timestamp - startedAt;
            if (timeSinceUp <= ms().sequencerGracePeriodTime) {
                return _redstonePrice;
            }
        }
        if (_chainlinkPrice == 0) return _redstonePrice;
        if (_redstonePrice == 0) return _chainlinkPrice;
        if (
            (_redstonePrice.wadMul(1 ether - _oracleDeviationPct) <= _chainlinkPrice) &&
            (_redstonePrice.wadMul(1 ether + _oracleDeviationPct) >= _chainlinkPrice)
        ) return _chainlinkPrice;

        // Revert if price deviates more than `_oracleDeviationPct`
        revert(Error.ORACLE_PRICE_UNSTABLE);
    }
}
