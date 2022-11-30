// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Action} from "../MinterTypes.sol";
import {IAccountStateFacet} from "./IAccountStateFacet.sol";
import {IConfigurationFacet} from "./IConfigurationFacet.sol";
import {IBurnFacet} from "./IBurnFacet.sol";
import {IBurnHelperFacet} from "./IBurnHelperFacet.sol";
import {IMintFacet} from "./IMintFacet.sol";
import {IDepositWithdrawFacet} from "./IDepositWithdrawFacet.sol";
import {ISafetyCouncilFacet} from "./ISafetyCouncilFacet.sol";
import {IStateFacet} from "./IStateFacet.sol";
import {IStabilityRateFacet} from "./IStabilityRateFacet.sol";
import {IInterestLiquidationFacet} from "./IInterestLiquidationFacet.sol";
import {ILiquidationFacet} from "./ILiquidationFacet.sol";
import {IAuthorizationFacet} from "../../diamond/interfaces/IAuthorizationFacet.sol";
import {IOwnershipFacet} from "../../diamond/interfaces/IOwnershipFacet.sol";
import {KrAsset, CollateralAsset} from "../MinterTypes.sol";
import "../../libs/Events.sol";

// THIS INTERFACE EXISTS FOR TYPECHAIN PURPOSES

/* solhint-disable no-empty-blocks */
interface IKresko is
    IAccountStateFacet,
    IStateFacet,
    ILiquidationFacet,
    IConfigurationFacet,
    IDepositWithdrawFacet,
    IMintFacet,
    IBurnFacet,
    IBurnHelperFacet,
    IAuthorizationFacet,
    IOwnershipFacet,
    IStabilityRateFacet,
    ISafetyCouncilFacet,
    IInterestLiquidationFacet
{
    //
}
