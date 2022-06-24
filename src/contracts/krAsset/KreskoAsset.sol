// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import {Role} from "../shared/AccessControl.sol";
import "../shared/Errors.sol";

import {RebalanceMath, Rebalance} from "./utils/Rebalance.sol";
import "./utils/ERC20Upgradeable.sol";
import {IKreskoAsset} from "./IKreskoAsset.sol";

import "hardhat/console.sol";

/**
 * @title Kresko Synthethic Asset - rebalancing ERC20.
 * @author Kresko
 *
 * @notice Main purpose of this token is to act as the underlying for the `WrappedKreskoAsset`
 * - This token will rebalance eg. when a stock split happens
 *
 * @notice Minting, burning and rebalancing can only be performed by the `Role.OPERATOR`
 */

contract KreskoAsset is ERC20Upgradeable, AccessControlEnumerableUpgradeable, IKreskoAsset {
    using RebalanceMath for uint256;

    bool public rebalanced;
    address public kresko;
    Rebalance public rebalance;

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
        if (!rebalanced) return _totalSupply;

        return _totalSupply.rebalance(rebalance);
    }

    function balanceOf(address _account) public view override returns (uint256) {
        uint256 balance = _balances[_account];
        if (!rebalanced) return balance;

        return balance.rebalance(rebalance);
    }

    function allowance(address _owner, address _account) public view override returns (uint256) {
        uint256 allowed = _allowances[_owner][_account];
        if (!rebalanced) return allowed;

        return allowed.rebalance(rebalance);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */

    /* -------------------------------------------------------------------------- */
    /*                                  Overrides                                 */
    /* -------------------------------------------------------------------------- */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _allowances[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address _to, uint256 _amount) public override returns (bool) {
        return _transfer(msg.sender, _to, _amount);
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) public virtual override returns (bool) {
        uint256 allowed = _allowances[_from][msg.sender]; // Saves gas for unlimited approvals.

        if (allowed != type(uint256).max) {
            require(_amount <= allowed, Error.NOT_ENOUGH_ALLOWANCE);
            _allowances[_from][msg.sender] -= _amount;
        }

        return _transfer(_from, _to, _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Restricted                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Updates the rate for conversions between fixed kresko asset
     * @param _rate conversion rate
     */
    function setRebalance(uint256 _rate, bool _expand) external onlyRole(Role.OPERATOR) {
        if (_rate == 0 || _rate == 1 ether) {
            rebalanced = false;
        } else {
            rebalanced = true;
            rebalance = Rebalance(_expand, _rate);
        }
    }

    /**
     * @notice Mints tokens to an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external onlyRole(Role.OPERATOR) {
        _mint(_to, !rebalanced ? _amount : _amount.rebalance(rebalance));
    }

    /**
     * @notice Burns tokens from an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external onlyRole(Role.OPERATOR) {
        _burn(_from, !rebalanced ? _amount : _amount.rebalance(rebalance));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internal                                  */
    /* -------------------------------------------------------------------------- */

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal returns (bool) {
        if (!rebalanced) {
            _balances[_from] -= _amount;
            unchecked {
                _balances[_to] += _amount;
            }
        } else {
            uint256 balance = balanceOf(_from);
            require(_amount <= balance, Error.NOT_ENOUGH_BALANCE);

            _amount = _amount.rebalanceReverse(rebalance);

            _balances[_from] -= _amount;
            unchecked {
                _balances[_to] += _amount;
            }
        }

        emit Transfer(_from, _to, _amount);
        return true;
    }
}
