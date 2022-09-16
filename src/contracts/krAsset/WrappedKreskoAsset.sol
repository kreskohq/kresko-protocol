// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";
import {SafeTransferLib} from "@rari-capital/solmate/src/utils/SafeTransferLib.sol";

import {Role} from "../libs/Authorization.sol";

import {IWrappedKreskoAsset} from "./IWrappedKreskoAsset.sol";
import {ERC4626Upgradeable, KreskoAsset} from "../shared/ERC4626Upgradeable.sol";

/* solhint-disable no-empty-blocks */

/**
 * @title Kresko Asset Wrapper - pro-rata representation of the underlying kresko asset.
 * Based on ERC-4626 by Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
 * @author Kresko
 *
 * @notice Main purpose of this token is to provide a stable balance for the underlying kresko asset.
 * This enables easier integration with external contracts.
 */
contract WrappedKreskoAsset is ERC4626Upgradeable, AccessControlEnumerableUpgradeable {
    /* -------------------------------------------------------------------------- */
    /*                                 Immutables                                 */
    /* -------------------------------------------------------------------------- */
    constructor(KreskoAsset _asset) payable ERC4626Upgradeable(_asset) {}

    function initialize(
        KreskoAsset _asset,
        string memory _name,
        string memory _symbol,
        address _owner
    ) external initializer {
        __ERC4626Upgradeable_init(_asset, _name, _symbol);
        __AccessControlEnumerable_init();
        _setupRole(Role.ADMIN, _owner);
        _setRoleAdmin(Role.OPERATOR, Role.ADMIN);
        _setupRole(Role.OPERATOR, asset.kresko());
    }

    /**
     * @notice ERC-165
     * - WrappedKreskoAsset, ERC20 and ERC-165 itself
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId != 0xffffffff &&
            (interfaceId == type(IWrappedKreskoAsset).interfaceId ||
                interfaceId == 0x01ffc9a7 ||
                interfaceId == 0x36372b07);
    }

    /**
     * @notice Updates metadata for the token in case eg. ticker change
     * @param _name new name for the asset
     * @param _symbol new symbol for the asset
     * @param _version number that must be greater than latest emitted `Initialized` version
     */
    function updateMetaData(
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

    function issue(uint256 _assets, address _to) public virtual override returns (uint256 shares) {
        shares = super.issue(_assets, _to);
    }

    function destroy(uint256 _assets, address _from) public virtual override returns (uint256 shares) {
        shares = super.destroy(_assets, _from);
    }

    // function withdraw(
    //     uint256 _assets,
    //     address _receiver,
    //     address _owner
    // ) public virtual override returns (uint256 shares) {
    //     shares = super.withdraw(_assets, _receiver, _owner);
    // }

    // function redeem(
    //     uint256 _shares,
    //     address _receiver,
    //     address _owner
    // ) public virtual override returns (uint256 assets) {
    //     assets = super.redeem(_shares, _receiver, _owner);
    // }

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
