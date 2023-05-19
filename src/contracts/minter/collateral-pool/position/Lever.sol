// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {WadRay} from "kresko-helpers/libs/WadRay.sol";
import {Kresko} from "./Kresko.sol";
import {ILeverPositions} from "./ILeverPositions.sol";
import {KreskoIntegrator} from "./KreskoIntegrator.sol";

contract Lever is KreskoIntegrator {
    using WadRay for uint256;

    uint256 public maxLeverage;
    uint256 public liquidationThreshold;

    mapping(uint256 => ILeverPositions.Position) private _positions;

    function __Lever_init(
        address _kresko,
        uint256 _maxLeverage,
        uint256 _liquidationThreshold
    ) internal onlyInitializing {
        __KreskoIntegrator_init(_kresko);

        require(_liquidationThreshold <= 1e18, "!lt-too-lax");
        require(_liquidationThreshold >= 0.01e18, "!lt-too-aggressive");
        require(_maxLeverage <= 100e18, "!max-leverage-too-high");

        maxLeverage = _maxLeverage;
        liquidationThreshold = _liquidationThreshold;
    }

    function getLeverageOf(uint256 _id) public view returns (uint256) {
        uint256 collateralPrice = kresko.getPrice(_positions[_id].collateral);
        uint256 borrowedPrice = kresko.getPrice(_positions[_id].borrowed);
        return
            _positions[_id].borrowedAmount.wadMul(borrowedPrice).wadDiv(
                _positions[_id].collateralAmount.wadMul(collateralPrice)
            );
    }

    function getLiquidationRatio(uint256 _id) public view returns (uint256) {
        return _positions[_id].liquidationRatio;
    }

    function _isLiquidatable(uint256 _id) internal view returns (bool) {
        return getLeverageOf(_id) > getLiquidationRatio(_id);
    }

    function _isLiquidatableSafe(uint256 _id) internal view returns (bool) {
        return _getLeverageOfSafe(_id) > getLiquidationRatio(_id);
    }

    function _getLeverageOfSafe(uint256 _id) internal view returns (uint256) {
        uint256 collateralPrice = kresko.getPrice(_positions[_id].collateral);
        uint256 borrowedPrice = kresko.getPrice(_positions[_id].borrowed);
        if (collateralPrice == 0 || borrowedPrice == 0 || _positions[_id].borrowedAmount == 0) return 0;
        return
            _positions[_id].borrowedAmount.wadMul(borrowedPrice).wadDiv(
                _positions[_id].collateralAmount.wadMul(collateralPrice)
            );
    }

    function _createPosition(uint256 _id, ILeverPositions.Create calldata _params) internal {
        _positions[_id].collateral = _params.collateral;
        _positions[_id].borrowed = _params.borrowed;
        _positions[_id].account = _params.account;
        _positions[_id].creationTimestamp = block.timestamp;
        _adjustIn(_id, _params.collateralAmount, _params.borrowedAmount);
    }

    function _closePosition(uint256 _id) internal {
        ILeverPositions.Position memory position = _positions[_id];
        // _repay(_id, position.borrowedAmount);
        // _withdraw(_id, position.collateralAmount);
    }

    function _adjustIn(uint256 _id, uint256 _collateralIn, uint256 _debtIn) internal {
        _positions[_id].collateralAmount += _collateralIn;
        _positions[_id].borrowedAmount += _debtIn;

        uint256 leverage = getLeverageOf(_id);
        require(leverage <= maxLeverage, "!leverage-max");
        _positions[_id].liquidationRatio = leverage + liquidationThreshold;
    }

    function _adjustOut(uint256 _id, uint256 _collateralOut, uint256 _debtOut) internal {
        _positions[_id].collateralAmount -= _collateralOut;
        _positions[_id].borrowedAmount -= _debtOut;

        uint256 leverage = getLeverageOf(_id);
        require(leverage <= maxLeverage, "!leverage-max");
        _positions[_id].liquidationRatio = leverage + liquidationThreshold;
    }
}
