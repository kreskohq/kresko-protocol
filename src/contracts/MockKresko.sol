// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {FixedPoint} from "./libs/FixedPoint.sol";
import {WadRay} from "./libs/WadRay.sol";
import {Action} from "./minter/MinterTypes.sol";
import {LibAssetUtility} from "./minter/libs/LibAssetUtility.sol";
import {LibDecimals} from "./minter/libs/LibDecimals.sol";
import {IAuthorizationFacet} from "./diamond/interfaces/IAuthorizationFacet.sol";
import {AuthorizationFacet} from "./diamond/facets/AuthorizationFacet.sol";
import {IDiamondCutFacet} from "./diamond/interfaces/IDiamondCutFacet.sol";
import {DiamondCutFacet} from "./diamond/facets/DiamondCutFacet.sol";
import {IDiamondLoupeFacet} from "./diamond/interfaces/IDiamondLoupeFacet.sol";
import {DiamondLoupeFacet} from "./diamond/facets/DiamondLoupeFacet.sol";
import {IDiamondOwnershipFacet} from "./diamond/interfaces/IDiamondOwnershipFacet.sol";
import {DiamondOwnershipFacet} from "./diamond/facets/DiamondOwnershipFacet.sol";
import {ERC165Facet} from "./diamond/facets/ERC165Facet.sol";
import {IAccountStateFacet} from "./minter/interfaces/IAccountStateFacet.sol";
import {IConfigurationFacet} from "./minter/interfaces/IConfigurationFacet.sol";
import {IBurnFacet} from "./minter/interfaces/IBurnFacet.sol";
import {IBurnHelperFacet} from "./minter/interfaces/IBurnHelperFacet.sol";
import {IMintFacet} from "./minter/interfaces/IMintFacet.sol";
import {IDepositWithdrawFacet} from "./minter/interfaces/IDepositWithdrawFacet.sol";
import {ISafetyCouncilFacet} from "./minter/interfaces/ISafetyCouncilFacet.sol";
import {IStateFacet} from "./minter/interfaces/IStateFacet.sol";
import {IStabilityRateFacet} from "./minter/interfaces/IStabilityRateFacet.sol";
import {IInterestLiquidationFacet} from "./minter/interfaces/IInterestLiquidationFacet.sol";
import {ILiquidationFacet} from "./minter/interfaces/ILiquidationFacet.sol";
import {AccountStateFacet} from "./minter/facets/AccountStateFacet.sol";
import {ConfigurationFacet} from "./minter/facets/ConfigurationFacet.sol";
import {BurnFacet} from "./minter/facets/BurnFacet.sol";
import {BurnHelperFacet} from "./minter/facets/BurnHelperFacet.sol";
import {MintFacet} from "./minter/facets/MintFacet.sol";
import {DepositWithdrawFacet} from "./minter/facets/DepositWithdrawFacet.sol";
import {SafetyCouncilFacet} from "./minter/facets/SafetyCouncilFacet.sol";
import {StateFacet} from "./minter/facets/StateFacet.sol";
import {StabilityRateFacet} from "./minter/facets/StabilityRateFacet.sol";
import {InterestLiquidationFacet} from "./minter/facets/InterestLiquidationFacet.sol";
import {LiquidationFacet} from "./minter/facets/LiquidationFacet.sol";

import {KrAsset, CollateralAsset} from "./minter/MinterTypes.sol";
import {UIDataProviderFacet} from "./minter/facets/UIDataProviderFacet.sol";
import {UIDataProviderFacet2} from "./minter/facets/UIDataProviderFacet2.sol";
import {MinterEvent} from "./libs/Events.sol";

/* solhint-disable no-empty-blocks */
abstract contract MockKresko is
    DepositWithdrawFacet,
    MintFacet,
    BurnFacet,
    StateFacet,
    InterestLiquidationFacet,
    LiquidationFacet,
    BurnHelperFacet,
    AccountStateFacet,
    UIDataProviderFacet,
    UIDataProviderFacet2,
    ConfigurationFacet,
    IStabilityRateFacet,
    ISafetyCouncilFacet,
    AuthorizationFacet,
    DiamondCutFacet,
    DiamondLoupeFacet,
    DiamondOwnershipFacet,
    ERC165Facet
{
    //
}
