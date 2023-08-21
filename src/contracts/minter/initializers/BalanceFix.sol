// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {ms} from "minter/MinterStorage.sol";
import {CollateralAsset} from "minter/MinterTypes.sol";
import {IFluxPriceFeed} from "vendor/flux/FluxPriceFeed.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";

contract BalanceFix {
    function initialize() external {
        ms().initializations += 1;
        ms().kreskoAssetDebt[0xB48bB6b68Ab4D366B4f9A30eE6f7Ee55125c2D9d][
            0x8520C6452fc3ce680Bd1635D5B994cCE6b36D3Be
        ] = 13 ether;
    }
}
