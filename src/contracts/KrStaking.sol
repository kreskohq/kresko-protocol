pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract KrStaking is AccessControlUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

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

    // keccak256("kresko.operator.role")
    bytes32 public constant OPERATOR_ROLE = 0x8952ae23cc3fea91b9dba0cefa16d18a26ca2bf124b54f42b5d04bce3aacecd2;

    // Reward token -> Tokens per block
    mapping(address => uint256) public rewardPerBlockFor;
    uint256 internal rewardTokenAmount;

    // Info of each pool.
    PoolInfo[] public poolInfo;

    // Info of each staked user.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Total allocation points.
    uint128 public totalAllocPoint;
    // The block when rewards start dripping.
    uint128 public startBlock;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event ClaimRewards(address indexed user, address indexed rewardToken, uint256 amount);

    function initialize(
        address[] calldata _rewardTokens,
        uint256[] calldata _rewardPerBlocks,
        IERC20 _depositToken,
        uint128 _allocPoint
    ) external initializer {
        require(_rewardPerBlocks.length == _rewardTokens.length, "All reward tokens need rewardPerBlock amount");

        __AccessControl_init();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Set initial reward tokens and allocations
        for (uint256 i; i < _rewardTokens.length; i++) {
            rewardPerBlockFor[_rewardTokens[i]] = _rewardPerBlocks[i];
        }
        rewardTokenAmount = _rewardTokens.length;

        startBlock = uint128(block.number);

        // Push the initial pool in.
        poolInfo.push(
            PoolInfo({
                depositToken: _depositToken,
                allocPoint: _allocPoint,
                lastRewardBlock: startBlock,
                accRewardPerShares: new uint256[](_rewardTokens.length),
                rewardTokens: _rewardTokens
            })
        );

        totalAllocPoint += _allocPoint;
    }

    /**** MODIFIERS ****/

    /// @notice Ensures the @param _depositToken does not already have a pool for it
    modifier ensurePoolDoesNotExist(IERC20 _depositToken) {
        for (uint256 i; i < poolInfo.length; i++) {
            require(address(poolInfo[i].depositToken) != address(_depositToken), "KR: poolExists");
        }
        _;
    }

    /// @notice Ensures the @param _pid does actually exist
    modifier ensurePoolExists(uint256 _pid) {
        require(address(poolInfo[_pid].depositToken) != address(0), "KR: !poolExists");
        _;
    }

    /**** VIEWS ****/

    /**
     * @notice View to get pending rewards from a certain pool
     * @param _pid id of pool in `poolInfo` to check rewards from
     * @param _user id of user in `userInfo[_pid]`
     */
    function pendingRewards(uint256 _pid, address _user) public view returns (Reward memory rewards) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo memory user = userInfo[_pid][_user];
        uint256 depositTokenSupply = pool.depositToken.balanceOf(address(this));

        uint256 rewardTokensLength = pool.rewardTokens.length;
        rewards = Reward({pid: _pid, tokens: pool.rewardTokens, amounts: new uint256[](rewardTokensLength)});

        if (depositTokenSupply != 0 && user.amount > 0) {
            for (uint256 rewardIndex; rewardIndex < rewardTokensLength; rewardIndex++) {
                uint256 accRewardPerShare = pool.accRewardPerShares[rewardIndex];

                uint256 rewardPerBlock = rewardPerBlockFor[pool.rewardTokens[rewardIndex]];
                uint256 blocks = block.number - pool.lastRewardBlock;
                uint256 reward = (rewardPerBlock * blocks * pool.allocPoint) / totalAllocPoint;

                accRewardPerShare += (reward * 1e12) / depositTokenSupply;

                rewards.amounts[rewardIndex] = (user.amount * accRewardPerShare) / 1e12 - user.rewardDebts[rewardIndex];
                rewards.tokens[rewardIndex] = pool.rewardTokens[rewardIndex];
            }
        }
    }

    /**
     * @notice View to get pending rewards from all pools for a user
     * @param _user user to get rewards for
     */
    function allPendingRewards(address _user) external view returns (Reward[] memory allRewards) {
        allRewards = new Reward[](poolInfo.length);
        for (uint256 pid; pid < poolInfo.length; pid++) {
            Reward memory poolReward = pendingRewards(pid, _user);
            allRewards[pid] = poolReward;
        }
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function getPidFor(address _token) external view returns (uint256 pid, bool found) {
        for (pid; pid < poolInfo.length; pid++) {
            if (address(poolInfo[pid].depositToken) == _token) {
                found = true;
                break;
            }
        }
    }

    function getDepositAmount(uint256 _pid) external view returns (uint256) {
        return userInfo[_pid][msg.sender].amount;
    }

    /**** ADMIN FUNCTIONS ****/

    /**
     * @notice Adjust reward per block for a particular reward token
     * @param _rewardToken token to adjust the drip for
     * @param _rewardPerBlock tokens to drip per block
     */
    function setRewardPerBlockFor(address _rewardToken, uint256 _rewardPerBlock)
        external
        payable
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        rewardPerBlockFor[_rewardToken] = _rewardPerBlock;
    }

    /**
     * @notice Adds a new reward pool
     * @param _rewardTokens tokens to reward from this pool
     * @param _depositToken token to deposit for rewards
     * @param _allocPoint weight of rewards this pool receives
     */
    function addPool(
        address[] calldata _rewardTokens,
        IERC20 _depositToken,
        uint128 _allocPoint
    ) external payable onlyRole(DEFAULT_ADMIN_ROLE) ensurePoolDoesNotExist(_depositToken) {
        totalAllocPoint += _allocPoint;
        if (_rewardTokens.length > rewardTokenAmount) {
            rewardTokenAmount = _rewardTokens.length;
        }
        poolInfo.push(
            PoolInfo({
                depositToken: _depositToken,
                allocPoint: _allocPoint,
                lastRewardBlock: uint128(block.number),
                accRewardPerShares: new uint256[](rewardTokenAmount),
                rewardTokens: _rewardTokens
            })
        );
    }

    /**
     * @notice Set new allocations and reward tokens for a pool
     * @param _pid pool to modify
     * @param _newAllocPoint new allocation (weight) for rewards
     * @param _rewardTokens set new reward tokens for this pool
     */
    function setPool(
        uint256 _pid,
        uint128 _newAllocPoint,
        address[] calldata _rewardTokens
    ) external payable onlyRole(DEFAULT_ADMIN_ROLE) ensurePoolExists(_pid) {
        totalAllocPoint -= poolInfo[_pid].allocPoint + _newAllocPoint;
        poolInfo[_pid].allocPoint = _newAllocPoint;
        if (_rewardTokens.length > 0) {
            poolInfo[_pid].rewardTokens = _rewardTokens;
        }
    }

    /** PUBLIC STATE MODIFYING FUNCTIONS */

    /**
     * @notice Updates all pools to be up-to date
     * @notice Cannot be updated more than once per block
     */
    function massUpdatePools() public payable {
        for (uint256 pid; pid < poolInfo.length; ++pid) {
            updatePool(pid);
        }
    }

    /**
     * @notice Updates a pools reward variables to be up-to date
     * @notice Cannot be updated more than once per block
     * @param _pid pool to update
     */
    function updatePool(uint256 _pid) public payable returns (PoolInfo memory pool) {
        pool = poolInfo[_pid];
        if (block.number > pool.lastRewardBlock) {
            uint256 lpSupply = pool.depositToken.balanceOf(address(this));

            // Do not drip rewards for 0 supply
            if (lpSupply > 0) {
                for (uint256 rewardIndex; rewardIndex < pool.rewardTokens.length; rewardIndex++) {
                    // Reward per block for the reward token in the index
                    uint256 rewardPerBlock = rewardPerBlockFor[pool.rewardTokens[rewardIndex]];
                    uint256 blocks = block.number - pool.lastRewardBlock;

                    // Allocation for this particular pool
                    uint256 reward = (rewardPerBlock * blocks * pool.allocPoint) / totalAllocPoint;

                    // Increment accumulated rewards per share since block height is increased
                    pool.accRewardPerShares[rewardIndex] += (reward * 1e12) / lpSupply;
                }
            }
            // No further updates are allowed within same block height
            pool.lastRewardBlock = uint128(block.number);
            poolInfo[_pid] = pool;
        }
    }

    /**
     * @notice Deposits tokens for @param _to in a pool for reward allocation
     * @param _to address that msg.sender deposits tokens for
     * @param _pid in `poolInfo`
     * @param _amount amount to deposit
     */
    function deposit(
        address _to,
        uint256 _pid,
        uint256 _amount
    ) external payable nonReentrant ensurePoolExists(_pid) {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][_to];

        // Transfer and add to balance
        if (_amount > 0) {
            if (user.rewardDebts.length == 0) {
                user.rewardDebts = new uint256[](pool.rewardTokens.length);
            }
            unchecked {
                pool.depositToken.safeTransferFrom(address(msg.sender), address(this), _amount);
                user.amount += _amount;
                // Update rewards paid with possibly increased deposit amount
                for (uint256 rewardIndex; rewardIndex < pool.rewardTokens.length; rewardIndex++) {
                    user.rewardDebts[rewardIndex] += (_amount * pool.accRewardPerShares[rewardIndex]) / 1e12;
                }
            }
            emit Deposit(_to, _pid, _amount);
        }
    }

    /**
     * @notice Withdraw staked tokens and/or claim rewards.
     * @notice IF @param _claimRewards = true && @param _amount = 0 will claim only
     * @param _pid id in `poolInfo`
     * @param _amount amount to withdraw
     * @param _claimRewards does claim rewards
     * @param _claimRewardsTo address to send rewards to
     */
    function withdraw(
        uint256 _pid,
        uint256 _amount,
        bool _claimRewards,
        address _claimRewardsTo
    ) external payable nonReentrant {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][msg.sender];

        // Send rewards to user
        if (_claimRewards) {
            claimRewards(pool, user, _claimRewardsTo);
        }
        if (_amount > 0) {
            // If user tries to withdraw amount > balance, just send the whole balance
            if (_amount > user.amount) {
                _amount = user.amount;
                user.amount = 0;
            } else {
                user.amount -= _amount;
            }

            pool.depositToken.safeTransfer(address(msg.sender), _amount);

            emit Withdraw(msg.sender, _pid, _amount);
        }

        // Update reward debts
        for (uint256 rewardIndex; rewardIndex < pool.rewardTokens.length; rewardIndex++) {
            user.rewardDebts[rewardIndex] = (user.amount * (pool.accRewardPerShares[rewardIndex])) / 1e12;
        }
    }

    /**
     * @notice Withdraw staked tokens for an user through a trusted operator contract (eg. Kresko Zapper)
     * @notice IF @param _claimRewards = true && @param _amount = 0 will claim only
     * @param _for user to withdraw from
     * @param _pid id in `poolInfo`
     * @param _amount amount to withdraw
     * @param _claimRewards does claim rewards
     * @param _claimRewardsTo address to send rewards to
     */
    function withdrawFor(
        address _for,
        uint256 _pid,
        uint256 _amount,
        bool _claimRewards,
        address _claimRewardsTo
    ) external payable nonReentrant onlyRole(OPERATOR_ROLE) {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][_for];

        // Send rewards to user
        if (_claimRewards) {
            claimRewards(pool, user, _claimRewardsTo);
        }
        if (_amount > 0) {
            // If user tries to withdraw amount > balance, just send the whole balance
            if (_amount > user.amount) {
                _amount = user.amount;
                user.amount = 0;
            } else {
                user.amount -= _amount;
            }

            pool.depositToken.safeTransfer(address(msg.sender), _amount);

            emit Withdraw(_for, _pid, _amount);
        }

        // Update reward debts
        for (uint256 rewardIndex; rewardIndex < pool.rewardTokens.length; rewardIndex++) {
            user.rewardDebts[rewardIndex] = (user.amount * (pool.accRewardPerShares[rewardIndex])) / 1e12;
        }
    }

    /**
     * @notice Emergency function for withdrawing users total staking balance in a pool
     * @notice Usage is for emergency only as this will ZERO your rewards.
     * @param _pid pool id to withdraw all deposited tokens from
     */
    function emergencyWithdraw(uint256 _pid) external payable nonReentrant {
        PoolInfo memory pool = updatePool(_pid);
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.depositToken.safeTransfer(address(msg.sender), user.amount);
        user.amount = 0;
        for (uint256 rewardIndex; rewardIndex < pool.rewardTokens.length; rewardIndex++) {
            user.rewardDebts[rewardIndex] = 0;
        }
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
    }

    /**
     * @notice A rescue function for missent msg.value
     * @notice Since we are using payable functions to save gas on calls
     */
    function rescueNative() external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @notice A rescue function for missent tokens / airdrops
     * @notice THIS CANNOT WITHDRAW ANY POOL TOKENS due `ensurePoolDoesNotExist` modifier.
     */
    function rescueNonPoolToken(IERC20 _tokenToRescue, uint256 _amount)
        external
        payable
        onlyRole(DEFAULT_ADMIN_ROLE)
        ensurePoolDoesNotExist(_tokenToRescue)
    {
        _tokenToRescue.safeTransfer(msg.sender, _amount);
    }

    /** INTERNALS */

    /**
     * @notice Loops over pools reward tokens and sends them to the user
     * @param pool pool to send rewards from in `poolInfo`
     * @param user users info in the @param pool
     * @param to user to send rewards to
     */
    function claimRewards(
        PoolInfo memory pool,
        UserInfo memory user,
        address to
    ) internal {
        for (uint256 rewardIndex; rewardIndex < pool.rewardTokens.length; rewardIndex++) {
            uint256 rewardDebt = user.rewardDebts[rewardIndex];
            uint256 pending = (user.amount * (pool.accRewardPerShares[rewardIndex])) / 1e12 - rewardDebt;

            if (pending > 0) {
                IERC20(pool.rewardTokens[rewardIndex]).safeTransfer(to, pending);
                emit ClaimRewards(to, pool.rewardTokens[rewardIndex], pending);
            }
        }
    }
}
