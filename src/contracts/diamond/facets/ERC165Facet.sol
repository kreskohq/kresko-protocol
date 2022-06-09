// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import {IERC165} from "../interfaces/IERC165.sol";
import {ds, DiamondState, Error} from "../storage/DiamondStorage.sol";
import "hardhat/console.sol";

contract ERC165Facet is IERC165 {
    /// @notice Basic ERC165 support
    /// @param _interfaceId interface id to support
    function supportsInterface(bytes4 _interfaceId) external view override returns (bool) {
        return ds().supportedInterfaces[_interfaceId];
    }

    /// @notice set or unset ERC165 using DiamondStorage.supportedInterfaces
    /// @param interfaceIds list of interface id to set as supported
    /// @param interfaceIdsToRemove list of interface id to unset as supported.
    /// Technically, you can remove support of ERC165 by having the IERC165 id itself being part of that array.
    function setERC165(bytes4[] calldata interfaceIds, bytes4[] calldata interfaceIdsToRemove) external {
        DiamondState storage s = ds();

        for (uint256 i = 0; i < interfaceIds.length; i++) {
            s.supportedInterfaces[interfaceIds[i]] = true;
        }

        for (uint256 i = 0; i < interfaceIdsToRemove.length; i++) {
            s.supportedInterfaces[interfaceIdsToRemove[i]] = false;
        }
    }
}