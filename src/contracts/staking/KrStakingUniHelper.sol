// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../vendor/uniswapv2/Index.sol";
import "./interfaces/IKrStaking.sol";

contract KrStakingUniHelper {
    using SafeERC20 for IERC20;

    IUniswapV2Router02 public router;
    IUniswapV2Factory public factory;
    IKrStaking public staking;

    constructor(
        IUniswapV2Router02 _router,
        IUniswapV2Factory _factory,
        IKrStaking _staking
    ) {
        router = _router;
        factory = _factory;
        staking = _staking;
    }

    /**
     * ==================================================
     * ============ Events ==============================
     * ==================================================
     */

    event LiquidityAndStakeAdded(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event LiquidityAndStakeRemoved(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event ClaimRewardsMulti(address indexed to);

    /**
     * ==================================================
     * ============ Public functions ====================
     * ==================================================
     */

    /**
     * @notice Add liquidity to a pair, deposit liquidity tokens to staking
     * @param tokenA address of tokenA
     * @param tokenB address of tokenB
     * @param amountADesired optimal amount of token A
     * @param amountBDesired optimal amount of token B
     * @param amountAMin min amountA (slippage)
     * @param amountBMin min amountB (slippage)
     * @param to address to deposit for
     * @param deadline transaction deadline (used by router)
     */
    function addLiquidityAndStake(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256) {
        require(to != address(0), "KR: !address");
        address pair = factory.getPair(tokenA, tokenB);
        (uint256 pid, bool found) = staking.getPidFor(pair);

        require(found, "KR: !poolExists");

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountBDesired);

        IERC20(tokenA).approve(address(router), amountADesired);
        IERC20(tokenB).approve(address(router), amountBDesired);

        (, , uint256 liquidity) = router.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        IERC20(pair).approve(address(staking), liquidity);
        staking.deposit(to, pid, liquidity);

        emit LiquidityAndStakeAdded(to, liquidity, pid);
        return liquidity;
    }

    /**
     * @notice Withdraw liquidity tokens from staking, remove the underlying
     * @param tokenA address of tokenA
     * @param tokenB address of tokenB
     * @param liquidity liquidity token amount to remove
     * @param amountAMin min amountA to receive (slippage)
     * @param amountBMin min amountB to receive (slippage)
     * @param to address that receives the underlying
     * @param deadline transaction deadline (used by router)
     */
    function withdrawAndRemoveLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external {
        require(to != address(0), "KR: !address");
        address pair = factory.getPair(tokenA, tokenB);
        (uint256 pid, bool found) = staking.getPidFor(pair);

        require(found, "KR: !poolExists");

        staking.withdrawFor(msg.sender, pid, liquidity, to);

        IERC20(pair).approve(address(router), liquidity);
        router.removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);

        emit LiquidityAndStakeRemoved(to, liquidity, pid);
    }

    /**
     * @notice Claim rewards from each pool
     * @param to address that receives the rewards
     */
    function claimRewardsMulti(address to) external {
        require(to != address(0), "KR: !address");

        uint256 length = staking.poolLength();

        for (uint256 i; i < length; i++) {
            staking.claimFor(msg.sender, i, to);
        }

        emit ClaimRewardsMulti(to);
    }
}
