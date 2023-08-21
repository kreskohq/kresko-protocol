// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {IBurnFacet} from "minter/interfaces/IBurnFacet.sol";
import {IMintFacet} from "minter/interfaces/IMintFacet.sol";
import {IDepositWithdrawFacet} from "minter/interfaces/IDepositWithdrawFacet.sol";
import {ILiquidationFacet} from "minter/interfaces/ILiquidationFacet.sol";
import {IAccountStateFacet} from "minter/interfaces/IAccountStateFacet.sol";

interface IKresko is
    ISCDPSwapFacet,
    ISCDPFacet,
    ISCDPConfigFacet,
    ISCDPStateFacet,
    IBurnFacet,
    IMintFacet,
    IDepositWithdrawFacet,
    IAccountStateFacet,
    ILiquidationFacet
{}
