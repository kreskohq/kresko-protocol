// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;
pragma experimental ABIEncoderV2;

import {UQ} from "../vendor/uniswap/v2-periphery/libraries/UQ.sol";
import {IUniswapV2Factory, IUniswapV2Pair} from "../vendor/uniswap/v2-periphery/libraries/UniswapV2Library.sol";
import {IERC20Minimal} from "../vendor/uniswap/v2-core/interfaces/IERC20Minimal.sol";
import {Error} from "../libs/Errors.sol";

/**
 * @title Kresko AMM Oracle (Uniswap V2)
 *
 * Keeps track of time-weighted average prices for tokens in a Uniswap V2 pair.
 * This oracle is intended to be used with Kresko AMM.
 *
 * This oracle is updated by calling the `update` with the liquidity token address.
 * The prices can be queried by calling `consult` or `consultKrAsset` for quality-of-life with Kresko Assets,
 * it does not need the pair address.
 *
 * Bookkeeping is done in terms of time-weighted average prices, and that period has a lower bound of `minUpdatePeriod`.
 * Logic is pretty much what's laid out in
 * https://github.com/Uniswap/v2-periphery/blob/master/contracts/examples/ExampleOracleSimple.sol
 *
 * This contract just extends some storage to deal with many pairs with their own configuration.
 *
 * @notice Kresko gives _NO GUARANTEES_ for the correctness of the prices provided by this oracle.
 *
 * @author Kresko
 */
contract UniswapV2Oracle {
    using UQ for *;

    /* -------------------------------------------------------------------------- */
    /*                                   Structs                                  */
    /* -------------------------------------------------------------------------- */

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
    /* -------------------------------------------------------------------------- */
    /*                                   Layout                                   */
    /* -------------------------------------------------------------------------- */

    IUniswapV2Factory public immutable factory;

    IERC20Minimal public incentiveToken;
    uint256 public incentiveAmount = 3 ether;

    address public admin;
    uint256 public minUpdatePeriod = 15 minutes;

    mapping(address => PairData) public pairs;
    mapping(address => address) public krAssets;

    /* -------------------------------------------------------------------------- */
    /*                                   Events                                   */
    /* -------------------------------------------------------------------------- */

    event NewAdmin(address indexed newAdmin);
    event NewMinUpdatePeriod(uint256 newMinUpdatePeriod);
    event NewPair(address indexed pair, address indexed token0, address indexed token1, uint256 updatePeriod);
    event PairUpdated(address indexed pair, address indexed token0, address indexed token1, uint256 updatePeriod);

    event NewKrAssetPair(address indexed krAsset, address indexed pairAddress);
    event NewPrice(
        address indexed token0,
        address indexed token1,
        uint32 indexed blockTimestampLast,
        UQ.uq112x112 price0CumulativeLast,
        UQ.uq112x112 price1CumulativeLast,
        uint256 updatePeriod,
        uint256 timeElapsed
    );

    /* --------------------------------------------------------------------------*/
    /*                                   Funcs                                   */
    /* --------------------------------------------------------------------------*/

    constructor(address _factory, address _admin) {
        require(_factory != address(0), Error.CONSTRUCTOR_INVALID_FACTORY);
        require(_admin != address(0), Error.CONSTRUCTOR_INVALID_ADMIN);

        factory = IUniswapV2Factory(_factory);
        admin = _admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, Error.CALLER_NOT_ADMIN);
        _;
    }

    /**
     *
     * @param _newIncentiveToken new incentive token for updater
     */
    function setIncentiveToken(address _newIncentiveToken, uint256 amount) external onlyAdmin {
        incentiveToken = IERC20Minimal(_newIncentiveToken);
        incentiveAmount = amount;
    }

    /**
     *
     * @param _erc20 drain any sent tokens
     */
    function drainERC20(address _erc20, address _to) external onlyAdmin {
        IERC20Minimal(_erc20).transfer(_to, IERC20Minimal(_erc20).balanceOf(address(this)));
    }

    /**
     * @notice Sets a new admin
     * @param _newAdmin New admin address
     */
    function setAdmin(address _newAdmin) external onlyAdmin {
        admin = _newAdmin;
        emit NewAdmin(_newAdmin);
    }

    /**
     * @notice Set a new min update period
     * @param _minUpdatePeriod The new minimum period that can be set for a pair
     */
    function setMinUpdatePeriod(uint256 _minUpdatePeriod) external onlyAdmin {
        minUpdatePeriod = _minUpdatePeriod;
        emit NewMinUpdatePeriod(_minUpdatePeriod);
    }

    /**
     * @notice Returns the current block timestamp within the range of uint32, i.e. [0, 2**32 - 1]
     */
    function currentBlockTimestamp() internal view returns (uint32) {
        // solhint-disable not-rely-on-time
        return uint32(block.timestamp % 2 ** 32);
    }

    /**
     * @notice Produces the cumulative price using counterfactuals to save gas and avoid a call to sync.
     * @param _pairAddress Pair address
     */
    function currentCumulativePrices(
        address _pairAddress
    ) internal view returns (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) {
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
     * @notice Initializes an Uniswap V2 pair to be tracked by this oracle.
     *
     * The criteria for a pair to be tracked:
     * The pair must not already be tracked by this oracle.
     * The pair must exist.
     * The pair must have reserves.
     * The update period must be greater than the minimum update period.
     * @param _pairAddress Liquidity token address for the pair
     * @param _kreskoAsset Kresko Asset in the pair we want to add helper functionality for
     * @param _updatePeriod The update period (TWAP) for this AMM pair
     *
     */
    function initPair(address _pairAddress, address _kreskoAsset, uint256 _updatePeriod) external onlyAdmin {
        require(_pairAddress != address(0), Error.PAIR_ADDRESS_IS_ZERO);
        require(_updatePeriod >= minUpdatePeriod, Error.INVALID_UPDATE_PERIOD);
        require(pairs[_pairAddress].token0 == address(0), Error.PAIR_ALREADY_EXISTS);

        IUniswapV2Pair pair = IUniswapV2Pair(_pairAddress);
        address token0 = pair.token0();
        address token1 = pair.token1();

        // Ensure that the pair exists
        require(token0 != address(0) && token1 != address(0), Error.PAIR_DOES_NOT_EXIST);

        // If the Kresko Asset is in the pair, add it to the krAssets mapping
        if (_kreskoAsset == token0 || _kreskoAsset == token1) {
            krAssets[_kreskoAsset] = _pairAddress;
            emit NewKrAssetPair(_kreskoAsset, _pairAddress);
        }

        // Ensure that there's liquidity in the pair
        (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) = pair.getReserves();
        require(reserve0 != 0 && reserve1 != 0, Error.INVALID_LIQUIDITY); // ensure that there's liquidity in the pair

        // Initialize the pair to storage
        pairs[_pairAddress].token0 = token0;
        pairs[_pairAddress].token1 = token1;
        pairs[_pairAddress].price0CumulativeLast = pair.price0CumulativeLast();
        pairs[_pairAddress].price1CumulativeLast = pair.price1CumulativeLast();
        pairs[_pairAddress].updatePeriod = _updatePeriod;
        pairs[_pairAddress].blockTimestampLast = blockTimestampLast;

        emit NewPair(_pairAddress, token0, token1, _updatePeriod);
    }

    /**
     * @notice Configures existing values of an AMM pair
     * @param _pairAddress Pair address
     * @param _updatePeriod Update period (TWAP)
     */
    function configurePair(address _pairAddress, uint256 _updatePeriod) external onlyAdmin {
        // Ensure that the pair exists
        require(
            pairs[_pairAddress].token0 != address(0) && pairs[_pairAddress].token1 != address(0),
            Error.PAIR_DOES_NOT_EXIST
        );

        // Ensure that the update period is greater than the minimum update period
        require(_updatePeriod >= minUpdatePeriod, Error.INVALID_UPDATE_PERIOD);

        // Update the period
        pairs[_pairAddress].updatePeriod = _updatePeriod;

        emit PairUpdated(_pairAddress, pairs[_pairAddress].token0, pairs[_pairAddress].token1, _updatePeriod);
    }

    /**
     * @notice Updates the oracle values for a pair
     * @param _pairAddress Pair address
     */
    function update(address _pairAddress) external {
        PairData storage data = pairs[_pairAddress];

        // Ensure that the pair exists
        require(data.blockTimestampLast != 0, Error.PAIR_DOES_NOT_EXIST);

        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices(
            _pairAddress
        );

        uint32 timeElapsed = blockTimestamp - data.blockTimestampLast; // overflow is desired
        // Ensure that at least one full period has passed since the last update
        require(timeElapsed >= data.updatePeriod, Error.UPDATE_PERIOD_NOT_FINISHED);

        // Overflow is desired, casting never truncates
        // Cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        data.price0Average = UQ.uq112x112(uint224((price0Cumulative - data.price0CumulativeLast) / timeElapsed));
        data.price1Average = UQ.uq112x112(uint224((price1Cumulative - data.price1CumulativeLast) / timeElapsed));

        // Update the cumulative prices
        data.price0CumulativeLast = price0Cumulative;
        data.price1CumulativeLast = price1Cumulative;
        data.blockTimestampLast = blockTimestamp;

        emit NewPrice(
            data.token0,
            data.token1,
            blockTimestamp,
            data.price0Average,
            data.price1Average,
            data.updatePeriod,
            timeElapsed
        );
    }

    /**
     * Get the current data for a pair
     * @param _kreskoAsset Kresko Asset in the pair we want to get pair data for
     */
    function getKrAssetPair(address _kreskoAsset) external view returns (PairData memory) {
        return pairs[krAssets[_kreskoAsset]];
    }

    /**
     * Update pair data with incentives sent
     * @param _kreskoAsset Kresko Asset in the pair we want to update pair data for
     */
    function updateWithIncentive(address _kreskoAsset) external {
        PairData storage data = pairs[krAssets[_kreskoAsset]];
        // Ensure that the pair exists
        require(data.blockTimestampLast != 0, Error.PAIR_DOES_NOT_EXIST);
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = currentCumulativePrices(
            krAssets[_kreskoAsset]
        );

        uint32 timeElapsed = blockTimestamp - data.blockTimestampLast; // overflow is desired
        // Ensure that at least one full period has passed since the last update
        require(timeElapsed >= data.updatePeriod, Error.UPDATE_PERIOD_NOT_FINISHED);

        // Overflow is desired, casting never truncates
        // Cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
        data.price0Average = UQ.uq112x112(uint224((price0Cumulative - data.price0CumulativeLast) / timeElapsed));
        data.price1Average = UQ.uq112x112(uint224((price1Cumulative - data.price1CumulativeLast) / timeElapsed));

        // Update the cumulative prices
        data.price0CumulativeLast = price0Cumulative;
        data.price1CumulativeLast = price1Cumulative;
        data.blockTimestampLast = blockTimestamp;

        emit NewPrice(
            data.token0,
            data.token1,
            blockTimestamp,
            data.price0Average,
            data.price1Average,
            data.updatePeriod,
            timeElapsed
        );

        require(incentiveToken.balanceOf(address(this)) > 3 ether, Error.NO_INCENTIVES_LEFT);
        incentiveToken.transfer(msg.sender, 3 ether);
    }

    /**
     * @notice Get the AMM price for an amount of krAsset
     * @param _kreskoAsset Kresko asset address
     * @param _amountIn Amount of Kresko Asset to get value for
     */
    function consultKrAsset(address _kreskoAsset, uint256 _amountIn) external view returns (uint256 amountOut) {
        PairData memory data = pairs[krAssets[_kreskoAsset]];

        // if the kresko asset is token0, get the corresponding value for the amount in
        if (_kreskoAsset == data.token0) {
            amountOut = data.price0Average.mul(_amountIn).decode144();
        } else {
            if (_kreskoAsset != data.token1) {
                // if the kresko asset is not in the pair, return 0
                amountOut = 0;
            } else {
                // if the kresko asset is token1, get the corresponding value for the amount in
                amountOut = data.price1Average.mul(_amountIn).decode144();
            }
        }
    }

    /**
     * @notice General consult function, gets a value for _amountIn
     * @param _pairAddress Address of the pair that contains the token
     * @param _token Address of the token to get value for
     * @param _amountIn Amount of token to get value for
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
