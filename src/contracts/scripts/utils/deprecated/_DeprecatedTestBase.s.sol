// solhint-disable
// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {IKISS, IKresko, IVault, _IDeployState} from "./_IDeployState.sol";
import {FacetScript, vmFFI} from "kresko-lib/utils/ffi/FacetScript.s.sol";
import {RsScript} from "kresko-lib/utils/ffi/RsScript.s.sol";
import {CommonInitArgs} from "common/Types.sol";
import {MinterInitArgs} from "minter/MTypes.sol";
import {FacetCut, Initializer, FacetCutAction} from "diamond/DSTypes.sol";
import {Diamond} from "diamond/Diamond.sol";
import {DiamondCutFacet} from "diamond/facets/DiamondCutFacet.sol";
import {DiamondStateFacet} from "diamond/facets/DiamondStateFacet.sol";
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
import {DiamondBomb} from "scripts/utils/DiamondBomb.sol";

import {DataFacet} from "periphery/facets/DataFacet.sol";

abstract contract _DeprecatedTestBase is
    _IDeployState,
    RsScript("./utils/rsPayload.js"),
    FacetScript("./utils/getFunctionSelectors.sh")
{
    uint256 internal constant FACET_COUNT = 23;
    uint256 internal constant INITIALIZER_COUNT = 3;
    address internal constant TEST_ADMIN = address(0xABABAB);
    address public constant TEST_TREASURY = address(0xFEE);
    uint48 internal constant SYNTH_WRAP_FEE_IN = 20;
    uint40 internal constant SYNTH_WRAP_FEE_OUT = 50;

    CoreConfig internal deployCfg;
    IKresko internal kresko;
    IKISS internal kiss;
    IVault internal vkiss;

    function deployDiamondOneTx(CoreConfig memory _cfg) internal returns (IKresko kresko_) {
        string[] memory cmd = new string[](2);
        cmd[0] = "./utils/getBytesAndSelectors.sh";
        cmd[1] = "./src/contracts/core/**/facets/*Facet.sol";

        (bytes[] memory creationCodes, bytes4[][] memory selectors) = abi.decode(vmFFI.ffi(cmd), (bytes[], bytes4[][]));
        (uint256[] memory initializers, bytes[] memory calldatas) = getInitializers(selectors, _cfg);
        kresko_ = IKresko(address(new DiamondBomb().create(_cfg.admin, creationCodes, selectors, initializers, calldatas)));
        rsInit(address(kresko_));
    }

    function getCommonInitArgs(CoreConfig memory _cfg) internal pure returns (CommonInitArgs memory init_) {
        init_.admin = _cfg.admin;
        init_.council = _cfg.council;
        init_.treasury = _cfg.treasury;
        init_.maxPriceDeviationPct = 0.05e4;
        init_.oracleDecimals = _cfg.oraclePrecision;
        init_.sequencerUptimeFeed = _cfg.seqFeed;
        init_.sequencerGracePeriodTime = 3600;
        init_.staleTime = _cfg.staleTime;
        init_.gatingManager = _cfg.gatingManager;
    }

    function getMinterInitArgs(CoreConfig memory _cfg) internal pure returns (MinterInitArgs memory init_) {
        init_.minCollateralRatio = _cfg.minterMcr;
        init_.liquidationThreshold = _cfg.minterLt;
        init_.minDebtValue = 10e8;
    }

    function getSCDPInitArgs(CoreConfig memory _cfg) internal pure returns (SCDPInitArgs memory init_) {
        init_.minCollateralRatio = _cfg.scdpMcr;
        init_.liquidationThreshold = _cfg.scdpLt;
        init_.coverThreshold = _cfg.coverThreshold;
        init_.coverIncentive = _cfg.coverIncentive;
        init_.sdiPricePrecision = _cfg.sdiPrecision;
    }

    function getInitializers(
        bytes4[][] memory selectors,
        CoreConfig memory _cfg
    ) internal pure returns (uint256[] memory initializers, bytes[] memory datas) {
        initializers = new uint256[](INITIALIZER_COUNT);
        datas = new bytes[](INITIALIZER_COUNT);
        bytes4[3] memory initSelectors = [
            CommonConfigurationFacet.initializeCommon.selector,
            MinterConfigurationFacet.initializeMinter.selector,
            SCDPConfigFacet.initializeSCDP.selector
        ];
        bytes[3] memory initDatas = [
            abi.encodeWithSelector(initSelectors[0], getCommonInitArgs(_cfg)),
            abi.encodeWithSelector(initSelectors[1], getMinterInitArgs(_cfg)),
            abi.encodeWithSelector(initSelectors[2], getSCDPInitArgs(_cfg))
        ];

        for (uint256 i; i < selectors.length; i++) {
            for (uint256 j; j < selectors[i].length; j++) {
                for (uint256 k; k < initSelectors.length; k++) {
                    if (selectors[i][j] == initSelectors[k]) {
                        initializers[k] = i;
                        datas[k] = initDatas[k];
                    }
                }
            }
        }
        require(initializers[INITIALIZER_COUNT - 1] != 0, "KreskoForgeBase: No initializers");
    }
}
