// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {ds} from "diamond/DState.sol";
import {Errors} from "common/Errors.sol";
import {Auth} from "common/Auth.sol";
import {Role, Constants, Enums} from "common/Constants.sol";
import {Asset} from "common/Types.sol";
import {cs, gm, CommonState} from "common/State.sol";
import {WadRay} from "libs/WadRay.sol";
import {scdp} from "scdp/SState.sol";
import {IPyth} from "vendor/pyth/IPyth.sol";

library LibModifiers {
    /// @dev Simple check for the enabled flag
    /// @param _assetAddr The address of the asset.
    /// @param _action The action to this is called from.
    /// @return asset The asset struct.
    function onlyUnpaused(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        if (self.safetyStateSet && self.safetyState[_assetAddr][_action].pause.enabled) {
            revert Errors.ASSET_PAUSED_FOR_THIS_ACTION(Errors.id(_assetAddr), uint8(_action));
        }
        return self.assets[_assetAddr];
    }

    function onlyExistingAsset(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (!asset.exists()) {
            revert Errors.ASSET_DOES_NOT_EXIST(Errors.id(_assetAddr));
        }
    }

    /**
     * @notice Reverts if address is not a minter collateral asset.
     * @param _assetAddr The address of the asset.
     * @return asset The asset struct.
     */
    function onlyMinterCollateral(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (!asset.isMinterCollateral) {
            revert Errors.ASSET_NOT_MINTER_COLLATERAL(Errors.id(_assetAddr));
        }
    }

    function onlyMinterCollateral(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        asset = onlyUnpaused(self, _assetAddr, _action);
        if (!asset.isMinterCollateral) {
            revert Errors.ASSET_NOT_MINTER_COLLATERAL(Errors.id(_assetAddr));
        }
    }

    /**
     * @notice Reverts if address is not a Kresko Asset.
     * @param _assetAddr The address of the asset.
     * @return asset The asset struct.
     */
    function onlyMinterMintable(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (!asset.isMinterMintable) {
            revert Errors.ASSET_NOT_MINTABLE_FROM_MINTER(Errors.id(_assetAddr));
        }
    }

    function onlyMinterMintable(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        asset = onlyUnpaused(self, _assetAddr, _action);
        if (!asset.isMinterMintable) {
            revert Errors.ASSET_NOT_MINTABLE_FROM_MINTER(Errors.id(_assetAddr));
        }
    }

    /**
     * @notice Reverts if address is not depositable to SCDP.
     * @param _assetAddr The address of the asset.
     * @return asset The asset struct.
     */
    function onlySharedCollateral(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (!asset.isSharedCollateral) {
            revert Errors.ASSET_NOT_SHARED_COLLATERAL(Errors.id(_assetAddr));
        }
    }

    /**
     * @notice Reverts if asset is not the feeAsset and does not have any shared fees accumulated.
     * @notice Assets that pass this are guaranteed to never have a zero liquidity index.
     * @param _assetAddr The address of the asset.
     * @return asset The asset struct.
     */
    function onlyFeeAccumulatingCollateral(
        CommonState storage self,
        address _assetAddr
    ) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (
            !asset.isSharedCollateral ||
            (_assetAddr != scdp().feeAsset && scdp().assetIndexes[_assetAddr].currFeeIndex <= WadRay.RAY)
        ) {
            revert Errors.ASSET_NOT_FEE_ACCUMULATING_ASSET(Errors.id(_assetAddr));
        }
    }

    function onlyFeeAccumulatingCollateral(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        asset = onlyUnpaused(self, _assetAddr, _action);
        if (
            !asset.isSharedCollateral ||
            (_assetAddr != scdp().feeAsset && scdp().assetIndexes[_assetAddr].currFeeIndex <= WadRay.RAY)
        ) {
            revert Errors.ASSET_NOT_FEE_ACCUMULATING_ASSET(Errors.id(_assetAddr));
        }
    }

    /**
     * @notice Reverts if address is not swappable Kresko Asset.
     * @param _assetAddr The address of the asset.
     * @return asset The asset struct.
     */
    function onlySwapMintable(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (!asset.isSwapMintable) {
            revert Errors.ASSET_NOT_SWAPPABLE(Errors.id(_assetAddr));
        }
    }

    function onlySwapMintable(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        asset = onlyUnpaused(self, _assetAddr, _action);
        if (!asset.isSwapMintable) {
            revert Errors.ASSET_NOT_SWAPPABLE(Errors.id(_assetAddr));
        }
    }

    /**
     * @notice Reverts if address does not have any deposits.
     * @param _assetAddr The address of the asset.
     * @return asset The asset struct.
     * @dev This is used to check if an asset has any deposits before removing it.
     */
    function onlyActiveSharedCollateral(
        CommonState storage self,
        address _assetAddr
    ) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (scdp().assetIndexes[_assetAddr].currFeeIndex == 0) {
            revert Errors.ASSET_DOES_NOT_HAVE_DEPOSITS(Errors.id(_assetAddr));
        }
    }

    function onlyActiveSharedCollateral(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        asset = onlyUnpaused(self, _assetAddr, _action);
        if (scdp().assetIndexes[_assetAddr].currFeeIndex == 0) {
            revert Errors.ASSET_DOES_NOT_HAVE_DEPOSITS(Errors.id(_assetAddr));
        }
    }

    function onlyCoverAsset(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        asset = self.assets[_assetAddr];
        if (!asset.isCoverAsset) {
            revert Errors.ASSET_CANNOT_BE_USED_TO_COVER(Errors.id(_assetAddr));
        }
    }

    function onlyCoverAsset(
        CommonState storage self,
        address _assetAddr,
        Enums.Action _action
    ) internal view returns (Asset storage asset) {
        asset = onlyUnpaused(self, _assetAddr, _action);
        if (!asset.isCoverAsset) {
            revert Errors.ASSET_CANNOT_BE_USED_TO_COVER(Errors.id(_assetAddr));
        }
    }

    function onlyIncomeAsset(CommonState storage self, address _assetAddr) internal view returns (Asset storage asset) {
        if (_assetAddr != scdp().feeAsset) revert Errors.NOT_SUPPORTED_YET();
        asset = onlyActiveSharedCollateral(self, _assetAddr);
        if (!asset.isSharedCollateral) revert Errors.ASSET_NOT_FEE_ACCUMULATING_ASSET(Errors.id(_assetAddr));
    }
}

contract Modifiers {
    /**
     * @dev Modifier that checks if the contract is initializing and if so, gives the caller the ADMIN role
     */
    modifier initializeAsAdmin() {
        if (ds().initializing != Constants.INITIALIZING) revert Errors.NOT_INITIALIZING();
        if (!Auth.hasRole(Role.ADMIN, msg.sender)) {
            Auth._grantRole(Role.ADMIN, msg.sender);
            _;
            Auth._revokeRole(Role.ADMIN, msg.sender);
        } else {
            _;
        }
    }
    /**
     * @dev Modifier that checks that an account has a specific role. Reverts
     * with a standardized message including the required role.
     *
     * The format of the revert reason is given by the following regular expression:
     *
     *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
     *
     * _Available since v4.1._
     */
    modifier onlyRole(bytes32 role) {
        Auth.checkRole(role);
        _;
    }

    /**
     * @notice Check for role if the condition is true.
     * @param _shouldCheckRole Should be checking the role.
     */
    modifier onlyRoleIf(bool _shouldCheckRole, bytes32 role) {
        if (_shouldCheckRole) {
            Auth.checkRole(role);
        }
        _;
    }

    modifier nonReentrant() {
        if (cs().entered == Constants.ENTERED) {
            revert Errors.CANNOT_RE_ENTER();
        }
        cs().entered = Constants.ENTERED;
        _;
        cs().entered = Constants.NOT_ENTERED;
    }

    /// @notice Reverts if the caller does not have the required NFT's for the gated phase
    modifier gate(address _account) {
        if (address(gm().manager) != address(0)) {
            gm().manager.check(_account);
        }
        _;
    }

    modifier usePyth(bytes[] calldata _updateData) {
        if (_updateData.length > 0) {
            IPyth pyth = IPyth(cs().pythEp);
            pyth.updatePriceFeeds{value: pyth.getUpdateFee(_updateData)}(_updateData);
        }
        _;
    }
    modifier usePythMem(bytes[] memory _updateData) {
        if (_updateData.length > 0) {
            IPyth pyth = IPyth(cs().pythEp);
            pyth.updatePriceFeeds{value: pyth.getUpdateFee(_updateData)}(_updateData);
        }
        _;
    }
}
