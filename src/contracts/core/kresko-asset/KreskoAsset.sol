// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable-next-line
import {AccessControlEnumerableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import {SafeERC20Upgradeable} from "vendor/SafeERC20Upgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {ERC20Upgradeable} from "vendor/ERC20Upgradeable.sol";
import {IERC165} from "vendor/IERC165.sol";
import {IKreskoAssetAnchor} from ".//IKreskoAssetAnchor.sol";
import {Error} from "common/Errors.sol";
import {Role} from "common/Types.sol";
import {Rebaser} from "./Rebaser.sol";
import {WadRay} from "libs/WadRay.sol";
import {IKreskoAsset, ISyncable} from "./IKreskoAsset.sol";

import {console} from "hardhat/console.sol";

/**
 * @title Kresko Synthethic Asset - rebasing ERC20.
 * @author Kresko
 *
 * @notice Rebases to adjust for stock splits and reverse stock splits
 *
 * @notice Minting, burning and rebasing can only be performed by the `Role.OPERATOR`
 */

contract KreskoAsset is ERC20Upgradeable, AccessControlEnumerableUpgradeable, PausableUpgradeable, IKreskoAsset {
    using SafeERC20Upgradeable for ERC20Upgradeable;
    using Rebaser for uint256;
    using WadRay for uint256;

    Rebase private _rebaseInfo;
    address public kresko;
    bool public isRebased;
    address public anchor;
    address public token;
    uint8 public tokenDecimals;
    bool public nativeTokenEnabled;
    address payable public feeRecipient;
    uint256 public openFee;
    uint256 public closeFee;

    /// @inheritdoc IKreskoAsset
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _admin,
        address _kresko,
        address _token,
        uint8 _tokenDecimals,
        address _feeReipient,
        uint256 _openFee,
        uint256 _closeFee
    ) external initializer {
        // ERC20
        __ERC20Upgradeable_init(_name, _symbol, _decimals);

        // Setup Pausing
        __Pausable_init();

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
        token = _token;
        tokenDecimals = _tokenDecimals;

        require(_feeReipient != address(0), Error.ZERO_ADDRESS);
        feeRecipient = payable(_feeReipient);

        require(_openFee <= 1 ether, "fee-high");
        openFee = _openFee;

        require(_closeFee <= 1 ether, "fee-high");
        closeFee = _closeFee;
    }

    /**
     * @notice Sets anchor token address
     * @dev Has modifiers: onlyRole.
     * @param _anchor The anchor address.
     */
    function setAnchorToken(address _anchor) external onlyRole(Role.ADMIN) {
        anchor = _anchor;
    }

    /**
     * @notice Enables depositing native token ETH in case of krETH
     * @dev Has modifiers: onlyRole.
     * @param _enabled The enabled (bool).
     */
    function enableNativeToken(bool _enabled) external onlyRole(Role.ADMIN) {
        nativeTokenEnabled = _enabled;
    }

    /**
     * @notice Sets fee recipient address
     * @dev Has modifiers: onlyRole.
     * @param _feeRecipient The fee recipient address.
     */
    function setFeeRecipient(address _feeRecipient) external onlyRole(Role.ADMIN) {
        require(_feeRecipient != address(0), Error.ADDRESS_INVALID_FEERECIPIENT);
        feeRecipient = payable(_feeRecipient);
    }

    /**
     * @notice Sets deposit fee
     * @dev Has modifiers: onlyRole.
     * @param _openFee The open fee (uint256).
     */
    function setOpenFee(uint256 _openFee) external onlyRole(Role.ADMIN) {
        require(_openFee <= 1 ether, "fee-high");
        openFee = _openFee;
    }

    /**
     * @notice Sets withdraw fee
     * @dev Has modifiers: onlyRole.
     * @param _closeFee The open fee (uint256).
     */
    function setCloseFee(uint256 _closeFee) external onlyRole(Role.ADMIN) {
        require(_closeFee <= 1 ether, "fee-high");
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
            require(_amount <= allowed, Error.NOT_ENOUGH_ALLOWANCE);
            _allowances[_from][msg.sender] -= _amount;
        }

        return _transfer(_from, _to, _amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                 Restricted                                 */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IKreskoAsset
    function rebase(uint256 _denominator, bool _positive, address[] calldata _pools) external onlyRole(Role.ADMIN) {
        require(_denominator >= 1 ether, Error.REBASING_DENOMINATOR_LOW);
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
    function deposit(address _to, uint256 _amount) external whenNotPaused {
        require(token != address(0), Error.ZERO_ADDRESS);
        ERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 fee = _calcOpenFee(_amount);
        if (fee != 0) {
            _amount -= fee;
            ERC20Upgradeable(token).safeTransfer(address(feeRecipient), fee);
        }

        _amount = _adjustDecimals(_amount, tokenDecimals, decimals);
        _mint(_to, _amount);
        IKreskoAssetAnchor(anchor).mint(_amount);
    }

    /// @inheritdoc IKreskoAsset
    function withdraw(uint256 _amount, bool _receiveNativeToken) external whenNotPaused {
        uint256 adjustedAmount = _adjustDecimals(_amount, tokenDecimals, decimals);
        _burn(msg.sender, adjustedAmount);
        IKreskoAssetAnchor(anchor).burn(adjustedAmount);

        uint256 fee = _calcCloseFee(_amount);

        if (fee != 0) {
            _amount -= fee;
        }

        if (_receiveNativeToken && nativeTokenEnabled) {
            if (fee != 0) {
                SafeERC20Upgradeable.safeTransferETH(feeRecipient, fee);
            }
            SafeERC20Upgradeable.safeTransferETH(msg.sender, _amount);
        } else {
            require(token != address(0), Error.ZERO_ADDRESS);
            if (fee != 0) {
                ERC20Upgradeable(token).safeTransfer(feeRecipient, fee);
            }
            ERC20Upgradeable(token).safeTransfer(msg.sender, _amount);
        }
    }

    receive() external payable {
        require(nativeTokenEnabled, "native token disabled");
        require(msg.value != 0, "zero-value");

        uint256 amount = msg.value;

        uint256 fee = _calcOpenFee(amount);
        if (fee != 0) {
            amount -= fee;
            SafeERC20Upgradeable.safeTransferETH(feeRecipient, fee);
        }

        _mint(msg.sender, amount);
        IKreskoAssetAnchor(anchor).mint(amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internal                                  */
    /* -------------------------------------------------------------------------- */

    function _mint(address _to, uint256 _amount) internal override {
        uint256 normalizedAmount = _amount.unrebase(_rebaseInfo);
        _totalSupply += normalizedAmount;

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

    function _calcOpenFee(uint256 _amount) internal view returns (uint256) {
        return _amount.wadMul(openFee);
    }

    function _calcCloseFee(uint256 _amount) internal view returns (uint256) {
        return _amount.wadMul(closeFee);
    }

    function _adjustDecimals(uint256 _amount, uint8 _fromDecimal, uint8 _toDecimal) internal pure returns (uint256) {
        return
            _fromDecimal <= _toDecimal
                ? _amount * (10 ** (_toDecimal - _fromDecimal))
                : _amount / (10 ** (_fromDecimal - _toDecimal));
    }

    /// @dev Internal balances are always unrebased, events emitted are not.
    function _transfer(address _from, address _to, uint256 _amount) internal returns (bool) {
        require(_amount <= balanceOf(_from), Error.NOT_ENOUGH_BALANCE);
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
