// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {ERC20} from "@rari-capital/solmate/src/tokens/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _initialSupply
    ) ERC20(_name, _symbol, _decimals) {
        _mint(msg.sender, _initialSupply);
    }

    function mint(address to, uint256 value) public virtual {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual {
        _burn(from, value);
    }
}
