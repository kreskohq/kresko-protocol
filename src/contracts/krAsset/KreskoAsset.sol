// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

// solhint-disable-next-line
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";

import {Role} from "../libs/Authorization.sol";
import {Error} from "../libs/Errors.sol";

import {RebaseMath, Rebase} from "../shared/Rebase.sol";
import {ERC20Upgradeable} from "../shared/ERC20Upgradeable.sol";
import {IERC165} from "../shared/IERC165.sol";

import {IKreskoAsset} from "./IKreskoAsset.sol";

import "hardhat/console.sol";

/**
 * @title Kresko Synthethic Asset - rebasing ERC20.
 * @author Kresko
 *
 * @notice Rebases to adjust for stock splits and reverse stock splits
 *
 * @notice Minting, burning and rebasing can only be performed by the `Role.OPERATOR`
 */

contract KreskoAsset is ERC20Upgradeable, AccessControlEnumerableUpgradeable, IERC165 {
    using RebaseMath for uint256;

    bool public isRebased;
    address public kresko;
    Rebase public rebaseInfo;

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
     * @notice ERC-165
     * - IKreskoAsset, ERC20 and ERC-165 itself
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerableUpgradeable, IERC165)
        returns (bool)
    {
        return
            interfaceId != 0xffffffff &&
            (interfaceId == type(IKreskoAsset).interfaceId || interfaceId == 0x01ffc9a7 || interfaceId == 0x36372b07);
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
        return isRebased ? _totalSupply.rebase(rebaseInfo) : _totalSupply;
    }

    function balanceOf(address _account) public view override returns (uint256) {
        uint256 balance = _balances[_account];
        return isRebased ? balance.rebase(rebaseInfo) : balance;
    }

    function allowance(address _owner, address _account) public view override returns (uint256) {
        uint256 allowed = _allowances[_owner][_account];
        return isRebased ? allowed.rebase(rebaseInfo) : allowed;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Overrides                                 */
    /* -------------------------------------------------------------------------- */

    function approve(address spender, uint256 amount) public override returns (bool) {
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
     * @notice Perform a rebase, changing the denumerator and its operator
     * @param _denominator the denumerator for the operator, 1 ether = 1
     * @param _positive supply increasing/reducing rebase
     * @dev denumerator values 0 and 1 ether will disable the rebase
     */
    function rebase(uint256 _denominator, bool _positive) external onlyRole(Role.OPERATOR) {
        require(_denominator >= 1 ether, Error.REBASING_DENOMINATOR_LOW);
        if (_denominator == 1 ether) {
            isRebased = false;
            rebaseInfo = Rebase(false, 0);
        } else {
            isRebased = true;
            rebaseInfo = Rebase(_positive, _denominator);
        }
    }

    /**
     * @notice Mints tokens to an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external onlyRole(Role.OPERATOR) {
        _mint(_to, isRebased ? _amount.unrebase(rebaseInfo) : _amount);
    }

    /**
     * @notice Burns tokens from an address.
     * @dev Only callable by operator.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external onlyRole(Role.OPERATOR) {
        _burn(_from, isRebased ? _amount.unrebase(rebaseInfo) : _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internal                                  */
    /* -------------------------------------------------------------------------- */

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal returns (bool) {
        if (!isRebased) {
            _balances[_from] -= _amount;
            unchecked {
                _balances[_to] += _amount;
            }
        } else {
            uint256 balance = balanceOf(_from);
            require(_amount <= balance, Error.NOT_ENOUGH_BALANCE);

            _amount = _amount.unrebase(rebaseInfo);

            _balances[_from] -= _amount;
            unchecked {
                _balances[_to] += _amount;
            }
        }

        emit Transfer(_from, _to, _amount);
        return true;
    }
}
