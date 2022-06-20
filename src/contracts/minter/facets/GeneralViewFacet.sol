// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;

import "../interfaces/IGeneralViewFacet.sol";
import {MinterParams} from "../state/Structs.sol";
import {MinterState, ms} from "../MinterStorage.sol";

/**
 * @title View functions for protocol parameters
 * @author Kresko
 * @dev Structs storage pattern does not automatically generate views.
 */
contract GeneralViewFacet is IGeneralViewFacet {
    function domainSeparator() external view returns (bytes32) {
        return ms().domainSeparator;
    }

    function minterInitializations() external view returns (uint256) {
        return ms().initializations;
    }

    function burnFee() external view returns (FixedPoint.Unsigned memory) {
        return ms().burnFee;
    }

    function feeRecipient() external view returns (address) {
        return ms().feeRecipient;
    }

    function minimumCollateralizationRatio() external view returns (FixedPoint.Unsigned memory) {
        return ms().minimumCollateralizationRatio;
    }

    function liquidationIncentiveMultiplier() external view returns (FixedPoint.Unsigned memory) {
        return ms().liquidationIncentiveMultiplier;
    }

    function minimumDebtValue() external view returns (FixedPoint.Unsigned memory) {
        return ms().minimumDebtValue;
    }

    function secondsUntilStalePrice() external view returns (uint256) {
        return ms().secondsUntilStalePrice;
    }

    function getAllParams() external view returns (MinterParams memory) {
        MinterState storage s = ms();
        return
            MinterParams(
                s.burnFee,
                s.minimumCollateralizationRatio,
                s.liquidationIncentiveMultiplier,
                s.minimumDebtValue,
                s.secondsUntilStalePrice,
                s.feeRecipient
            );
    }
}
