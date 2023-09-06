// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {IDiamondCutFacet} from "../interfaces/IDiamondCutFacet.sol";
import {Role} from "common/libs/Authorization.sol";
import {ds, initializeDiamondCut, DiamondModifiers} from "../libs/LibDiamond.sol";

/**
 * @title EIP2535-pattern upgrades.
 * @author Kresko
 * @notice The storage area is in the main proxy diamond storage.
 */
contract DiamondCutFacet is IDiamondCutFacet, DiamondModifiers {
    /// @inheritdoc IDiamondCutFacet
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external onlyRole(Role.ADMIN) {
        ds().diamondCut(_diamondCut, _init, _calldata);
    }

    /// @inheritdoc IDiamondCutFacet
    function upgradeState(address _init, bytes calldata _calldata) external onlyRole(Role.ADMIN) {
        initializeDiamondCut(_init, _calldata);
    }
}
