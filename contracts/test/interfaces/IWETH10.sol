// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
import "./IERC3156FlashBorrower.sol";

interface IWETH10 {
    function flashLoan(
        IERC3156FlashBorrower receiver,
        address token,
        uint256 value,
        bytes calldata data
    ) external returns (bool);

    function balanceOf(address) external view returns (uint256);
}
