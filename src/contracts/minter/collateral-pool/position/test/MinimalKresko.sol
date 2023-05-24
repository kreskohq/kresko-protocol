// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {IPositionsFacet} from "../interfaces/IPositionsFacet.sol";

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract MinimalKresko {
    IPositionsFacet positions;
    mapping(address => uint256) public prices;

    constructor(IPositionsFacet _positions) {
        positions = _positions;
    }
}
