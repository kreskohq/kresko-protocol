// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";
import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {IBurnFacet} from "minter/interfaces/IBurnFacet.sol";
import {IBurnHelperFacet} from "periphery/facets/IBurnHelperFacet.sol";
import {IConfigurationFacet} from "minter/interfaces/IConfigurationFacet.sol";
import {IMintFacet} from "minter/interfaces/IMintFacet.sol";
import {IDepositWithdrawFacet} from "minter/interfaces/IDepositWithdrawFacet.sol";
import {IStateFacet} from "minter/interfaces/IStateFacet.sol";
import {ILiquidationFacet} from "minter/interfaces/ILiquidationFacet.sol";
import {IAccountStateFacet} from "minter/interfaces/IAccountStateFacet.sol";
import {IAuthorizationFacet} from "common/interfaces/IAuthorizationFacet.sol";
import {IAssetStateFacet} from "common/interfaces/IAssetStateFacet.sol";
import {ISafetyCouncilFacet} from "common/interfaces/ISafetyCouncilFacet.sol";
import {ICommonConfigurationFacet} from "common/interfaces/ICommonConfigurationFacet.sol";
import {ICommonStateFacet} from "common/interfaces/ICommonStateFacet.sol";
import {IAssetConfigurationFacet} from "common/interfaces/IAssetConfigurationFacet.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {IDiamondLoupeFacet} from "diamond/interfaces/IDiamondLoupeFacet.sol";
import {IDiamondOwnershipFacet} from "diamond/interfaces/IDiamondOwnershipFacet.sol";

// solhint-disable-next-line no-empty-blocks
interface IKresko is
    IDiamondCutFacet,
    IDiamondLoupeFacet,
    IDiamondOwnershipFacet,
    IAuthorizationFacet,
    ICommonConfigurationFacet,
    ICommonStateFacet,
    IAssetConfigurationFacet,
    IAssetStateFacet,
    ISCDPSwapFacet,
    ISCDPFacet,
    ISCDPConfigFacet,
    ISCDPStateFacet,
    ISDIFacet,
    IBurnFacet,
    IBurnHelperFacet,
    ISafetyCouncilFacet,
    IConfigurationFacet,
    IMintFacet,
    IStateFacet,
    IDepositWithdrawFacet,
    IAccountStateFacet,
    ILiquidationFacet
{

}
