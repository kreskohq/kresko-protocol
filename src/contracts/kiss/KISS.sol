// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.14;

import {ERC20PresetMinterPauser, AccessControl, IAccessControl} from "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

import {IKreskoAssetIssuer} from "../kreskoasset/IKreskoAssetIssuer.sol";
import {IKISS} from "./interfaces/IKISS.sol";
import {Role} from "../libs/Authorization.sol";
import {Error} from "../libs/Errors.sol";

/* solhint-disable not-rely-on-time */

/**
 * @title Kresko Integrated Stable System
 * This is a non-rebasing Kresko Asset, intended to be paired to a stable-value underlying.
 * @author Kresko
 */
contract KISS is IKISS, IKreskoAssetIssuer, ERC20PresetMinterPauser {
    bytes32 public constant OPERATOR_ROLE = 0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd;

    modifier onlyContract() {
        require(msg.sender.code.length > 0, Error.CALLER_NOT_CONTRACT);
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Layout                                   */
    /* -------------------------------------------------------------------------- */

    uint256 public pendingOperatorWaitPeriod;
    uint256 public pendingOperatorUnlockTime;
    uint256 public maxOperators;
    address public pendingOperator;
    address public kresko;

    // ERC20
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */
    event NewOperatorInitialized(address indexed pendingNewOperator, uint256 unlockTimestamp);
    event NewOperator(address indexed newOperator);
    event NewMaxOperators(uint256 newMaxOperators);
    event NewPendingOperatorWaitPeriod(uint256 newPeriod);

    /* -------------------------------------------------------------------------- */
    /*                                   Writes                                   */
    /* -------------------------------------------------------------------------- */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 dec_,
        address admin_,
        address kresko_
    ) ERC20PresetMinterPauser(name_, symbol_) {
        // Few sanity checks, we do not want EOA's here
        require(kresko_.code.length > 0, Error.KRESKO_NOT_CONTRACT);
        // require(admin_.code.length > 0, Error.ADMIN_NOT_A_CONTRACT);

        // ERC20
        _name = name_;
        _symbol = symbol_;
        _decimals = dec_;
        kresko = kresko_;

        // 2 operators needed at the time of writing, the volative market and the stable market.
        maxOperators = 2;

        // 15 minutes to wait before the operator can accept the role, this is the minimum value that can be set.
        pendingOperatorWaitPeriod = 15 minutes;

        // Setup the admin
        _setupRole(Role.DEFAULT_ADMIN, admin_);
        _setupRole(Role.ADMIN, admin_);

        // Setup the protocol
        kresko = kresko_;
        _setupRole(Role.OPERATOR, kresko_);
        _setupRole(MINTER_ROLE, kresko_);
        _setupRole(PAUSER_ROLE, kresko_);

        // Deployer does not need roles, uncomment for mainnet
        renounceRole(MINTER_ROLE, msg.sender);
        renounceRole(PAUSER_ROLE, msg.sender);
        // renounceRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return
            interfaceId != 0xffffffff &&
            (interfaceId == type(IKISS).interfaceId ||
                interfaceId == type(IKreskoAssetIssuer).interfaceId ||
                interfaceId == 0x01ffc9a7 ||
                interfaceId == 0x36372b07);
    }

    /**
     * @notice This function adds KISS to circulation
     * Caller must be a contract and have the OPERATOR_ROLE
     * @param _to address to mint tokens to
     * @param _amount amount to mint
     */
    function issue(
        uint256 _amount,
        address _to
    ) public override onlyContract onlyRole(Role.OPERATOR) returns (uint256) {
        _mint(_to, _amount);
        return _amount;
    }

    /**
     * @notice Use operator role for minting, so override the parent
     * Caller must be a contract and have the OPERATOR_ROLE
     * @param _to address to mint tokens to
     * @param _amount amount to mint
     * @dev Does not return a value
     */
    function mint(address _to, uint256 _amount) public override onlyContract onlyRole(Role.OPERATOR) {
        _mint(_to, _amount);
    }

    /**
     * @notice This function removes KISS from circulation
     * Caller must be a contract and have the OPERATOR_ROLE
     * @param _from address to burn tokens from
     * @param _amount amount to burn
     */
    function destroy(uint256 _amount, address _from) external onlyContract onlyRole(Role.OPERATOR) returns (uint256) {
        _burn(_from, _amount);
        return _amount;
    }

    /**
     * @notice Allows ADMIN_ROLE to perform a pause
     */
    function pause() public override onlyContract onlyRole(Role.ADMIN) {
        _pause();
    }

    /**
     * @notice Allows ADMIN_ROLE to unpause
     */
    function unpause() public override onlyContract onlyRole(Role.ADMIN) {
        _unpause();
    }

    /**
     * @notice Set a new waiting period for a new operator
     *
     * Must be at least 15 minutes
     *
     * @param _newPeriod the period, in seconds
     */
    function setPendingOperatorWaitPeriod(uint256 _newPeriod) external onlyRole(Role.ADMIN) {
        require(_newPeriod >= 15 minutes, Error.OPERATOR_WAIT_PERIOD_TOO_SHORT);
        pendingOperatorWaitPeriod = _newPeriod;
        emit NewPendingOperatorWaitPeriod(_newPeriod);
    }

    /**
     * @notice Allows ADMIN_ROLE to change the maximum operators
     * @param _maxOperators new maximum amount of operators
     */
    function setMaxOperators(uint256 _maxOperators) external onlyRole(Role.ADMIN) {
        maxOperators = _maxOperators;
        emit NewMaxOperators(_maxOperators);
    }

    /**
     * @notice Overrides `AccessControl.grantRole` for following:
     * * Implement a cooldown period of `pendingOperatorWaitPeriod` minutes for setting a new OPERATOR_ROLE
     * * EOA cannot be granted the operator role
     *
     * @notice OPERATOR_ROLE can still be revoked without this cooldown period
     * @notice PAUSER_ROLE can still be granted without this cooldown period
     * @param _role role to grant
     * @param _to address to grant role for
     */
    function grantRole(bytes32 _role, address _to) public override(AccessControl, IAccessControl) onlyRole(Role.ADMIN) {
        // Default behavior
        if (_role != Role.OPERATOR) {
            _grantRole(_role, _to);
            return;
        }

        // Handle the operator role
        require(_to.code.length > 0, Error.OPERATOR_NOT_CONTRACT);
        if (pendingOperator != address(0)) {
            // Ensure cooldown period
            require(pendingOperatorUnlockTime < block.timestamp, Error.OPERATOR_WAIT_PERIOD_NOT_OVER);
            // Grant role
            _grantRole(Role.OPERATOR, pendingOperator);
            emit NewOperator(_msgSender());
            // Reset pending owner
            // No need to touch the timestamp (next call will just trigger the cooldown period)
            pendingOperator = address(0);
        } else if (pendingOperatorUnlockTime != 0) {
            // Do not allow more than `maxOperators` of operators
            require(getRoleMemberCount(Role.OPERATOR) < maxOperators, Error.OPERATOR_LIMIT_REACHED);
            // Set the timestamp for the cooldown period
            pendingOperatorUnlockTime = block.timestamp + pendingOperatorWaitPeriod;
            // Set the pending oeprator, execution to upper if clause next call as this pending operator is set
            pendingOperator = _to;
            emit NewOperatorInitialized(_to, pendingOperatorUnlockTime);
        } else {
            // Initialize operator for the first time
            _grantRole(Role.OPERATOR, _to);
            emit NewOperator(_to);
            // Set the timestamp, execution will not come here again
            pendingOperatorUnlockTime = block.timestamp;
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    /**
     * KreskoAssetIssuer compability
     * @param assets amount of assets
     * @return shares with kiss, this is equal to assets as there is no rebasing
     */
    function convertToShares(uint256 assets) external pure returns (uint256) {
        return assets;
    }

    /**
     * KreskoAssetIssuer compability
     * @param shares amount of shares
     * @return assets with kiss, this is equal to shares as there is no rebasing
     */
    function convertToAssets(uint256 shares) external pure returns (uint256) {
        return shares;
    }
}
