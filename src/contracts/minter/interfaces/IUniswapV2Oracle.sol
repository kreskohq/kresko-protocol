pragma solidity >=0.8.14;

interface IUniswapV2Oracle {
    function consultKrAsset(address _krAsset, uint256 _amount) external view returns (uint256 amountOut);

    function consult(
        address _pair,
        address _token,
        uint256 _amountIn
    ) external view returns (uint256 amountOut);

    function initPair(
        address _pairAddress,
        address _krAsset,
        uint256 _updatePeriod
    ) external;

    function configurePair(address _pairAddress, uint256 _updatePeriod) external;

    function update(address _pairAddress) external;

    function krAssets(address) external returns (address);

    function owner() external returns (address);

    function factory() external returns (address);
}
