// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {WadRay} from "../../../libs/WadRay.sol";
import {ILeverPositions} from "./ILeverPositions.sol";
import {KreskoIntegrator} from "./KreskoIntegrator.sol";

contract Lever is KreskoIntegrator {
    using WadRay for uint256;

    uint256 public maxLeverage;
    uint256 public liquidationThreshold;

    mapping(uint256 => ILeverPositions.Position) internal _positions;

    // solhint-disable-next-line func-name-mixedcase
    function __Lever_init(
        address _kresko,
        uint256 _maxLeverage,
        uint256 _liquidationThreshold
    ) internal onlyInitializing {
        __KreskoIntegrator_init_unchained(_kresko);

        maxLeverage = _maxLeverage;
        liquidationThreshold = _liquidationThreshold;
    }
}
