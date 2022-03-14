pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract RewardToken is ERC20PresetMinterPauser {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supply
    ) ERC20PresetMinterPauser(_name, _symbol) {
        mint(msg.sender, _supply);
    }
}
