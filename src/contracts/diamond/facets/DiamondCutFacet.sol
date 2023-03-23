// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IDiamondCutFacet} from "../interfaces/IDiamondCutFacet.sol";
import {DiamondModifiers, Role} from "../../shared/Modifiers.sol";
import {initializeDiamondCut} from "../libs/LibDiamondCut.sol";
import {ds} from "../DiamondStorage.sol";

contract DiamondCutFacet is DiamondModifiers, IDiamondCutFacet {
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///  a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    ///                  _calldata is executed with delegatecall on _init
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override onlyRole(Role.OPERATOR) {
        ds().diamondCut(_diamondCut, _init, _calldata);
    }

    /// @notice Use an initializer contract without doing modifications
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    /// - _calldata is executed with delegatecall on _init
    function upgradeState(address _init, bytes calldata _calldata) external onlyRole(Role.OPERATOR) {
        initializeDiamondCut(_init, _calldata);
    }
}
