pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract Token is ERC20PresetMinterPauser {
    uint8 private _decimals;

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supply,
        uint8 _dec
    ) ERC20PresetMinterPauser(_name, _symbol) {
        mint(msg.sender, _supply);
        _decimals = _dec;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address _to, uint256 _amount) public override {
        // just allow all minting
        _mint(_to, _amount);
    }
}
