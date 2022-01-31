// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @dev Extension of {ERC20} that restricts token minting and burning
 * to the contract's owner. Tokens can be minted to any address, but
 * can only be burned from the owner's address.
 */
contract KreskoAsset is Initializable, ERC20Upgradeable, AccessControlEnumerableUpgradeable {
    /**
     * @notice Empty constructor, see `initialize`.
     * @dev Protects against a call to initialize when this contract is called directly without a proxy.
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
        // Intentionally left blank.
    }

    // keccak256("kresko.operator.role")
    bytes32 public constant OPERATOR_ROLE = 0x8952ae23cc3fea91b9dba0cefa16d18a26ca2bf124b54f42b5d04bce3aacecd2;

    /**
     * @notice Initializes a KreskoAsset ERC20 token.
     * @dev Intended to be operated by the Kresko smart contract.
     * @param _name The name of the KreskoAsset.
     * @param _symbol The symbol of the KreskoAsset.
     * @param _owner The owner of this contract.
     * @param _operator The mint/burn operator.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _operator
    ) external initializer {
        __ERC20_init(_name, _symbol);
        __AccessControlEnumerable_init();
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(OPERATOR_ROLE, _operator);
    }

    /**
     * @notice Mints tokens to an address.
     * @dev Only callable by operator.
     * @param _account The recipient address of the mint.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _account, uint256 _amount) external onlyRole(OPERATOR_ROLE) {
        _mint(_account, _amount);
    }

    /**
     * @notice Burns tokens from an address.
     * @dev Only callable by operator.
     * @param _account The address to burn tokens from.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _account, uint256 _amount) external onlyRole(OPERATOR_ROLE) {
        _burn(_account, _amount);
    }
}
