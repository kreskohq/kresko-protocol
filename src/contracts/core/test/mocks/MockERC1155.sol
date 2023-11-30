//SPDX-License-Identifier: AGPL-3.0-only

pragma solidity 0.8.21;

import {ERC1155} from "@oz/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
    string public name;
    string public symbol;
    string internal __contractUri;

    constructor(string memory _name, string memory _symbol, string memory _contractUri, string memory _uri) ERC1155(_uri) {
        name = _name;
        symbol = _symbol;
        __contractUri = _contractUri;
    }

    function mint(address account, uint256 id, uint256 amount) external {
        _mint(account, id, amount, "");
    }

    function contractURI() public view returns (string memory) {
        return __contractUri;
    }
}
