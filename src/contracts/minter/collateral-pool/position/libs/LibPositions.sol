// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {WadRay} from "../../../../libs/WadRay.sol";
import {pos, PositionStorage, Position} from "../state/PositionsStorage.sol";

library LibPositions {
    using WadRay for uint256;
    using LibPositions for PositionStorage;

    function getPosition(PositionStorage storage self, uint256 _id) internal view returns (Position memory) {
        return self.positions[_id];
    }

    function getLeverageOf(PositionStorage storage self, uint256 _id) internal view returns (uint256 leverage) {
        Position memory position = self.positions[_id];
        uint256 collateralPrice = self.kresko.getPrice(position.collateral);
        uint256 borrowedPrice = self.kresko.getPrice(position.borrowed);

        if (collateralPrice == 0 || borrowedPrice == 0 || position.borrowedAmount == 0) return 0;

        return position.borrowedAmount.wadMul(borrowedPrice).wadDiv(position.collateralAmount.wadMul(collateralPrice));
    }

    function getLiquidationRatio(PositionStorage storage self, uint256 _id) internal view returns (uint256) {
        return self.positions[_id].leverage + self.liquidationThreshold;
    }

    function isLiquidatable(PositionStorage storage self, uint256 _id) internal view returns (bool) {
        return self.getLeverageOf(_id) > self.getLiquidationRatio(_id);
    }

    function adjustIn(PositionStorage storage self, uint256 _id, uint256 _collateralIn, uint256 _debtIn) internal {
        self.positions[_id].collateralAmount += _collateralIn;
        self.positions[_id].borrowedAmount += _debtIn;
        _setLeverage(self, _id);
    }

    function adjustOut(PositionStorage storage self, uint256 _id, uint256 _collateralOut, uint256 _debtOut) internal {
        self.positions[_id].collateralAmount -= _collateralOut;
        self.positions[_id].borrowedAmount -= _debtOut;
        _setLeverage(self, _id);
    }

    function _setLeverage(PositionStorage storage self, uint256 _id) private {
        uint256 leverage = self.getLeverageOf(_id);
        require(leverage <= self.maxLeverage, "13");
        self.positions[_id].leverage = leverage;
    }
}
