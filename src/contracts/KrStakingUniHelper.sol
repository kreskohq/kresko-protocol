pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./uniswap/v2-periphery/interfaces/IUniswapV2Router02.sol";
import "./uniswap/v2-core/interfaces/IUniswapV2Factory.sol";
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

    event LiquidityAndStakeAdded(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event LiquidityAndStakeRemoved(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event RewardsClaimed(address indexed to);

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

        IERC20(pair).approve(pair, liquidity);

        staking.withdrawFor(to, pid, liquidity, true, to);
        router.removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);

        emit LiquidityAndStakeRemoved(to, liquidity, pid);
    }

    function claimRewardsMulti(address to) external {
        require(to != address(0), "KR: !address");
        uint256 length = staking.poolLength();
        for (uint256 i; i < length; i++) {
            staking.withdrawFor(msg.sender, i, 0, true, to);
        }

        emit RewardsClaimed(to);
    }
}
