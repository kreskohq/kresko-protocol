// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../libraries/FixedPoint.sol";
import "../libraries/FixedPointMath.sol";
import "../libraries/Arrays.sol";

import {MinterInitParams} from "../storage/MinterStructs.sol";
import {DiamondModifiers} from "../Modifiers.sol";
import {WithStorage} from "../WithStorage.sol";
import {AccessControl, MINTER_OPERATOR_ROLE} from "../libraries/AccessControl.sol";
import {MinterStorage, LibMeta} from "../storage/MinterStorage.sol";
import {IMinterParameterFacet} from "../interfaces/IMinterParameterFacet.sol";
import {GeneralEvent} from "../Events.sol";
import {Error} from "../Errors.sol";

contract MinterInitV1 is WithStorage, DiamondModifiers {
    function initialize(MinterInitParams calldata params) external onlyOwner {
        require(!ms().initialized, Error.ALREADY_INITIALIZED);
        MinterStorage.initialize();
        AccessControl.grantRole(MINTER_OPERATOR_ROLE, params.operator);

        // Minter protocol version domain
        ms().domainSeparator = LibMeta.domainSeparator("Kresko Minter", "V1");

        // Set paramateres
        ms().feeRecipient = params.feeRecipient;
        ms().burnFee = FixedPoint.Unsigned(params.burnFee);
        ms().liquidationIncentiveMultiplier = FixedPoint.Unsigned(params.liquidationIncentiveMultiplier);
        ms().minimumCollateralizationRatio = FixedPoint.Unsigned(params.minimumCollateralizationRatio);
        ms().minimumDebtValue = FixedPoint.Unsigned(params.minimumDebtValue);

        ds().supportedInterfaces[type(IMinterParameterFacet).interfaceId] = true;
        emit GeneralEvent.Initialized(params.operator, ms().storageVersion);
    }
}
