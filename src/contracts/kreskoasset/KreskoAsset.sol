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

import {IUniswapV2Pair} from "../vendor/uniswap/v2-core/interfaces/IUniswapV2Pair.sol";

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
     * @param _admin The adminstrator of this contract.
     * @param _kresko The protocol, can perform mint and burn.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _admin,
        address _kresko
    ) external initializer {
        // ERC20
        __ERC20Upgradeable_init(_name, _symbol, _decimals);

        // This does nothing but doesn't hurt to make sure it's called
        __AccessControlEnumerable_init();

        // Setup the admin
        _setupRole(Role.DEFAULT_ADMIN, msg.sender);
        _setupRole(Role.ADMIN, msg.sender);

        _setupRole(Role.DEFAULT_ADMIN, _admin);
        _setupRole(Role.ADMIN, _admin);

        // Setup the protocol
        _setupRole(Role.OPERATOR, _kresko);
        kresko = _kresko;
    }

    /**
     * @notice ERC-165
     * IKreskoAsset, ERC20 and ERC-165
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlEnumerableUpgradeable, IERC165) returns (bool) {
        return (interfaceId != 0xffffffff &&
            (interfaceId == type(IKreskoAsset).interfaceId ||
                interfaceId == 0x01ffc9a7 ||
                interfaceId == 0x36372b07 ||
                super.supportsInterface(interfaceId)));
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
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */

    /// @notice Returns the total supply of the token.
    /// @notice This amount is adjusted by rebases.
    function totalSupply() public view override returns (uint256) {
        return !isRebased ? _totalSupply : _totalSupply.rebase(rebaseInfo);
    }

    /// @notice Returns the balance of @param _account
    /// @notice This amount is adjusted by rebases.
    function balanceOf(address _account) public view override returns (uint256) {
        uint256 balance = _balances[_account];
        return !isRebased ? balance : balance.rebase(rebaseInfo);
    }

    /// @notice Returns the allowance from @param _owner to @param _account
    /// @notice This amount is adjusted by rebases.
    function allowance(address _owner, address _account) public view override returns (uint256) {
        return _allowances[_owner][_account];
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

    function transferFrom(address _from, address _to, uint256 _amount) public virtual override returns (bool) {
        uint256 allowed = allowance(_from, msg.sender); // Saves gas for unlimited approvals.

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
     * @param _pools UniswapV2Pair address to sync so we wont get rekt by skim() calls.
     * @dev denumerator values 0 and 1 ether will disable the rebase
     */
    function rebase(uint256 _denominator, bool _positive, address[] calldata _pools) external onlyRole(Role.ADMIN) {
        require(_denominator >= 1 ether, Error.REBASING_DENOMINATOR_LOW);
        if (_denominator == 1 ether) {
            isRebased = false;
            rebaseInfo = Rebase(false, 0);
        } else {
            isRebased = true;
            rebaseInfo = Rebase(_positive, _denominator);
        }
        uint256 length = _pools.length;
        for (uint256 i; i < length; ) {
            IUniswapV2Pair(_pools[i]).sync();
            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Mints tokens to an address.
     * @dev Only callable by operator.
     * @dev Internal balances are always unrebased, events emitted are not.
     * @param _to The address to mint tokens to.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _to, uint256 _amount) external onlyRole(Role.OPERATOR) {
        uint256 normalizedAmount = !isRebased ? _amount : _amount.unrebase(rebaseInfo);
        _totalSupply += normalizedAmount;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            _balances[_to] += normalizedAmount;
        }
        // Emit user input amount, not the maybe unrebased amount.
        emit Transfer(address(0), _to, _amount);
    }

    /**
     * @notice Burns tokens from an address.
     * @dev Only callable by operator.
     * @dev Internal balances are always unrebased, events emitted are not.
     * @param _from The address to burn tokens from.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external onlyRole(Role.OPERATOR) {
        uint256 normalizedAmount = !isRebased ? _amount : _amount.unrebase(rebaseInfo);

        _balances[_from] -= normalizedAmount;
        // Cannot underflow because a user's balance
        // will never be larger than the total supply.
        unchecked {
            _totalSupply -= normalizedAmount;
        }

        emit Transfer(_from, address(0), _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internal                                  */
    /* -------------------------------------------------------------------------- */

    /// @dev Internal balances are always unrebased, events emitted are not.
    function _transfer(address _from, address _to, uint256 _amount) internal returns (bool) {
        require(_amount <= balanceOf(_from), Error.NOT_ENOUGH_BALANCE);
        uint256 normalizedAmount = !isRebased ? _amount : _amount.unrebase(rebaseInfo);

        _balances[_from] -= normalizedAmount;
        unchecked {
            _balances[_to] += normalizedAmount;
        }

        // Emit user input amount, not the maybe unrebased amount.
        emit Transfer(_from, _to, _amount);
        return true;
    }
}
