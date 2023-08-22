// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {Diamond} from "diamond/Diamond.sol";
import {IDiamondCutFacet} from "diamond/interfaces/IDiamondCutFacet.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondOwnershipFacet} from "diamond/facets/DiamondOwnershipFacet.sol";
import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {AuthorizationFacet} from "diamond/facets/AuthorizationFacet.sol";
import {ERC165Facet} from "diamond/facets/ERC165Facet.sol";

import {MintFacet} from "minter/facets/MintFacet.sol";
import {BurnFacet} from "minter/facets/BurnFacet.sol";
import {DepositWithdrawFacet} from "minter/facets/DepositWithdrawFacet.sol";
import {AccountStateFacet} from "minter/facets/AccountStateFacet.sol";
import {StateFacet} from "minter/facets/StateFacet.sol";
import {LiquidationFacet} from "minter/facets/LiquidationFacet.sol";
import {ConfigurationFacet} from "minter/facets/ConfigurationFacet.sol";
import {SafetyCouncilFacet} from "minter/facets/SafetyCouncilFacet.sol";
import {BurnHelperFacet} from "minter/facets/BurnHelperFacet.sol";

import {SCDPStateFacet} from "scdp/facets/SCDPStateFacet.sol";
import {SCDPFacet} from "scdp/facets/SCDPFacet.sol";
import {SCDPSwapFacet} from "scdp/facets/SCDPSwapFacet.sol";
import {SCDPConfigFacet, SCDPInitArgs} from "scdp/facets/SCDPConfigFacet.sol";

import {DiamondHelper} from "./DiamondHelper.sol";
import {IKresko} from "common/IKresko.sol";
import {MinterInitArgs} from "minter/MinterTypes.sol";
import {MockSequencerUptimeFeed} from "test/MockSequencerUptimeFeed.sol";
import {GnosisSafeL2} from "vendor/gnosis/GnosisSafeL2.sol";
import {GnosisSafeProxyFactory, GnosisSafeProxy} from "vendor/gnosis/GnosisSafeProxyFactory.sol";

abstract contract KreskoDeployer {
    address[] internal councilUsers;
    address public constant TREASURY = address(0xFEE);

    function getInitializer(address admin) internal returns (MinterInitArgs memory init) {
        init.admin = admin;
        init.treasury = TREASURY;
        init.council = address(LibSafe.createSafe(admin));
        init.extOracleDecimals = 8;
        init.minimumCollateralizationRatio = 1.5e18;
        init.minimumDebtValue = 10e8;
        init.liquidationThreshold = 1.4e18;
        init.oracleDeviationPct = 0.01e18;
        init.sequencerUptimeFeed = address(new MockSequencerUptimeFeed());
        init.sequencerGracePeriodTime = 3600;
        init.oracleTimeout = type(uint256).max;
    }

    function deployDiamond(address admin) internal returns (IKresko kresko) {
        /* ------------------------------ DiamondFacets ----------------------------- */
        (
            IDiamondCutFacet.FacetCut[] memory diamondFacets,
            Diamond.Initialization[] memory diamondInit
        ) = diamondFacets();

        kresko = IKresko(address(new Diamond(admin, diamondFacets, diamondInit)));

        /* ------------------------------ MinterFacets ------------------------------ */
        (IDiamondCutFacet.FacetCut[] memory minterFacets, Diamond.Initialization memory minterInit) = minterFacets(
            admin
        );
        kresko.diamondCut(minterFacets, minterInit.initContract, minterInit.initData);

        /* ------------------------------- SCDPFacets ------------------------------- */
        (IDiamondCutFacet.FacetCut[] memory scdpFacets, Diamond.Initialization memory scdpInit) = scdpFacets();
        kresko.diamondCut(scdpFacets, scdpInit.initContract, scdpInit.initData);
    }

    function diamondFacets() internal returns (IDiamondCutFacet.FacetCut[] memory, Diamond.Initialization[] memory) {
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](5);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondCutFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondCutFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondOwnershipFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondOwnershipFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DiamondLoupeFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DiamondLoupeFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new AuthorizationFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AuthorizationFacet")
        });
        _diamondCut[4] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new ERC165Facet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ERC165Facet")
        });

        Diamond.Initialization[] memory diamondInit = new Diamond.Initialization[](1);
        diamondInit[0] = Diamond.Initialization({initContract: address(0), initData: ""});
        return (_diamondCut, diamondInit);
    }

    function minterFacets(
        address admin
    ) internal returns (IDiamondCutFacet.FacetCut[] memory, Diamond.Initialization memory) {
        address configurationFacetAddress = address(new ConfigurationFacet());
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](9);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new MintFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("MintFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new BurnFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new StateFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("StateFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: configurationFacetAddress,
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("ConfigurationFacet")
        });
        _diamondCut[4] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new DepositWithdrawFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("DepositWithdrawFacet")
        });
        _diamondCut[5] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new BurnHelperFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("BurnHelperFacet")
        });
        _diamondCut[6] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new AccountStateFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("AccountStateFacet")
        });
        _diamondCut[7] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new LiquidationFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("LiquidationFacet")
        });
        _diamondCut[8] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SafetyCouncilFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SafetyCouncilFacet")
        });

        bytes memory initData = abi.encodeWithSelector(ConfigurationFacet.initialize.selector, getInitializer(admin));
        return (_diamondCut, Diamond.Initialization(configurationFacetAddress, initData));
    }

    function scdpFacets() internal returns (IDiamondCutFacet.FacetCut[] memory, Diamond.Initialization memory) {
        address configurationFacetAddress = address(new SCDPConfigFacet());
        IDiamondCutFacet.FacetCut[] memory _diamondCut = new IDiamondCutFacet.FacetCut[](4);
        _diamondCut[0] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SCDPFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPFacet")
        });
        _diamondCut[1] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SCDPStateFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPStateFacet")
        });
        _diamondCut[2] = IDiamondCutFacet.FacetCut({
            facetAddress: configurationFacetAddress,
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPConfigFacet")
        });
        _diamondCut[3] = IDiamondCutFacet.FacetCut({
            facetAddress: address(new SCDPSwapFacet()),
            action: IDiamondCutFacet.FacetCutAction.Add,
            functionSelectors: DiamondHelper.getSelectorsFromArtifact("SCDPSwapFacet")
        });

        bytes memory initData = abi.encodeWithSelector(
            SCDPConfigFacet.initialize.selector,
            SCDPInitArgs({swapFeeRecipient: TREASURY, mcr: 2e18, lt: 1.5e18})
        );
        return (_diamondCut, Diamond.Initialization(configurationFacetAddress, initData));
    }
}

library LibSafe {
    address public constant USER1 = address(0x011);
    address public constant USER2 = address(0x022);
    address public constant USER3 = address(0x033);
    address public constant USER4 = address(0x044);

    function createSafe(address admin) internal returns (GnosisSafeProxy) {
        GnosisSafeL2 masterCopy = new GnosisSafeL2();
        GnosisSafeProxyFactory proxyFactory = new GnosisSafeProxyFactory();
        address[] memory councilUsers = new address[](5);
        councilUsers[0] = (admin);
        councilUsers[1] = (USER1);
        councilUsers[2] = (USER2);
        councilUsers[3] = (USER3);
        councilUsers[4] = (USER4);

        return
            proxyFactory.createProxy(
                address(masterCopy),
                abi.encodeWithSelector(
                    masterCopy.setup.selector,
                    councilUsers,
                    3,
                    address(0),
                    "0x",
                    address(0),
                    address(0),
                    0,
                    admin
                )
            );
    }
}
