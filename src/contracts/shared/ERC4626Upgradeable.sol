// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

import "./SafeERC20Upgradeable.sol";
import "../krAsset/KreskoAsset.sol";

/* solhint-disable func-name-mixedcase */
/* solhint-disable no-empty-blocks */
/* solhint-disable func-visibility */

/// @notice Minimal ERC4626 tokenized Vault implementation.
/// @notice Kresko:
/// Removed redeem/mint functions and replaced with issuse/destroy which are only
/// used when protocol is issuing and destroying underlying kresko assets.
/// @author Solmate (https://github.com/Rari-Capital/solmate/blob/main/src/mixins/ERC4626.sol)
/// @author Kresko (https://www.kresko.fi)
abstract contract ERC4626Upgradeable is ERC20Upgradeable {
    using SafeERC20Upgradeable for KreskoAsset;
    using FixedPointMathLib for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event Issue(address indexed caller, address indexed owner, uint256 assets, uint256 shares);

    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);

    event Destroy(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    /* -------------------------------------------------------------------------- */
    /*                                 Immutables                                 */
    /* -------------------------------------------------------------------------- */

    KreskoAsset public immutable asset;

    constructor(KreskoAsset _asset) payable {
        asset = _asset;
    }

    function __ERC4626Upgradeable_init(
        ERC20Upgradeable _asset,
        string memory _name,
        string memory _symbol
    ) internal onlyInitializing {
        __ERC20Upgradeable_init(_name, _symbol, _asset.decimals());
    }

    /* -------------------------------------------------------------------------- */
    /*                                Issue & Destroy                             */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice When new KreskoAssets are burned:
     * Issues the equivalent amount of anchor tokens to Kresko
     * Issues the equivalent amount of assets to user
     */
    function issue(uint256 assets, address to) public virtual returns (uint256 shares) {
        require(msg.sender == asset.kresko(), Error.ISSUER_NOT_KRESKO);
        // Check for rounding error since we round down in previewDeposit.
        require((shares = previewIssue(assets)) != 0, "ZERO_SHARES");

        // Mint shares to kresko
        _mint(asset.kresko(), shares);
        // Mint assets to receiver
        asset.mint(to, assets);

        emit Issue(msg.sender, to, assets, shares);

        _afterDeposit(assets, shares);
    }

    /**
     * @notice When new KreskoAssets are burned:
     * Destroys the equivalent amount of anchor tokens from Kresko
     * Destorys the equivalent amount of assets from user
     */
    function destroy(uint256 assets, address from) public virtual returns (uint256 shares) {
        require(msg.sender == asset.kresko(), Error.REDEEMER_NOT_KRESKO);
        // Check for rounding error since we round down in previewDeposit.
        require((shares = previewDestroy(assets)) != 0, "ZERO_SHARES");

        _beforeWithdraw(assets, shares);

        // Burn shares from kresko
        _burn(asset.kresko(), shares);
        // Burn assets from user
        asset.burn(from, assets);

        emit Destroy(msg.sender, from, from, assets, shares);
    }

    /* -------------------------------------------------------------------------- */
    /*                              Accounting Logic                              */
    /* -------------------------------------------------------------------------- */

    /// @notice amount of KreskoAssets
    function totalAssets() public view virtual returns (uint256);

    /// @notice convert KreskoAsset amount to anchor amount
    function convertToShares(uint256 assets) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if totalSupply is non-zero.

        return supply == 0 ? assets : assets.mulDivUp(supply, totalAssets());
    }

    /// @notice convert anchor amount to KreskoAsset amount
    function convertToAssets(uint256 shares) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.

        return supply == 0 ? shares : shares.mulDivDown(totalAssets(), supply);
    }

    /// @notice amount shares for amount of @param assets
    function previewIssue(uint256 assets) public view virtual returns (uint256) {
        return convertToShares(assets);
    }

    /// @notice amount assets for amount of @param shares
    function previewDestroy(uint256 shares) public view virtual returns (uint256) {
        return convertToAssets(shares);
    }

    /// @notice amount shares for amount of @param assets
    function previewDeposit(uint256 shares) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.

        return supply == 0 ? shares : shares.mulDivDown(totalAssets(), supply);
    }

    /// @notice amount assets for amount of @param shares
    function previewWithdraw(uint256 assets) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.

        return supply == 0 ? assets : assets.mulDivUp(supply, totalAssets());
    }

    /* -------------------------------------------------------------------------- */
    /*                              LIMIT VIEWS                                   */
    /* -------------------------------------------------------------------------- */

    function maxIssue(address) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    function maxDestroy(address owner) public view virtual returns (uint256) {
        return convertToAssets(_balances[owner]);
    }

    function maxDeposit(address) public view virtual returns (uint256) {
        return type(uint256).max;
    }

    function maxWithdraw(address owner) public view virtual returns (uint256) {
        return _balances[owner];
    }

    /* -------------------------------------------------------------------------- */
    /*                            INTERNAL HOOKS                                  */
    /* -------------------------------------------------------------------------- */

    function _beforeWithdraw(uint256 assets, uint256 shares) internal virtual {}

    function _afterDeposit(uint256 assets, uint256 shares) internal virtual {}

    /* -------------------------------------------------------------------------- */
    /*                             EXTERNAL USE                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Deposits KreskoAssets, mints shares of anchor asset
     */
    function deposit(uint256 assets, address receiver) public virtual returns (uint256 shares) {
        // Check for rounding error since we round down in previewDeposit.
        require((shares = previewDeposit(assets)) != 0, "ZERO_SHARES");

        // Need to transfer before minting or ERC777s could reenter.
        asset.safeTransferFrom(msg.sender, address(this), assets);

        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);

        _afterDeposit(assets, shares);
    }

    /**
     * @notice Withdraws KreskoAssets, destroys shares of anchor asset
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual returns (uint256 shares) {
        shares = previewWithdraw(assets); // No need to check for rounding error, previewWithdraw rounds up.

        if (msg.sender != owner) {
            uint256 allowed = _allowances[owner][msg.sender]; // Saves gas for limited approvals.

            if (allowed != type(uint256).max) _allowances[owner][msg.sender] = allowed - shares;
        }

        _beforeWithdraw(assets, shares);

        _burn(owner, shares);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);

        asset.safeTransfer(receiver, assets);
    }
}
