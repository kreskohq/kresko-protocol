// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {LibRedstone} from "common/libs/LibRedstone.sol";
import {IKreskoAssetAnchor} from "kresko-asset/IKreskoAssetAnchor.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {safePrice, oraclePrice, oraclePriceToWad} from "common/Functions.sol";
import {WadRay} from "common/libs/WadRay.sol";

using Assets for KrAsset global;
using Assets for CollateralAsset global;
/**
 * @notice Information on a token that is a KreskoAsset.
 * @dev Each KreskoAsset has 18 decimals.
 * @param kFactor The k-factor used for calculating the required collateral value for KreskoAsset debt.
 * @param oracle The oracle that provides the USD price of one KreskoAsset.
 * @param supplyLimit The total supply limit of the KreskoAsset.
 * @param anchor The anchor address
 * @param closeFee The percentage paid in fees when closing a debt position of this type.
 * @param openFee The percentage paid in fees when opening a debt position of this type.
 * @param exists Whether the KreskoAsset exists within the protocol.
 */

struct KrAsset {
    uint256 kFactor;
    AggregatorV3Interface oracle;
    uint256 supplyLimit;
    address anchor;
    uint256 closeFee;
    uint256 openFee;
    bool exists;
    bytes32 redstoneId;
}

/**
 * @notice Information on a token that can be used as collateral.
 * @dev Setting the factor to zero effectively makes the asset useless as collateral while still allowing
 * it to be deposited and withdrawn.
 * @param factor The collateral factor used for calculating the value of the collateral.
 * @param oracle The oracle that provides the USD price of one collateral asset.
 * @param anchor If the collateral is a KreskoAsset, the anchor address
 * @param decimals The decimals for the token, stored here to avoid repetitive external calls.
 * @param exists Whether the collateral asset exists within the protocol.
 * @param liquidationIncentive The liquidation incentive for the asset
 */
struct CollateralAsset {
    uint256 factor;
    AggregatorV3Interface oracle;
    address anchor;
    uint8 decimals;
    bool exists;
    uint256 liquidationIncentive;
    bytes32 redstoneId;
}

library Assets {
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
    function toNonRebasingAmount(
        CollateralAsset memory self,
        uint256 _maybeRebasedAmount
    ) internal view returns (uint256) {
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
    function uintPrice(CollateralAsset memory self) private view returns (uint256) {
        return oraclePrice(self.oracle);
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
    function uintPrice(KrAsset memory self) private view returns (uint256) {
        return oraclePrice(self.oracle);
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
    function wadPrice(CollateralAsset memory self) private view returns (uint256) {
        return oraclePriceToWad(oraclePrice(self.oracle));
    }

    /**
     * @notice Get the oracle price of a kresko asset in uint256 with 18 decimals
     */
    function wadPrice(KrAsset memory self) private view returns (uint256) {
        return oraclePriceToWad(oraclePrice(self.oracle));
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(CollateralAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return oraclePrice(self.oracle).wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the collateral asset struct
     * @param _assetAmount the amount to convert
     */
    function uintUSDRedstone(CollateralAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return redstonePrice(self).wadMul(_assetAmount);
    }

    /**
     * @notice Get value for @param _assetAmount of @param self in uint256
     */
    function uintUSD(KrAsset memory self, uint256 _assetAmount) private view returns (uint256) {
        return oraclePrice(self.oracle).wadMul(_assetAmount);
    }

    /**
     * @notice Get Redstone value for @param _assetAmount of @param self in uint256
     * @param self the kresko asset struct
     * @param _assetAmount the amount to convert
     */
    function uintUSDRedstone(KrAsset memory self, uint256 _assetAmount) private view returns (uint256) {
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
        return safePrice(uintUSD(self, _assetAmount), uintUSDRedstone(self, _assetAmount), _oracleDeviationPct);
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
        return safePrice(uintUSD(self, _assetAmount), uintUSDRedstone(self, _assetAmount), _oracleDeviationPct);
    }
}
