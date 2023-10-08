// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable-next-line
import {AccessControlEnumerableUpgradeable} from "@oz-upgradeable/access/extensions/AccessControlEnumerableUpgradeable.sol";
import {PausableUpgradeable} from "@oz-upgradeable/utils/PausableUpgradeable.sol";
import {SafeERC20Upgradeable} from "vendor/SafeERC20Upgradeable.sol";
import {ERC20Upgradeable} from "vendor/ERC20Upgradeable.sol";
import {IERC165} from "vendor/IERC165.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {Percents} from "common/Constants.sol";
import {CError} from "common/CError.sol";
import {IKreskoAssetAnchor} from ".//IKreskoAssetAnchor.sol";
import {Role} from "common/Types.sol";
import {Rebaser} from "./Rebaser.sol";
import {IKreskoAsset, ISyncable} from "./IKreskoAsset.sol";

/**
 * @title Kresko Synthethic Asset - rebasing ERC20.
 * @author Kresko
 * @notice Rebases to adjust for stock splits and reverse stock splits
 * @notice Minting, burning and rebasing can only be performed by the `Role.OPERATOR`
 */

contract KreskoAsset is ERC20Upgradeable, AccessControlEnumerableUpgradeable, PausableUpgradeable, IKreskoAsset {
    using SafeERC20Upgradeable for ERC20Upgradeable;
    using SafeERC20Upgradeable for address payable;
    using Rebaser for uint256;
    using PercentageMath for uint256;

    Rebase private _rebaseInfo;
    address public kresko;
    bool public isRebased;
    address public anchor;
    address public underlying;
    uint8 public underlyingDecimals;
    uint48 public openFee;
    uint40 public closeFee;
    bool public nativeUnderlyingEnabled;
    address payable public feeRecipient;

    /// @inheritdoc IKreskoAsset

    /**
     * @notice Initialize, an external state-modifying function.
     * @dev Has modifiers: initializer.
     * @param _name The name (string).
     * @param _symbol The symbol (string).
     * @param _decimals The decimals (uint8).
     * @param _admin The admin address.
     * @param _kresko The kresko address.
     * @param _underlying The underlying address.
     * @param _feeRecipient The fee recipient address.
     * @param _openFee The open fee (uint48).
     * @param _closeFee The close fee (uint40).
     * @custom:signature initialize(string,string,uint8,address,address,address,address,uint48,uint40)
     * @custom:selector 0x71206626
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _admin,
        address _kresko,
        address _underlying,
        address _feeRecipient,
        uint48 _openFee,
        uint40 _closeFee
    ) external initializer {
        // ERC20
        __ERC20Upgradeable_init(_name, _symbol, _decimals);

        // Setup Pausing
        __Pausable_init();

        // Setup the admin
        _setupRole(Role.DEFAULT_ADMIN, msg.sender);
        _setupRole(Role.ADMIN, msg.sender);

        _setupRole(Role.DEFAULT_ADMIN, _admin);
        _setupRole(Role.ADMIN, _admin);

        // Setup the protocol
        _setupRole(Role.OPERATOR, _kresko);

        kresko = _kresko;

        setUnderlying(_underlying);
        setFeeRecipient(_feeRecipient);
        setOpenFee(_openFee);
        setCloseFee(_closeFee);
    }

    /// @inheritdoc IKreskoAsset
    function setAnchorToken(address _anchor) external onlyRole(Role.ADMIN) {
        if (_anchor == address(0)) revert CError.ZERO_ADDRESS();
        anchor = _anchor;
    }

    /// @inheritdoc IKreskoAsset
    function setUnderlying(address _underlyingAddr) public onlyRole(Role.ADMIN) {
        underlying = _underlyingAddr;
        if (_underlyingAddr != address(0)) {
            underlyingDecimals = ERC20Upgradeable(underlying).decimals();
        }
    }

    /// @inheritdoc IKreskoAsset
    function enableNativeUnderlying(bool _enabled) external onlyRole(Role.ADMIN) {
        nativeUnderlyingEnabled = _enabled;
    }

    /// @inheritdoc IKreskoAsset
    function setFeeRecipient(address _feeRecipient) public onlyRole(Role.ADMIN) {
        if (_feeRecipient == address(0)) revert CError.INVALID_FEE_RECIPIENT(address(this));
        feeRecipient = payable(_feeRecipient);
    }

    /// @inheritdoc IKreskoAsset
    function setOpenFee(uint48 _openFee) public onlyRole(Role.ADMIN) {
        if (_openFee > Percents.HUNDRED) revert CError.INVALID_FEE(_openFee, Percents.HUNDRED);
        openFee = _openFee;
    }

    /// @inheritdoc IKreskoAsset
    function setCloseFee(uint40 _closeFee) public onlyRole(Role.ADMIN) {
        if (_closeFee > Percents.HUNDRED) revert CError.INVALID_FEE(_closeFee, Percents.HUNDRED);
        closeFee = _closeFee;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Read                                    */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IERC165
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(AccessControlEnumerableUpgradeable, IERC165) returns (bool) {
        return (interfaceId != 0xffffffff &&
            (interfaceId == type(IKreskoAsset).interfaceId ||
                interfaceId == 0x01ffc9a7 ||
                interfaceId == 0x36372b07 ||
                super.supportsInterface(interfaceId)));
    }

    /// @inheritdoc IKreskoAsset
    function rebaseInfo() external view override returns (Rebase memory) {
        return _rebaseInfo;
    }

    /// @inheritdoc IKreskoAsset
    function totalSupply() public view override(ERC20Upgradeable, IKreskoAsset) returns (uint256) {
        return _totalSupply.rebase(_rebaseInfo);
    }

    /// @inheritdoc IKreskoAsset
    function balanceOf(address _account) public view override(ERC20Upgradeable, IKreskoAsset) returns (uint256) {
        return _balances[_account].rebase(_rebaseInfo);
    }

    /// @inheritdoc IKreskoAsset
    function allowance(
        address _owner,
        address _account
    ) public view override(ERC20Upgradeable, IKreskoAsset) returns (uint256) {
        return _allowances[_owner][_account];
    }

    /// @inheritdoc IKreskoAsset
    function pause() public onlyRole(Role.ADMIN) {
        _pause();
    }

    /// @inheritdoc IKreskoAsset
    function unpause() public onlyRole(Role.ADMIN) {
        _unpause();
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Write                                   */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IKreskoAsset
    function reinitializeERC20(
        string memory _name,
        string memory _symbol,
        uint8 _version
    ) external onlyRole(Role.ADMIN) reinitializer(_version) {
        __ERC20Upgradeable_init(_name, _symbol, decimals);
    }

    /// @inheritdoc IKreskoAsset
    function approve(address spender, uint256 amount) public override(ERC20Upgradeable, IKreskoAsset) returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @inheritdoc IKreskoAsset
    function transfer(address _to, uint256 _amount) public override(ERC20Upgradeable, IKreskoAsset) returns (bool) {
        return _transfer(msg.sender, _to, _amount);
    }

    /// @inheritdoc IKreskoAsset
    function transferFrom(
        address _from,
        address _to,
        uint256 _amount
    ) public override(ERC20Upgradeable, IKreskoAsset) returns (bool) {
        uint256 allowed = allowance(_from, msg.sender); // Saves gas for unlimited approvals.

        if (allowed != type(uint256).max) {
            if (_amount > allowed) revert CError.NO_ALLOWANCE(msg.sender, _from, _amount, allowed);
            _allowances[_from][msg.sender] -= _amount;
        }

        return _transfer(_from, _to, _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Restricted                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IKreskoAsset
    function rebase(uint256 _denominator, bool _positive, address[] calldata _pools) external onlyRole(Role.ADMIN) {
        if (_denominator < 1 ether) revert CError.INVALID_DENOMINATOR(_denominator, 1 ether);
        if (_denominator == 1 ether) {
            isRebased = false;
            _rebaseInfo = Rebase(false, 0);
        } else {
            isRebased = true;
            _rebaseInfo = Rebase(_positive, _denominator);
        }
        uint256 length = _pools.length;
        for (uint256 i; i < length; ) {
            ISyncable(_pools[i]).sync();
            unchecked {
                ++i;
            }
        }
    }

    /// @inheritdoc IKreskoAsset
    function mint(address _to, uint256 _amount) external onlyRole(Role.OPERATOR) {
        _mint(_to, _amount);
    }

    /// @inheritdoc IKreskoAsset
    function burn(address _from, uint256 _amount) external onlyRole(Role.OPERATOR) {
        _burn(_from, _amount);
    }

    /// @inheritdoc IKreskoAsset
    function wrap(address _to, uint256 _amount) external whenNotPaused {
        if (underlying == address(0)) {
            revert CError.WRAP_NOT_SUPPORTED();
        }

        ERC20Upgradeable(underlying).safeTransferFrom(msg.sender, address(this), _amount);

        if (openFee > 0) {
            uint256 fee = _amount.percentMul(openFee);
            _amount -= fee;
            ERC20Upgradeable(underlying).safeTransfer(address(feeRecipient), fee);
        }

        _amount = _adjustDecimals(_amount, underlyingDecimals, decimals);
        _mint(_to, _amount);

        IKreskoAssetAnchor(anchor).wrap(_amount);
    }

    /// @inheritdoc IKreskoAsset
    function unwrap(uint256 _amount, bool _receiveNative) external whenNotPaused {
        if (underlying == address(0)) {
            revert CError.WRAP_NOT_SUPPORTED();
        }
        uint256 adjustedAmount = _adjustDecimals(_amount, underlyingDecimals, decimals);

        _burn(msg.sender, adjustedAmount);
        IKreskoAssetAnchor(anchor).unwrap(adjustedAmount);
        bool allowNative = _receiveNative && nativeUnderlyingEnabled;

        if (closeFee > 0) {
            uint256 fee = _amount.percentMul(closeFee);
            _amount -= fee;

            if (!allowNative) {
                ERC20Upgradeable(underlying).safeTransfer(feeRecipient, fee);
            } else {
                feeRecipient.safeTransferETH(fee);
            }
        }
        if (!allowNative) {
            ERC20Upgradeable(underlying).safeTransfer(msg.sender, _amount);
        } else {
            payable(msg.sender).safeTransferETH(_amount);
        }
    }

    receive() external payable {
        if (!nativeUnderlyingEnabled) revert CError.NATIVE_TOKEN_DISABLED();

        uint256 amount = msg.value;
        if (amount == 0) revert CError.ZERO_AMOUNT(address(this));

        if (openFee > 0) {
            uint256 fee = amount.percentMul(openFee);
            amount -= fee;
            feeRecipient.safeTransferETH(fee);
        }

        _mint(msg.sender, amount);
        IKreskoAssetAnchor(anchor).wrap(amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internal                                  */
    /* -------------------------------------------------------------------------- */

    function _mint(address _to, uint256 _amount) internal override {
        uint256 normalizedAmount = _amount.unrebase(_rebaseInfo);
        unchecked {
            _totalSupply += normalizedAmount;
        }

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            _balances[_to] += normalizedAmount;
        }
        // Emit user input amount, not the maybe unrebased amount.
        emit Transfer(address(0), _to, _amount);
    }

    function _burn(address _from, uint256 _amount) internal override {
        uint256 normalizedAmount = _amount.unrebase(_rebaseInfo);

        _balances[_from] -= normalizedAmount;
        // Cannot underflow because a user's balance
        // will never be larger than the total supply.
        unchecked {
            _totalSupply -= normalizedAmount;
        }

        emit Transfer(_from, address(0), _amount);
    }

    function _adjustDecimals(uint256 _amount, uint8 _fromDecimal, uint8 _toDecimal) internal pure returns (uint256) {
        if (_fromDecimal == _toDecimal) return _amount;
        return
            _fromDecimal < _toDecimal
                ? _amount * (10 ** (_toDecimal - _fromDecimal))
                : _amount / (10 ** (_fromDecimal - _toDecimal));
    }

    /// @dev Internal balances are always unrebased, events emitted are not.
    function _transfer(address _from, address _to, uint256 _amount) internal returns (bool) {
        uint256 bal = balanceOf(_from);
        if (_amount > bal) revert CError.NOT_ENOUGH_BALANCE(_from, _amount, bal);
        uint256 normalizedAmount = _amount.unrebase(_rebaseInfo);

        _balances[_from] -= normalizedAmount;
        unchecked {
            _balances[_to] += normalizedAmount;
        }

        // Emit user input amount, not the maybe unrebased amount.
        emit Transfer(_from, _to, _amount);
        return true;
    }
}
