// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

/**
 * @dev Extension of {ERC20} that restricts token minting and burning
 * to the contract's owner. Tokens can be minted to any address, but
 * can only be burned from the owner's address.
 */
contract KreskoAsset is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    /**
     * @notice Empty constructor, see `initialize`.
     * @dev Protects against a call to initialize when this contract is called directly without a proxy.
     */
    constructor() initializer {
        // solhint-disable-previous-line no-empty-blocks
        // Intentionally left blank.
    }

    /**
     * @notice Initializes a KreskoAsset ERC20 token.
     * @dev Intended to be owned by the Kresko smart contract.
     * @param _name The name of the KreskoAsset.
     * @param _symbol The symbol of the KreskoAsset.
     * @param _owner The owner of this contract.
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _owner
    ) external initializer {
        __ERC20_init(_name, _symbol);
        // Set msg.sender as owner so that transferOwnership can be called.
        __Ownable_init();
        transferOwnership(_owner);
    }

    /**
     * @notice Mints tokens to any address.
     * @dev Only callable by owner.
     * @param _account The recipient address of the mint.
     * @param _amount The amount of tokens to mint.
     */
    function mint(address _account, uint256 _amount) public onlyOwner {
        _mint(_account, _amount);
    }

    /**
     * @notice Burns tokens from the owner's address.
     * @dev Only callable by owner.
     * @param _amount The amount of tokens to burn.
     */
    function burn(uint256 _amount) public onlyOwner {
        _burn(owner(), _amount);
    }
}
