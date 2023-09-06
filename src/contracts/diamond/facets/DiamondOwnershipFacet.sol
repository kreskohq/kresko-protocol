// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {IDiamondOwnershipFacet} from "../interfaces/IDiamondOwnershipFacet.sol";
import {ds, DiamondModifiers} from "../libs/LibDiamond.sol";

contract DiamondOwnershipFacet is IDiamondOwnershipFacet, DiamondModifiers {
    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IDiamondOwnershipFacet
    function transferOwnership(address _newOwner) external override {
        ds().initiateOwnershipTransfer(_newOwner);
    }

    /// @inheritdoc IDiamondOwnershipFacet
    function acceptOwnership() external override {
        ds().finalizeOwnershipTransfer();
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IDiamondOwnershipFacet
    function owner() external view override returns (address owner_) {
        return ds().contractOwner;
    }

    /// @inheritdoc IDiamondOwnershipFacet
    function pendingOwner() external view override returns (address pendingOwner_) {
        return ds().pendingOwner;
    }

    /// @inheritdoc IDiamondOwnershipFacet
    function initialized() external view returns (bool initialized_) {
        return ds().initialized;
    }
}
