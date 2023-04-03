// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IERC165} from "../../shared/IERC165.sol";
import {Error} from "../../libs/Errors.sol";
import {DiamondModifiers, Role} from "../../shared/Modifiers.sol";

import {ds, DiamondState} from "../DiamondStorage.sol";

contract ERC165Facet is DiamondModifiers, IERC165 {
    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    /// @notice Basic ERC165 support
    /// @param _interfaceId interface id to support
    function supportsInterface(bytes4 _interfaceId) external view override returns (bool) {
        return ds().supportedInterfaces[_interfaceId];
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /// @notice set or unset ERC165 using DiamondStorage.supportedInterfaces
    /// @param interfaceIds list of interface id to set as supported
    /// @param interfaceIdsToRemove list of interface id to unset as supported.
    /// Technically, you can remove support of ERC165 by having the IERC165 id itself being part of that array.
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
