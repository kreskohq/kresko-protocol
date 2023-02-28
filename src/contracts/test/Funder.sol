pragma solidity >=0.8.14;

import "./MockERC20.sol";
import "./WETH.sol";
import {MockKresko} from "../MockKresko.sol";
import {FixedPoint} from "../minter/MinterTypes.sol";
/* solhint-disable no-empty-blocks */

struct Token {
    uint256 amount;
    address token;
}

contract Funder {
    mapping(address => bool) public owners;
    mapping(address => bool) public funded;
    MockKresko public kresko;

    event Funded(address indexed account);

    constructor(address _kresko) {
        owners[msg.sender] = true;
        kresko = MockKresko(_kresko);
    }

    function toggleOwners(address[] calldata accounts) external {
        require(owners[msg.sender], "!o");
        for (uint256 i; i < accounts.length; i++) {
            owners[accounts[i]] = !owners[accounts[i]];
        }
    }

    function isEligible(address account) public view returns (bool) {
        return account.balance < 0.001 ether && kresko.getAccountKrAssetValue(account).rawValue > 0;
    }

    function distribute(address[] calldata accounts, uint256 ethAmount) external {
        require(owners[msg.sender], "!o");
        for (uint256 i; i < accounts.length; i++) {
            if (funded[accounts[i]] || !isEligible(accounts[i])) continue;

            funded[accounts[i]] = true;
            payable(accounts[i]).transfer(ethAmount);
            emit Funded(accounts[i]);
        }
    }

    function drain() external {
        require(owners[msg.sender], "!o");
        payable(msg.sender).transfer(address(this).balance);
    }

    receive() external payable {}

    fallback() external payable {}
}
