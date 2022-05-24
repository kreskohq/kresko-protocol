// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {DS, DSModifiers} from "../storage/DS.sol";
import "hardhat/console.sol";

contract DiamondCutFacet is DSModifiers, IDiamondCut {
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///         a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    ///                  _calldata is executed with delegatecall on _init
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override onlyOwner {
        DS.diamondCut(_diamondCut, _init, _calldata);
    }
}
