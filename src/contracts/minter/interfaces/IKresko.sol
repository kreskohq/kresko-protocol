// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Action} from "../MinterTypes.sol";
import {IAccountState} from "./IAccountState.sol";
import {IConfiguration} from "./IConfiguration.sol";
import {IAction} from "./IAction.sol";
import {ILiquidation} from "./ILiquidation.sol";
import {IAuthorization} from "../../diamond/interfaces/IAuthorization.sol";
import {IOwnership} from "../../diamond/interfaces/IOwnership.sol";

/* solhint-disable no-empty-blocks */
interface IKresko is IAccountState, ILiquidation, IConfiguration, IAction, IAuthorization, IOwnership {

}
