// SPDX-License-Identifier: MIT
pragma solidity >=0.8.20;
import {StabilityRateParams} from "../facets/StabilityRateFacet.sol";
import {StabilityRateConfig} from "../InterestRateState.sol";

interface IStabilityRateFacet {
    function setupStabilityRateParams(address _asset, StabilityRateParams memory _setup) external;

    function updateStabilityRateParams(address _asset, StabilityRateParams memory _setup) external;

    function updateStabilityRateAndIndexForAsset(address _asset) external;

    function updateKiss(address _kiss) external;

    function repayStabilityRateInterestPartial(
        address _account,
        address _kreskoAsset,
        uint256 _kissRepayAmount
    ) external;

    function repayFullStabilityRateInterest(
        address _account,
        address _kreskoAsset
    ) external returns (uint256 kissRepayAmount);

    function batchRepayFullStabilityRateInterest(address _account) external returns (uint256 kissRepayAmount);

    function getStabilityRateForAsset(address _asset) external view returns (uint256 stabilityRate);

    function getPriceRateForAsset(address _asset) external view returns (uint256 priceRate);

    function getDebtIndexForAsset(address _asset) external view returns (uint256 debtIndex);

    function getStabilityRateConfigurationForAsset(address _asset) external view returns (StabilityRateConfig memory);

    function kiss() external view returns (address);

    function getLastDebtIndexForAccount(address _account, address _asset) external view returns (uint128 lastDebtIndex);
}
