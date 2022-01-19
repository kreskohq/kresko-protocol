// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "./AggregatorInterface.sol";
import "./AggregatorV3Interface.sol";

interface AggregatorV2V3Interface is AggregatorInterface, AggregatorV3Interface {}
