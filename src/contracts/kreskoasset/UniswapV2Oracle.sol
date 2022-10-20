// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;
pragma experimental ABIEncoderV2;

import "../vendor/uniswap/v2-periphery/libraries/UQ.sol";
import "../vendor/uniswap/v2-periphery/libraries/UniswapV2Library.sol";

contract UniswapV2Oracle {
    using UQ for *;

    struct PairData {
        UQ.uq112x112 price0Average;
        UQ.uq112x112 price1Average;
        address token0;
        address token1;
        uint256 price0CumulativeLast;
        uint256 price1CumulativeLast;
        uint32 blockTimestampLast;
        uint256 updatePeriod;
    }
    mapping(address => PairData) public pairs;
    mapping(address => address) public krAssets;

    IUniswapV2Factory public immutable factory;
    address public owner;

    constructor(address _factory) public {
        factory = IUniswapV2Factory(_factory);
        owner = msg.sender;
    }

    // helper function that returns the current block timestamp within the range of uint32, i.e. [0, 2**32 - 1]
    function currentBlockTimestamp() internal view returns (uint32) {
        // solhint-disable not-rely-on-time
        return uint32(block.timestamp % 2**32);
    }

    // produces the cumulative price using counterfactuals to save gas and avoid a call to sync.
    function currentCumulativePrices(address pair)
        internal
        view
        returns (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        )
    {
        blockTimestamp = currentBlockTimestamp();
        price0Cumulative = IUniswapV2Pair(pair).price0CumulativeLast();
        price1Cumulative = IUniswapV2Pair(pair).price1CumulativeLast();

        // if time has elapsed since the last update on the pair, mock the accumulated price values
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = IUniswapV2Pair(pair).getReserves();
        if (blockTimestampLast != blockTimestamp) {
            // subtraction overflow is desired
            uint32 timeElapsed = blockTimestamp - blockTimestampLast;
            // addition overflow is desired
            // counterfactual
            price0Cumulative += uint256(UQ.fraction(reserve1, reserve0)._x) * timeElapsed;
            // counterfactual
            price1Cumulative += uint256(UQ.fraction(reserve0, reserve1)._x) * timeElapsed;
        }
    }

    function initPair(
        address _pair,
        address _krAsset,
        uint256 _updatePeriod
    ) external {
        require(msg.sender == owner, "c:owner");
        require(_pair != address(0), "c:pair");
        require(_updatePeriod > 15 minutes, "c:period");
        require(pairs[_pair].token0 == address(0) && pairs[_pair].token1 == address(0), "c:exists");

        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        address token0 = pair.token0();
        address token1 = pair.token1();
        require(token0 != address(0) && token1 != address(0), "c:tkns");
        if (_krAsset == token0 || _krAsset == token1) {
            krAssets[_krAsset] = _pair;
        }

        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, "c:reserves"); // ensure that there's liquidity in the pair
        pairs[_pair].token0 = token0;
        pairs[_pair].token1 = token1;
        pairs[_pair].price0CumulativeLast = pair.price0CumulativeLast();
        pairs[_pair].price1CumulativeLast = pair.price1CumulativeLast();
        pairs[_pair].updatePeriod = _updatePeriod;
        pairs[_pair].blockTimestampLast = blockTimestampLast;
    }

    function configurePair(address _pair, uint256 _updatePeriod) external {
        require(msg.sender == owner, "c:owner");
        require(pairs[_pair].token0 != address(0) && pairs[_pair].token1 != address(0), "!twap:exists");
        pairs[_pair].updatePeriod = _updatePeriod;
    }

    function update(address _pair) external {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices(_pair);

        PairData storage data = pairs[_pair];
        require(data.blockTimestampLast != 0, "!u:exists");

        uint32 timeElapsed = blockTimestamp - data.blockTimestampLast; // overflow is desired
        // ensure that at least one full period has passed since the last update
        require(timeElapsed >= data.updatePeriod, "!u:period");

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        data.price0Average = UQ.uq112x112(uint224((price0Cumulative - data.price0CumulativeLast) / timeElapsed));
        data.price1Average = UQ.uq112x112(uint224((price1Cumulative - data.price1CumulativeLast) / timeElapsed));

        data.price0CumulativeLast = price0Cumulative;
        data.price1CumulativeLast = price1Cumulative;
        data.blockTimestampLast = blockTimestamp;
    }

    function consultKrAsset(address _krAsset, uint256 _amount) external view returns (uint256 amountOut) {
        PairData memory data = pairs[krAssets[_krAsset]];
        if (_krAsset == data.token0) {
            amountOut = data.price0Average.mul(_amount).decode144();
        } else {
            require(_krAsset == data.token1, "consult:token");
            amountOut = data.price1Average.mul(_amount).decode144();
        }
    }

    function consult(
        address _pair,
        address _token,
        uint256 _amountIn
    ) external view returns (uint256 amountOut) {
        PairData memory data = pairs[_pair];
        if (_token == data.token0) {
            amountOut = data.price0Average.mul(_amountIn).decode144();
        } else {
            require(_token == data.token1, "consult:token");
            amountOut = data.price1Average.mul(_amountIn).decode144();
        }
    }
}
