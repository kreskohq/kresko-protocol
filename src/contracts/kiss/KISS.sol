// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "./interfaces/IKISSConverter.sol";

/* solhint-disable not-rely-on-time */

/**
 * @title Kresko Integrated Stable System (TEST)
 * @author Kresko
 */
contract KISS is ERC20PresetMinterPauser {
    bytes32 public constant OPERATOR_ROLE = keccak256("kresko.kiss.operator");
    uint256 public constant OPERATOR_ROLE_PERIOD = 1 minutes; // testnet

    /* -------------------------------------------------------------------------- */
    /*                                   Layout                                   */
    /* -------------------------------------------------------------------------- */

    // AccessControl
    uint256 public operatorRoleTimestamp;
    address public pendingOperator;
    address public kresko;

    // ERC20
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */
    event NewMinterInitiated(address pendingNewMinter, uint256 unlockTimestamp);
    event NewMinter(address newMinter);

    /* -------------------------------------------------------------------------- */
    /*                                   Writes                                   */
    /* -------------------------------------------------------------------------- */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 dec_,
        address kresko_
    ) ERC20PresetMinterPauser(name_, symbol_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = dec_;
        kresko = kresko_;

        // AccessControl
        // 1. Setup admin
        // 2. Kresko protocol can mint
        // 3. Remove unnecessary MINTER_ROLE from multisig
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OPERATOR_ROLE, kresko_);
        _revokeRole(MINTER_ROLE, _msgSender());
    }

    /**
     * @notice Allows OPERATOR_ROLE to mint tokens
     *
     * @param _to address to mint tokens to
     * @param _amount amount to mint
     */
    function mint(address _to, uint256 _amount) public override onlyRole(OPERATOR_ROLE) {
        require(msg.sender.code.length > 0, "KISS: EOA");
        _mint(_to, _amount);
    }

    /**
     * @notice Allows OPERATOR_ROLE to burn tokens
     *
     * @param _from address to burn tokens from
     * @param _amount amount to burn
     */
    function burn(address _from, uint256 _amount) external onlyRole(OPERATOR_ROLE) {
        require(msg.sender.code.length > 0, "KISS: EOA");
        _burn(_from, _amount);
    }

    /**
     * @notice Overrides `AccessControl.grantRole` for following:
     * * Implement a cooldown period of `OPERATOR_ROLE_PERIOD` minutes for setting a new OPERATOR_ROLE
     * * Limited to 2 role members (Converter & Kresko)
     * * EOA cannot be granted the operator role
     *
     * @notice OPERATOR_ROLE can still be revoked without this cooldown period
     * @notice PAUSER_ROLE can still be granted without this cooldown period
     * @param _role role to grant
     * @param _to address to grant role for
     */
    function grantRole(bytes32 _role, address _to)
        public
        override(AccessControl, IAccessControl)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        // Handle OPERATOR_ROLE explicitly
        if (_role == OPERATOR_ROLE) {
            require(_to.code.length > 0, "KISS: EOA");
            if (pendingOperator != address(0)) {
                // Ensure cooldown period

                require(operatorRoleTimestamp < block.timestamp, "KISS: !OPERATOR_ROLE_PERIOD");
                // Grant role
                _grantRole(OPERATOR_ROLE, pendingOperator);
                emit NewMinter(_msgSender());
                // Reset pending owner
                // No need to touch the timestamp (next call will just trigger the cooldown period)
                pendingOperator = address(0);
            } else if (operatorRoleTimestamp != 0) {
                // Do not allow more than 2 minters
                require(getRoleMemberCount(OPERATOR_ROLE) <= 1, "KISS: !minterRevoked");
                // Set the timestamp for the cooldown period
                operatorRoleTimestamp = block.timestamp + OPERATOR_ROLE_PERIOD;
                // Set the pending minter, execution to upper clause next call
                pendingOperator = _to;
                emit NewMinterInitiated(_to, operatorRoleTimestamp);
            } else {
                // Initialize converter
                _grantRole(OPERATOR_ROLE, _to);
                emit NewMinter(_to);
                // Set the timestamp, execution is not coming here again
                operatorRoleTimestamp = block.timestamp;
            }
        } else {
            // Default behavior
            _grantRole(_role, _to);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Testnet                                 */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Switch metadata
     * @param _newName new token name
     * @param _newSymbol new token symbol
     */

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

    function setMetadata(string memory _newName, string memory _newSymbol) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _name = _newSymbol;
        _symbol = _newName;
    }
}
