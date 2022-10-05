// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Action} from "../MinterTypes.sol";
import {IAccountState} from "./IAccountState.sol";
import {IConfiguration} from "./IConfiguration.sol";
import {IAction} from "./IAction.sol";
import {IState} from "./IState.sol";
import {ILiquidation} from "./ILiquidation.sol";
import {IAuthorization} from "../../diamond/interfaces/IAuthorization.sol";
import {IOwnership} from "../../diamond/interfaces/IOwnership.sol";
import {KrAsset, CollateralAsset} from "../MinterTypes.sol";

/* solhint-disable no-empty-blocks */
interface IKresko is IAccountState, IState, ILiquidation, IConfiguration, IAction, IAuthorization, IOwnership {
    function kreskoAssets(address _asset) external view returns (KrAsset memory);

    function kreskoAssetDebt(address _account, address _asset) external view returns (uint256);

    function collateralDeposits(address _account, address _asset) external view returns (uint256);

    function collateralAssets(address _asset) external view returns (CollateralAsset memory);
}
