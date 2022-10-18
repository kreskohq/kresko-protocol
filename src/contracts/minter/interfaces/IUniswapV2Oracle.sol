pragma solidity >=0.8.14;

interface IUniswapV2Oracle {
    function consultKrAsset(address _krAsset, uint256 _amount) external view returns (uint256 amountOut);

    function consult(
        address _pair,
        address _token,
        uint256 _amountIn
    ) external view returns (uint256 amountOut);
}
