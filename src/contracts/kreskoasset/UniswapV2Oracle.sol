// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;
pragma experimental ABIEncoderV2;

import "../vendor/uniswap/v2-periphery/libraries/UQ.sol";
import "../vendor/uniswap/v2-periphery/libraries/UniswapV2Library.sol";
import "../libs/Errors.sol";

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

    ///@notice Returns the current block timestamp within the range of uint32, i.e. [0, 2**32 - 1]
    function currentBlockTimestamp() internal view returns (uint32) {
        // solhint-disable not-rely-on-time
        return uint32(block.timestamp % 2**32);
    }

    /**
     * @notice Produces the cumulative price using counterfactuals to save gas and avoid a call to sync.
     * @param _pairAddress Pair address
     */
    function currentCumulativePrices(address _pairAddress)
        internal
        view
        returns (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        )
    {
        blockTimestamp = currentBlockTimestamp();
        price0Cumulative = IUniswapV2Pair(_pairAddress).price0CumulativeLast();
        price1Cumulative = IUniswapV2Pair(_pairAddress).price1CumulativeLast();

        // if time has elapsed since the last update on the pair, mock the accumulated price values
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = IUniswapV2Pair(_pairAddress).getReserves();
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

    /**
     * @notice Initializes an AMM pair to the oracle
     * @param _pairAddress Pair address
     * @param _krAsset Kresko asset in the pair
     * @param _updatePeriod Update period (TWAP)
     */
    function initPair(
        address _pairAddress,
        address _krAsset,
        uint256 _updatePeriod
    ) external {
        require(msg.sender == owner, Error.NOT_OWNER);
        require(_pairAddress != address(0), Error.PAIR_ADDRESS_IS_ZERO);
        require(_updatePeriod > 15 minutes, Error.INVALID_UPDATE_PERIOD);
        require(pairs[_pairAddress].token0 == address(0), Error.PAIR_ALREADY_EXISTS);

        IUniswapV2Pair pair = IUniswapV2Pair(_pairAddress);
        address token0 = pair.token0();
        address token1 = pair.token1();
        require(token0 != address(0) && token1 != address(0), Error.PAIR_DOES_NOT_EXIST);
        if (_krAsset == token0 || _krAsset == token1) {
            krAssets[_krAsset] = _pairAddress;
        }

        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, Error.INVALID_LIQUIDITY); // ensure that there's liquidity in the pair
        pairs[_pairAddress].token0 = token0;
        pairs[_pairAddress].token1 = token1;
        pairs[_pairAddress].price0CumulativeLast = pair.price0CumulativeLast();
        pairs[_pairAddress].price1CumulativeLast = pair.price1CumulativeLast();
        pairs[_pairAddress].updatePeriod = _updatePeriod;
        pairs[_pairAddress].blockTimestampLast = blockTimestampLast;
    }

    /**
     * @notice Configures existing values of an AMM pair
     * @param _pairAddress Pair address
     * @param _updatePeriod Update period (TWAP)
     */
    function configurePair(address _pairAddress, uint256 _updatePeriod) external {
        require(msg.sender == owner, Error.NOT_OWNER);
        require(
            pairs[_pairAddress].token0 != address(0) && pairs[_pairAddress].token1 != address(0),
            Error.PAIR_DOES_NOT_EXIST
        );
        pairs[_pairAddress].updatePeriod = _updatePeriod;
    }

    /**
     * @notice Updates the oracle values for a pair
     * @param _pairAddress Pair address
     */
    function update(address _pairAddress) external {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices(
            _pairAddress
        );

        PairData storage data = pairs[_pairAddress];
        require(data.blockTimestampLast != 0, Error.PAIR_DOES_NOT_EXIST);

        uint32 timeElapsed = blockTimestamp - data.blockTimestampLast; // overflow is desired
        // ensure that at least one full period has passed since the last update
        require(timeElapsed >= data.updatePeriod, Error.UPDATE_PERIOD_NOT_FINISHED);

        // overflow is desired, casting never truncates
        // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        data.price0Average = UQ.uq112x112(uint224((price0Cumulative - data.price0CumulativeLast) / timeElapsed));
        data.price1Average = UQ.uq112x112(uint224((price1Cumulative - data.price1CumulativeLast) / timeElapsed));

        data.price0CumulativeLast = price0Cumulative;
        data.price1CumulativeLast = price1Cumulative;
        data.blockTimestampLast = blockTimestamp;
    }

    /**
     * @notice Get the AMM price for an amount of krAsset
     * @param _krAsset Kresko asset address
     * @param _amountIn Amount to get value for
     */
    function consultKrAsset(address _krAsset, uint256 _amountIn) external view returns (uint256 amountOut) {
        PairData memory data = pairs[krAssets[_krAsset]];
        if (_krAsset == data.token0) {
            amountOut = data.price0Average.mul(_amountIn).decode144();
        } else {
            if (_krAsset != data.token1) {
                amountOut = 0;
            } else {
                amountOut = data.price1Average.mul(_amountIn).decode144();
            }
        }
    }

    /**
     * @notice General consult function, gets a value for _amountIn
     * @param _pairAddress Pair address
     * @param _token Token address
     * @param _amountIn Amount in of the asset
     */
    function consult(
        address _pairAddress,
        address _token,
        uint256 _amountIn
    ) external view returns (uint256 amountOut) {
        PairData memory data = pairs[_pairAddress];
        if (_token == data.token0) {
            amountOut = data.price0Average.mul(_amountIn).decode144();
        } else {
            require(_token == data.token1, Error.INVALID_PAIR);
            amountOut = data.price1Average.mul(_amountIn).decode144();
        }
    }
}
