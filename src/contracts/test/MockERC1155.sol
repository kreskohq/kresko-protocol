//SPDX-License-Identifier: AGPL-3.0-only

pragma solidity >=0.8.19;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
    constructor() ERC1155("https://test") {
        _mint(msg.sender, 0, 1, "");
    }
}
