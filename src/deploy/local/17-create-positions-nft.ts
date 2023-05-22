import { getPositionsInitializer } from "@deploy-config/shared";
import { getLogger } from "@kreskolabs/lib";
import { FacetCutAction } from "hardhat-deploy/dist/types";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("create-positions-nft");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const facets = [
        "DiamondCutFacet",
        "DiamondLoupeFacet",
        "DiamondOwnershipFacet",
        "LayerZeroFacet",
        "ERC721Facet",
        "PositionsFacet",
        "PositionsConfigFacet",
    ] as const;
    const abis = [];
    const initFacets = [];
    for (const facet of facets) {
        const [, sigs, facetDeployment] = await hre.deploy(facet, {
            from: deployer,
            log: true,
        });

        // const args = await hre.getFacetCut(facet, 0, sigs);
        const facetCutAdd = {
            facetAddress: facetDeployment.address,
            action: FacetCutAction.Add,
            functionSelectors: sigs,
        };
        const Artifact = await hre.deployments.getArtifact(facet);
        initFacets.push(facetCutAdd);
        abis.push(Artifact.abi);
    }

    const initializer = await getPositionsInitializer(hre);
    const initializerContract = await hre.getContractOrFork("PositionsConfigFacet");
    const data = await initializerContract.populateTransaction.initialize(initializer.args);
    const init = [
        {
            initContract: data.to,
            initData: data.data,
        },
    ];
    const [PositionDiamond] = await hre.deploy("Diamond", {
        from: deployer,
        deploymentName: "Positions",
        log: true,
        args: [deployer, initFacets, init],
    });

    logger.success(`Deployed positions Diamond @ ${PositionDiamond.address}`);
};

deploy.tags = ["positions-nft"];
deploy.dependencies = ["diamond-init"];

deploy.skip = async hre => hre.network.live;

export default deploy;
