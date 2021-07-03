// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Extension of {ERC20} that restricts token minting and burning
 * to the contract's owner. Tokens can be minted to any address, but
 * can only be burned from the owner's address.
 */
contract KreskoAsset is ERC20, Ownable {

    /**
     * @dev Constructor that instantiates an ERC20 token to back
     * the KreskoAsset
     * @param _name The name of the KreskoAsset
     * @param _symbol The symbol of the KreskoAsset
     */
    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {
      // Intentionally left blank
    }

    /**
     * @dev Mints tokens to any address
     * @param _account The recipient address of the intended mint
     * @param _amount The amount of tokens to be minted
     */
    function mint(address _account, uint256 _amount)
        public
        onlyOwner
    {
        _mint(_account, _amount);
    }

    /**
     * @dev Burns tokens from the owner's address
     * @param _amount The amount of tokens to be burned
     */
    function burn(uint256 _amount)
        public
        onlyOwner
    {
        _burn(owner(), _amount);
    }
}
