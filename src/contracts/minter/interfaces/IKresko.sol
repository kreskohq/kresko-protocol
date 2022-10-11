// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Action} from "../MinterTypes.sol";
import {IAccountStateFacet} from "./IAccountStateFacet.sol";
import {IConfigurationFacet} from "./IConfigurationFacet.sol";
import {IActionFacet} from "./IActionFacet.sol";
import {IStateFacet} from "./IStateFacet.sol";
import {ILiquidationFacet} from "./ILiquidationFacet.sol";
import {IAuthorizationFacet} from "../../diamond/interfaces/IAuthorizationFacet.sol";
import {IOwnershipFacet} from "../../diamond/interfaces/IOwnershipFacet.sol";
import {KrAsset, CollateralAsset} from "../MinterTypes.sol";

/* solhint-disable no-empty-blocks */
interface IKresko is
    IAccountStateFacet,
    IStateFacet,
    ILiquidationFacet,
    IConfigurationFacet,
    IActionFacet,
    IAuthorizationFacet,
    IOwnershipFacet
{
    function kreskoAssets(address _asset) external view returns (KrAsset memory);

    function kreskoAssetDebt(address _account, address _asset) external view returns (uint256);

    function collateralDeposits(address _account, address _asset) external view returns (uint256);

    function collateralAssets(address _asset) external view returns (CollateralAsset memory);
}
