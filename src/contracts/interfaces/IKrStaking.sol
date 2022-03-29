pragma solidity >=0.8.4;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    function deposit(
        address _to,
        uint256 _pid,
        uint256 _amount
    ) external;

    function withdrawFor(
        address _for,
        uint256 _pid,
        uint256 _amount,
        address _claimRewardsTo
    ) external;

    function claimRewards(
        PoolInfo memory pool,
        UserInfo memory user,
        address to
    ) external;
}
