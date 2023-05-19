// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {ILeverPositions} from "./ILeverPositions.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract Kresko {
    ILeverPositions leverPositions;
    mapping(address => uint256) public prices;

    constructor(ILeverPositions _leverPositions) {
        leverPositions = _leverPositions;
    }

    function getPrice(address _asset) external view returns (uint256) {
        return prices[_asset];
    }

    function setPrice(address _asset, uint256 _amount) external {
        prices[_asset] = _amount;
    }

    function createPosition(
        address _account,
        address _asset,
        address _borrowed,
        uint256 _collateralAmount,
        uint256 _borrowedAmount
    ) external returns (uint256) {
        IERC20(_asset).transferFrom(msg.sender, address(this), _collateralAmount);
        return
            leverPositions.createPosition(
                ILeverPositions.Create({
                    account: _account,
                    collateral: _asset,
                    borrowed: _borrowed,
                    collateralAmount: _collateralAmount,
                    borrowedAmount: _borrowedAmount
                })
            );
    }
}
