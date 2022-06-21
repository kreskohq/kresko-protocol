// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

import {Role} from "../shared/AccessControl.sol";
import "../shared/FP.sol" as FixedPoint;

import "./utils/ERC20Upgradeable.sol";
import {IKreskoAsset} from "./IKreskoAsset.sol";

/**
 * @title Kresko Synthethic Asset - a simple dynamic supply ERC20.
 * @author Kresko
 *
 * @notice Main purpose of this token is to act as the underlying for the `WrappedKreskoAsset`
 * Since this token will rebase eg. when a stock split happens
 *
 * @notice Minting and burning can only be performed by the `Role.OPERATOR`
 */
contract KreskoAsset is ERC20Upgradeable, AccessControlEnumerableUpgradeable, IKreskoAsset {
    using FixedPointMathLib for uint256;

    // keccak256("kresko.roles.asset.operator")
    bytes32 public constant OPERATOR_ROLE = 0x8952ae23cc3fea91b9dba0cefa16d18a26ca2bf124b54f42b5d04bce3aacecd2;

    address public kresko;

    uint256 public rate;

    /* -------------------------------------------------------------------------- */
    /*                               Initialization                               */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Initializes a KreskoAsset ERC20 token.
     * @dev Intended to be operated by the Kresko smart contract.
     * @param _name The name of the KreskoAsset.
     * @param _symbol The symbol of the KreskoAsset.
     * @param _decimals Decimals for the asset.
     * @param _owner The owner of this contract.
     * @param _kresko The mint/burn operator.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _owner,
        address _kresko
    ) external initializer {
        __ERC20Upgradeable_init(_name, _symbol, _decimals);
        __AccessControlEnumerable_init();
        _setupRole(Role.ADMIN, _owner);
        _setRoleAdmin(Role.OPERATOR, Role.ADMIN);
        _setupRole(Role.OPERATOR, _kresko);
        kresko = _kresko;
        rate = 1 ether;
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
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    function totalSupply() public view override returns (uint256) {
        return _totalSupply.mulWadDown(rate);
    }

    function balanceOf(address _account) public view override returns (uint256) {
        return _balances[_account].mulWadDown(rate);
    }

    function allowance(address _owner, address _account) public view override returns (uint256) {
        return _allowances[_owner][_account].mulWadDown(rate);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Updates the rate for conversions between fixed kresko asset
     * @param _rate conversion rate
     */
    function setRate(uint256 _rate) external onlyRole(Role.OPERATOR) {
        rate = _rate;
    }

    /**
     * @notice Mints tokens to an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to mint.
     */
    function mint(uint256 _amount) external onlyRole(Role.OPERATOR) {
        _mint(kresko, _amount);
    }

    /**
     * @notice Burns tokens from an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to burn.
     */
    function burn(uint256 _amount) external onlyRole(Role.OPERATOR) {
        _burn(kresko, _amount);
    }
}
