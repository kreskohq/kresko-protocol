// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";
import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {IBurnFacet} from "minter/interfaces/IBurnFacet.sol";
import {IBurnHelperFacet} from "minter/interfaces/IBurnHelperFacet.sol";
import {ISafetyCouncilFacet} from "minter/interfaces/ISafetyCouncilFacet.sol";
import {IConfigurationFacet} from "minter/interfaces/IConfigurationFacet.sol";
import {IMintFacet} from "minter/interfaces/IMintFacet.sol";
import {IDepositWithdrawFacet} from "minter/interfaces/IDepositWithdrawFacet.sol";
import {IStateFacet} from "minter/interfaces/IStateFacet.sol";
import {ILiquidationFacet} from "minter/interfaces/ILiquidationFacet.sol";
import {IAccountStateFacet} from "minter/interfaces/IAccountStateFacet.sol";
import {IAuthorizationFacet} from "diamond/interfaces/IAuthorizationFacet.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {IDiamondLoupeFacet} from "diamond/interfaces/IDiamondLoupeFacet.sol";
import {IDiamondOwnershipFacet} from "diamond/interfaces/IDiamondOwnershipFacet.sol";

// solhint-disable-next-line no-empty-blocks
interface IKresko is
    IAuthorizationFacet,
    IDiamondCutFacet,
    IDiamondLoupeFacet,
    IDiamondOwnershipFacet,
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
