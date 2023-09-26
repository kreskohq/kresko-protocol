// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {Role} from "common/Types.sol";
import {CModifiers} from "common/Modifiers.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {ds} from "diamond/State.sol";
import {FacetCut} from "diamond/Types.sol";
import {DSModifiers} from "diamond/Modifiers.sol";
import {initializeDiamondCut} from "diamond/funcs/Cuts.sol";

/**
 * @title EIP2535-pattern upgrades.
 * @author Kresko
 * @notice The storage area is in the main proxy diamond storage.
 */
contract DiamondCutFacet is IDiamondCutFacet, DSModifiers, CModifiers {
    /// @inheritdoc IDiamondCutFacet
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external onlyRole(Role.ADMIN) {
        ds().cut(_diamondCut, _init, _calldata);
    }

    /// @inheritdoc IDiamondCutFacet
    function upgradeState(address _init, bytes calldata _calldata) external onlyRole(Role.ADMIN) {
        initializeDiamondCut(_init, _calldata);
    }
}
