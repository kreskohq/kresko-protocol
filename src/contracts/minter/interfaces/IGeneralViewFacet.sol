// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../../shared/FP.sol" as FixedPoint;

interface IGeneralViewFacet {
    function domainSeparator() external view returns (bytes32);

    function minterInitializations() external view returns (uint256);

    function burnFee() external view returns (FixedPoint.Unsigned memory);

    function feeRecipient() external view returns (address);

    function liquidationIncentiveMultiplier() external view returns (FixedPoint.Unsigned memory);

    function minimumCollateralizationRatio() external view returns (FixedPoint.Unsigned memory);

    function minimumDebtValue() external view returns (FixedPoint.Unsigned memory);

    function secondsUntilStalePrice() external view returns (uint256);
}
