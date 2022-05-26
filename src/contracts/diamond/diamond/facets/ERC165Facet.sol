// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {DS} from "../storage/DS.sol";
import {IERC165} from "../interfaces/IERC165.sol";

/// @title ERC165 compability
contract ERC165Facet is IERC165 {
    function supportsInterface(bytes4 _interfaceId) external view override returns (bool) {
        return DS.ds().supportedInterfaces[_interfaceId];
    }
}
