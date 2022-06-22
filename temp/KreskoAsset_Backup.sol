// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";

import {Role} from "../shared/AccessControl.sol";
import "../shared/FP.sol" as FixedPoint;
import "../shared/Errors.sol";

import "./utils/ERC20Upgradeable.sol";
import {IKreskoAsset} from "./IKreskoAsset.sol";

import "hardhat/console.sol";

/**
 * @title Kresko Synthethic Asset - a rebalancing ERC20.
 * @author Kresko
 *
 * @notice Main purpose of this token is to act as the underlying for the `FixedKreskoAsset`
 * - This token will rebalance eg. when a stock split happens
 *
 * @notice Minting and burning can only be performed by the `Role.OPERATOR`
 */

contract KreskoAsset is ERC20Upgradeable, AccessControlEnumerableUpgradeable, IKreskoAsset {
    using FixedPointMathLib for uint256;

    struct Rebalance {
        bool expand;
        uint256 rate;
    }

    bool public rebalanced;
    Rebalance public rebalance;
    address public kresko;

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

        return rebalance.expand ? _totalSupply.mulWadDown(rebalance.rate) : _totalSupply.divWadDown(rebalance.rate);
    }

    function balanceOf(address _account) public view override returns (uint256) {
        uint256 balance = _balances[_account];
        if (!rebalanced) return balance;

        return
            rebalance.expand
                ? _balances[_account].mulWadDown(rebalance.rate)
                : _balances[_account].divWadDown(rebalance.rate);
    }

    function allowance(address _owner, address _account) public view override returns (uint256) {
        uint256 allowed = _allowances[_owner][_account];
        if (!rebalanced) return allowed;

        return rebalance.expand ? allowed.mulWadUp(rebalance.rate) : allowed.divWadUp(rebalance.rate);
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
            if (rebalanced) {
                allowed = rebalance.expand ? allowed.mulWadUp(rebalance.rate) : allowed.divWadUp(rebalance.rate);
                unchecked {
                    require(_amount <= allowed, Error.NOT_ENOUGH_ALLOWANCE);
                }
            }
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
        if (_rate == 0 || _rate == 1) {
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
        if (!rebalanced) return _mint(_to, _amount);
        _mint(_to, rebalance.expand ? _amount.mulWadDown(rebalance.rate) : _amount.divWadUp(rebalance.rate));
    }

    /**
     * @notice Burns tokens from an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external onlyRole(Role.OPERATOR) {
        if (!rebalanced) return _burn(_from, _amount);
        _burn(_from, rebalance.expand ? _amount.mulWadDown(rebalance.rate) : _amount.divWadUp(rebalance.rate));
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internal                                  */
    /* -------------------------------------------------------------------------- */

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal returns (bool) {
        if (rebalanced) {
            uint256 balance = _balances[_from];
            uint256 rate = rebalance.rate;
            require(
                _amount <= (rebalance.expand ? balance.mulWadDown(rate) : balance.divWadDown(rate)),
                Error.NOT_ENOUGH_BALANCE
            );
        }

        _balances[_from] -= _amount;
        unchecked {
            _balances[_to] += _amount;
        }

        emit Transfer(_from, _to, _amount);
        return true;
    }
}
