// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ISCDPConfigFacet} from "scdp/interfaces/ISCDPConfigFacet.sol";
import {ISCDPStateFacet} from "scdp/interfaces/ISCDPStateFacet.sol";
import {ISCDPFacet} from "scdp/interfaces/ISCDPFacet.sol";
import {ISDIFacet} from "scdp/interfaces/ISDIFacet.sol";
import {ISCDPSwapFacet} from "scdp/interfaces/ISCDPSwapFacet.sol";
import {IMinterBurnFacet} from "minter/interfaces/IMinterBurnFacet.sol";
import {IMinterConfigFacet} from "minter/interfaces/IMinterConfigFacet.sol";
import {IMinterMintFacet} from "minter/interfaces/IMinterMintFacet.sol";
import {IMinterDepositWithdrawFacet} from "minter/interfaces/IMinterDepositWithdrawFacet.sol";
import {IMinterStateFacet} from "minter/interfaces/IMinterStateFacet.sol";
import {IMinterLiquidationFacet} from "minter/interfaces/IMinterLiquidationFacet.sol";
import {IMinterAccountStateFacet} from "minter/interfaces/IMinterAccountStateFacet.sol";
import {IAuthorizationFacet} from "common/interfaces/IAuthorizationFacet.sol";
import {ISafetyCouncilFacet} from "common/interfaces/ISafetyCouncilFacet.sol";
import {ICommonConfigFacet} from "common/interfaces/ICommonConfigFacet.sol";
import {ICommonStateFacet} from "common/interfaces/ICommonStateFacet.sol";
import {IAssetStateFacet} from "common/interfaces/IAssetStateFacet.sol";
import {IAssetConfigFacet} from "common/interfaces/IAssetConfigFacet.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {IDiamondLoupeFacet} from "diamond/interfaces/IDiamondLoupeFacet.sol";
import {IDiamondStateFacet} from "diamond/interfaces/IDiamondStateFacet.sol";
import {IViewDataFacet} from "periphery/interfaces/IViewDataFacet.sol";
import {IBatchFacet} from "common/interfaces/IBatchFacet.sol";
import {IErrorsEvents} from "periphery/IErrorsEvents.sol";

// solhint-disable-next-line no-empty-blocks
interface IKresko is
    IDiamondCutFacet,
    IDiamondLoupeFacet,
    IDiamondStateFacet,
    IAuthorizationFacet,
    ICommonConfigFacet,
    ICommonStateFacet,
    IAssetConfigFacet,
    IErrorsEvents,
    IAssetStateFacet,
    ISCDPSwapFacet,
    ISCDPFacet,
    ISCDPConfigFacet,
    ISCDPStateFacet,
    ISDIFacet,
    IMinterBurnFacet,
    ISafetyCouncilFacet,
    IMinterConfigFacet,
    IMinterMintFacet,
    IMinterStateFacet,
    IMinterDepositWithdrawFacet,
    IMinterAccountStateFacet,
    IMinterLiquidationFacet,
    IViewDataFacet,
    IBatchFacet
{

}
