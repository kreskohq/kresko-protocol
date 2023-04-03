// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IKrStaking {
    struct UserInfo {
        uint256 amount;
        uint256[] rewardDebts;
    }

    struct PoolInfo {
        IERC20 depositToken; // Address of LP token contract.
        uint128 allocPoint; // How many allocation points assigned to this pool.
        uint128 lastRewardBlock; // Last block number that rewards distribution occurs.
        uint256[] accRewardPerShares; // Accumulated rewards per share, times 1e12.
        address[] rewardTokens; // Reward tokens for this pool.
    }

    struct Reward {
        uint256 pid;
        address[] tokens;
        uint256[] amounts;
    }

    function getPidFor(address _token) external view returns (uint256 pid, bool found);

    function poolLength() external view returns (uint256);

    function deposit(address _to, uint256 _pid, uint256 _amount) external;

    function withdrawFor(address _for, uint256 _pid, uint256 _amount, address _claimRewardsTo) external;

    function claimFor(address _for, uint256 _pid, address _rewardRecipient) external;

    function allPendingRewards(address) external view returns (Reward[] memory);

    function userInfo(uint256 _pid, address _account) external view returns (UserInfo memory);

    function poolInfo(uint256 _pid) external view returns (PoolInfo memory);

    function rewardPerBlockFor(address depositTokenAddress) external view returns (uint256[] memory rewardPerBlocks);
}
