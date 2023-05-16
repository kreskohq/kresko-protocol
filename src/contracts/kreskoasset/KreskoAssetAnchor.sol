// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {Role} from "../libs/Authorization.sol";

import {IKreskoAssetIssuer} from "./IKreskoAssetIssuer.sol";
import {IKreskoAssetAnchor} from "./IKreskoAssetAnchor.sol";
import {ERC4626Upgradeable, IKreskoAsset} from "../shared/ERC4626Upgradeable.sol";

/* solhint-disable no-empty-blocks */

/**
 * @title Kresko Asset Anchor
 * Pro-rata representation of the underlying kresko asset.
 * Based on ERC-4626 by Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
 *
 * @notice Main purpose of this token is to represent a static amount of the possibly rebased underlying KreskoAsset.
 * Main use-cases are normalized book-keeping, bridging and integration with external contracts.
 *
 * @author Kresko
 */
contract KreskoAssetAnchor is ERC4626Upgradeable, AccessControlEnumerableUpgradeable {
    /* -------------------------------------------------------------------------- */
    /*                                 Immutables                                 */
    /* -------------------------------------------------------------------------- */
    constructor(IKreskoAsset _asset) payable ERC4626Upgradeable(_asset) {}

    /**
     * @notice Initializes the Kresko Asset Anchor.
     *
     * @param _asset The underlying (Kresko) Asset
     * @param _name Name of the anchor token
     * @param _symbol Symbol of the anchor token
     * @param _admin The adminstrator of this contract.
     * @dev Decimals are not supplied as they are read from the underlying Kresko Asset
     */
    function initialize(
        IKreskoAsset _asset,
        string memory _name,
        string memory _symbol,
        address _admin
    ) external initializer {
        // ERC4626
        __ERC4626Upgradeable_init(_asset, _name, _symbol);

        // This does nothing but doesn't hurt to make sure it's called
        __AccessControlEnumerable_init();

        // Default admin setup
        _setupRole(Role.DEFAULT_ADMIN, _admin);
        _setupRole(Role.ADMIN, _admin);

        _setupRole(Role.DEFAULT_ADMIN, msg.sender);
        _setupRole(Role.ADMIN, msg.sender);

        // Setup the operator, which is the protocol linked to the main asset
        _setupRole(Role.OPERATOR, asset.kresko());
    }

    /**
     * @notice ERC-165
     * - KreskoAssetAnchor, ERC20 and ERC-165 itself
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId != 0xffffffff &&
            (interfaceId == type(IKreskoAssetAnchor).interfaceId ||
                interfaceId == type(IKreskoAssetIssuer).interfaceId ||
                interfaceId == 0x01ffc9a7 ||
                interfaceId == 0x36372b07 ||
                super.supportsInterface(interfaceId));
    }

    /**
     * @notice Updates ERC20 metadata for the token in case eg. a ticker change
     * @param _name new name for the asset
     * @param _symbol new symbol for the asset
     * @param _version number that must be greater than latest emitted `Initialized` version
     */
    function reinitializeERC20(
        string memory _name,
        string memory _symbol,
        uint8 _version
    ) external onlyRole(Role.ADMIN) reinitializer(_version) {
        __ERC20Upgradeable_init(_name, _symbol, decimals);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Overwrites                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Track the underlying amount
     * @return Total supply for the underlying
     */
    function totalAssets() public view virtual override returns (uint256) {
        return asset.totalSupply();
    }

    /**
     * @notice Mints @param _assets of krAssets for @param _to,
     * @notice Mints relative @return _shares of wkrAssets
     */
    function issue(
        uint256 _assets,
        address _to
    ) public virtual override onlyRole(Role.OPERATOR) returns (uint256 shares) {
        shares = super.issue(_assets, _to);
    }

    /**
     * @notice Burns @param _assets of krAssets from @param _from,
     * @notice Burns relative @return _shares of wkrAssets
     */
    function destroy(
        uint256 _assets,
        address _from
    ) public virtual override onlyRole(Role.OPERATOR) returns (uint256 shares) {
        shares = super.destroy(_assets, _from);
    }

    /* -------------------------------------------------------------------------- */
    /*                            INTERNAL HOOKS LOGIC                            */
    /* -------------------------------------------------------------------------- */

    function _beforeWithdraw(uint256 assets, uint256 shares) internal virtual override {
        super._beforeWithdraw(assets, shares);
    }

    function _afterDeposit(uint256 assets, uint256 shares) internal virtual override {
        super._afterDeposit(assets, shares);
    }
}
