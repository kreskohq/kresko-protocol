// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.19;
import {WadRay} from "../../../../libs/WadRay.sol";
import {pos, PositionStorage, Position} from "../state/PositionsStorage.sol";

library LibPositions {
    using WadRay for uint256;
    using LibPositions for PositionStorage;

    string internal constant INVALID_LT = "PC0";
    string internal constant INVALID_MAX_LEVERAGE = "PC1";
    string internal constant INVALID_KRESKO = "PC2";
    string internal constant ERROR_NOT_OWNER = "PC3";
    string internal constant ERROR_POSITION_NOT_OWNED_BY_CALLER = "PC4";
    string internal constant ERROR_POSITION_NOT_FOUND = "PC5";
    string internal constant INVALID_NAME = "PC6";
    string internal constant LEVERAGE_TOO_HIGH = "PC7";
    string internal constant LEVERAGE_TOO_LOW = "PC8";

    function getPosition(PositionStorage storage self, uint256 _id) internal view returns (Position memory) {
        return self.positions[_id];
    }

    function getLeverage(PositionStorage storage self, uint256 _id) internal view returns (uint256 leverage) {
        Position memory position = self.positions[_id];
        uint256 priceA = self.kresko.getPrice(position.assetA);
        uint256 priceB = self.kresko.getPrice(position.assetB);

        if (priceA == 0 || priceB == 0 || position.amountA == 0) return 0;

        return position.amountB.wadMul(priceB).wadDiv(position.amountA.wadMul(priceA));
    }

    function getRatio(PositionStorage storage self, uint256 _id) internal view returns (int256 ratio) {
        return int256(self.getLeverage(_id)) - int256(self.positions[_id].leverage);
    }

    function isLiquidatable(PositionStorage storage self, uint256 _id) internal view returns (bool) {
        return self.getRatio(_id) <= self.liquidationThreshold;
    }

    function isCloseable(PositionStorage storage self, uint256 _id) internal view returns (bool) {
        return self.getRatio(_id) >= self.closeThreshold;
    }

    function getAndIncrementNonce(PositionStorage storage self, uint256 id) internal returns (uint256) {
        return uint256(self.positions[id].nonce++);
    }
}
