// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DS} from "../storage/DS.sol";
import {IERC165} from "../interfaces/IERC165.sol";

contract ERC165Facet is IERC165 {
    // This implements ERC-165.
    function supportsInterface(bytes4 _interfaceId) external view override returns (bool) {
        DS.DsStorage storage s = DS.ds();
        return s.supportedInterfaces[_interfaceId];
    }
}
