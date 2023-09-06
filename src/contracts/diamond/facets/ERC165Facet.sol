// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {IERC165Facet} from "../interfaces/IERC165Facet.sol";
import {Role} from "common/libs/Authorization.sol";
import {ds, DiamondState, DiamondModifiers} from "../libs/LibDiamond.sol";

contract ERC165Facet is IERC165Facet, DiamondModifiers {
    /// @inheritdoc IERC165Facet
    function supportsInterface(bytes4 _interfaceId) external view override returns (bool) {
        return ds().supportedInterfaces[_interfaceId];
    }

    /// @inheritdoc IERC165Facet
    function setERC165(
        bytes4[] calldata interfaceIds,
        bytes4[] calldata interfaceIdsToRemove
    ) external onlyRole(Role.ADMIN) {
        DiamondState storage s = ds();

        for (uint256 i = 0; i < interfaceIds.length; i++) {
            s.supportedInterfaces[interfaceIds[i]] = true;
        }

        for (uint256 i = 0; i < interfaceIdsToRemove.length; i++) {
            s.supportedInterfaces[interfaceIdsToRemove[i]] = false;
        }
    }
}
