// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import {IERC165Facet} from "diamond/interfaces/IERC165Facet.sol";
import {Role} from "common/Constants.sol";
import {ds, DiamondState} from "diamond/State.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {CModifiers} from "common/Modifiers.sol";

contract ERC165Facet is IERC165Facet, DSModifiers, CModifiers {
    /// @inheritdoc IERC165Facet
    function supportsInterface(bytes4 _interfaceId) external view override returns (bool) {
        return ds().supportedInterfaces[_interfaceId];
    }

    /// @inheritdoc IERC165Facet
    function setERC165(bytes4[] calldata interfaceIds, bytes4[] calldata interfaceIdsToRemove) external onlyRole(Role.ADMIN) {
        DiamondState storage s = ds();

        for (uint256 i = 0; i < interfaceIds.length; i++) {
            s.supportedInterfaces[interfaceIds[i]] = true;
        }

        for (uint256 i = 0; i < interfaceIdsToRemove.length; i++) {
            s.supportedInterfaces[interfaceIdsToRemove[i]] = false;
        }
    }
}
