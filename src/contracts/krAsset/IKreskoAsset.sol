// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {IERC20Upgradeable} from "../shared/IERC20Upgradeable.sol";

interface IKreskoAsset is IERC20Upgradeable {
    function burn(address _from, uint256 _amount) external;

    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _owner,
        address _kresko
    ) external;

    function kresko() external view returns (address);

    function mint(address _to, uint256 _amount) external;

    function rebalance() external view returns (bool expand, uint256 rate);

    function rebalanced() external view returns (bool);

    function setRebalance(uint256 _rate, bool _expand) external;

    function updateMetaData(
        string memory _name,
        string memory _symbol,
        uint8 _version
    ) external;
}
