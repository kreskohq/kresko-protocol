// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;
/* solhint-disable no-global-import */
/* solhint-disable no-empty-blocks */
import "./AggregatorInterface.sol";
import "./FluxAggregatorV3Interface.sol";

interface IFluxPriceFeed is AggregatorInterface, FluxAggregatorV3Interface {}
