pragma solidity >=0.8.21;
import {FacetScript} from "kresko-lib/utils/Diamond.sol";
import {RedstoneScript} from "kresko-lib/utils/Redstone.sol";
import {CommonInitArgs} from "common/Types.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {IKreskoForgeTypes} from "./IKreskoForgeTypes.sol";
import {FacetCut, Initializer, FacetCutAction} from "diamond/DSTypes.sol";
import {Diamond} from "diamond/Diamond.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondOwnershipFacet} from "diamond/facets/DiamondOwnershipFacet.sol";
import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {ERC165Facet} from "diamond/facets/ERC165Facet.sol";

import {MinterMintFacet} from "minter/facets/MinterMintFacet.sol";
import {MinterBurnFacet} from "minter/facets/MinterBurnFacet.sol";
import {MinterDepositWithdrawFacet} from "minter/facets/MinterDepositWithdrawFacet.sol";
import {MinterAccountStateFacet} from "minter/facets/MinterAccountStateFacet.sol";
import {AuthorizationFacet} from "common/facets/AuthorizationFacet.sol";
import {CommonConfigurationFacet} from "common/facets/CommonConfigurationFacet.sol";
import {AssetConfigurationFacet} from "common/facets/AssetConfigurationFacet.sol";
import {CommonStateFacet} from "common/facets/CommonStateFacet.sol";
import {SafetyCouncilFacet} from "common/facets/SafetyCouncilFacet.sol";
import {AssetStateFacet} from "common/facets/AssetStateFacet.sol";
import {MinterStateFacet} from "minter/facets/MinterStateFacet.sol";
import {MinterLiquidationFacet} from "minter/facets/MinterLiquidationFacet.sol";
import {MinterConfigurationFacet} from "minter/facets/MinterConfigurationFacet.sol";

import {SCDPStateFacet} from "scdp/facets/SCDPStateFacet.sol";
import {SCDPFacet} from "scdp/facets/SCDPFacet.sol";
import {SCDPSwapFacet} from "scdp/facets/SCDPSwapFacet.sol";
import {SCDPConfigFacet} from "scdp/facets/SCDPConfigFacet.sol";
import {SDIFacet} from "scdp/facets/SDIFacet.sol";
import {SCDPInitArgs} from "scdp/STypes.sol";
import {IKresko} from "periphery/IKresko.sol";
import {KISS} from "kiss/KISS.sol";
import {Vault} from "vault/Vault.sol";

abstract contract KreskoForgeBase is
    IKreskoForgeTypes,
    RedstoneScript("./src/utils/getRedstonePayload.js"),
    FacetScript("./src/utils/selectorsFromArtifact.sh")
{
    address internal testAdmin = address(0xABABAB);
    DeployArgs internal deployArgs;
    IKresko internal kresko;
    KISS internal kiss;
    Vault internal vkiss;

    address public constant TEST_TREASURY = address(0xFEE);
    address[] internal councilUsers;

    function deployDiamond(DeployArgs memory args) internal returns (IKresko kresko_) {
        FacetCut[] memory facets = new FacetCut[](22);
        Initializer[] memory initializers = new Initializer[](3);
        /* --------------------------------- Diamond -------------------------------- */
        diamondFacets(facets);
        /* --------------------------------- Common --------------------------------- */
        initializers[0] = commonFacets(args, facets);
        /* --------------------------------- Minter --------------------------------- */
        initializers[1] = minterFacets(args, facets);
        /* ---------------------------------- SCDP ---------------------------------- */
        initializers[2] = scdpFacets(args, facets);
        (kresko_ = IKresko(address(new Diamond(args.admin, facets, initializers))));
        __current_kresko = address(kresko_); // @note mandatory
    }

    function getCommonInitializer(DeployArgs memory args) internal pure returns (CommonInitArgs memory init) {
        init.admin = args.admin;
        init.council = args.council;
        init.treasury = args.treasury;
        init.minDebtValue = 10e8;
        init.oracleDeviationPct = 0.05e4;
        init.oracleDecimals = args.oraclePrecision;
        init.sequencerUptimeFeed = args.seqFeed;
        init.sequencerGracePeriodTime = 3600;
        init.oracleTimeout = args.oracleTimeout;
        init.phase = 3;
    }

    function getMinterInitializer(DeployArgs memory args) internal pure returns (MinterInitArgs memory init) {
        init.minCollateralRatio = args.minterMcr;
        init.liquidationThreshold = args.minterLt;
    }

    function getSCDPInitializer(DeployArgs memory args) internal pure returns (SCDPInitArgs memory init) {
        init.minCollateralRatio = args.scdpMcr;
        init.liquidationThreshold = args.scdpLt;
        init.sdiPricePrecision = args.sdiPrecision;
    }

    function diamondFacets(FacetCut[] memory facets) internal returns (Initializer memory) {
        facets[0] = FacetCut({
            facetAddress: address(new DiamondCutFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("DiamondCutFacet")
        });
        facets[1] = FacetCut({
            facetAddress: address(new DiamondOwnershipFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("DiamondOwnershipFacet")
        });
        facets[2] = FacetCut({
            facetAddress: address(new DiamondLoupeFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("DiamondLoupeFacet")
        });
        facets[3] = FacetCut({
            facetAddress: address(new ERC165Facet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("ERC165Facet")
        });

        return Initializer({initContract: address(0), initData: ""});
    }

    function commonFacets(DeployArgs memory args, FacetCut[] memory facets) internal returns (Initializer memory) {
        address configurationFacetAddress = address(new CommonConfigurationFacet());
        facets[4] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("CommonConfigurationFacet")
        });
        facets[5] = FacetCut({
            facetAddress: address(new AuthorizationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("AuthorizationFacet")
        });
        facets[6] = FacetCut({
            facetAddress: address(new CommonStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("CommonStateFacet")
        });
        facets[7] = FacetCut({
            facetAddress: address(new AssetConfigurationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("AssetConfigurationFacet")
        });
        facets[8] = FacetCut({
            facetAddress: address(new AssetStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("AssetStateFacet")
        });
        facets[9] = FacetCut({
            facetAddress: address(new SafetyCouncilFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("SafetyCouncilFacet")
        });

        return
            Initializer(
                configurationFacetAddress,
                abi.encodeWithSelector(CommonConfigurationFacet.initializeCommon.selector, getCommonInitializer(args))
            );
    }

    function minterFacets(DeployArgs memory args, FacetCut[] memory facets) internal returns (Initializer memory) {
        address configurationFacetAddress = address(new MinterConfigurationFacet());
        facets[10] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterConfigurationFacet")
        });
        facets[11] = FacetCut({
            facetAddress: address(new MinterMintFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterMintFacet")
        });
        facets[12] = FacetCut({
            facetAddress: address(new MinterBurnFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterBurnFacet")
        });
        facets[13] = FacetCut({
            facetAddress: address(new MinterStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterStateFacet")
        });
        facets[14] = FacetCut({
            facetAddress: address(new MinterDepositWithdrawFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterDepositWithdrawFacet")
        });
        facets[15] = FacetCut({
            facetAddress: address(new MinterAccountStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterAccountStateFacet")
        });
        facets[16] = FacetCut({
            facetAddress: address(new MinterLiquidationFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("MinterLiquidationFacet")
        });

        return
            Initializer(
                configurationFacetAddress,
                abi.encodeWithSelector(MinterConfigurationFacet.initializeMinter.selector, getMinterInitializer(args))
            );
    }

    function scdpFacets(DeployArgs memory args, FacetCut[] memory facets) internal returns (Initializer memory) {
        address configurationFacetAddress = address(new SCDPConfigFacet());

        facets[17] = FacetCut({
            facetAddress: address(new SCDPFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("SCDPFacet")
        });
        facets[18] = FacetCut({
            facetAddress: address(new SCDPStateFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("SCDPStateFacet")
        });
        facets[19] = FacetCut({
            facetAddress: configurationFacetAddress,
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("SCDPConfigFacet")
        });
        facets[20] = FacetCut({
            facetAddress: address(new SCDPSwapFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("SCDPSwapFacet")
        });
        facets[21] = FacetCut({
            facetAddress: address(new SDIFacet()),
            action: FacetCutAction.Add,
            functionSelectors: getSelectorsFromArtifact("SDIFacet")
        });
        return
            Initializer(
                configurationFacetAddress,
                abi.encodeWithSelector(SCDPConfigFacet.initializeSCDP.selector, getSCDPInitializer(args))
            );
    }
}
