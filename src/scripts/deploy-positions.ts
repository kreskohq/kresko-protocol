import {
    collateralPoolFacets,
    getCollateralPoolInitializer,
    getPositionsInitializer,
    minterFacets,
} from "@deploy-config/shared";
import hre from "hardhat";
import { FacetCutAction } from "hardhat-deploy/dist/types";
import { updateFacets } from "./update-facets";
import { addFacets } from "./add-facets";
import { RAY, toBig } from "@kreskolabs/lib";

export const deployPositions = async () => {
    const { deployer } = await hre.getNamedAccounts();
    // deploy positions diamond with these facets
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
    const signer = await hre.ethers.getNamedSigner("deployer");
    console.log("signer", signer.address);
    for (const facet of facets) {
        const [, sigs, facetDeployment] = await hre.deploy(facet, {
            from: deployer,
            log: true,
        });

        const facetCutAdd = {
            facetAddress: facetDeployment.address,
            action: FacetCutAction.Add,
            functionSelectors: sigs,
        };
        const Artifact = await hre.deployments.getArtifact(facet);
        initFacets.push(facetCutAdd);
        abis.push(Artifact.abi);
    }

    const initializerPositions = await getPositionsInitializer(hre);
    const deployment = await hre.deployments.get("PositionsConfigFacet");
    const initializerContract = await hre.ethers.getContractAt("PositionsConfigFacet", deployment.address);
    const data = await initializerContract.populateTransaction.initialize(initializerPositions.args);
    const init = [
        {
            initContract: data.to,
            initData: data.data,
        },
    ];
    const [PositionDiamond] = await hre.deploy("Diamond", {
        deploymentName: "Positions",
        log: true,
        args: [deployer, initFacets, init],
    });

    console.log(`Deployed positions Diamond @ ${PositionDiamond.address}`);

    // update minter facets
    await updateFacets({
        facetNames: minterFacets,
    });

    // add collateral pool facets to minter
    const initializer = await getCollateralPoolInitializer(hre);

    await addFacets({
        names: collateralPoolFacets,
        initializerName: initializer.name,
        initializerArgs: initializer.args,
    });

    const Kresko = await hre.getContractOrFork("Kresko");
    const krETH = await hre.getContractOrFork("KreskoAsset", "krETH");
    const KISS = await hre.getContractOrFork("KISS");
    const krBTC = await hre.getContractOrFork("KreskoAsset", "krBTC");
    const DAI = await hre.getContractOrFork("MockERC20", "DAI");
    const krTSLA = await hre.getContractOrFork("KreskoAsset", "krTSLA");
    const WETH = await hre.ethers.getContractAt("WETH", "0x4200000000000000000000000000000000000006");

    const defaultConfig = {
        decimals: 18,
        liquidationIncentive: toBig(1.05),
        liquidityIndex: RAY,
    };

    await Kresko.enablePoolCollaterals(
        [DAI.address, krTSLA.address, WETH.address, krBTC.address, krETH.address, KISS.address],
        [defaultConfig, defaultConfig, defaultConfig, defaultConfig, defaultConfig, defaultConfig],
    );

    await Kresko.enablePoolKrAssets(
        [krTSLA.address, krBTC.address, krETH.address, KISS.address],
        [
            {
                closeFee: toBig(0.0025),
                openFee: toBig(0.0015),
                protocolFee: toBig(0.0025),
                supplyLimit: toBig(1000000),
            },
            {
                closeFee: toBig(0.0025),
                openFee: toBig(0.0015),
                protocolFee: toBig(0.0025),
                supplyLimit: toBig(1000000),
            },
            {
                closeFee: toBig(0.0025),
                openFee: toBig(0.0015),
                protocolFee: toBig(0.0025),
                supplyLimit: toBig(1000000),
            },
            {
                closeFee: toBig(0.0025),
                openFee: toBig(0.0025),
                protocolFee: toBig(0.0025),
                supplyLimit: toBig(1000000),
            },
        ],
    );

    await Kresko.setSwapPairs([
        {
            assetIn: KISS.address,
            assetOut: krBTC.address,
            enabled: true,
        },
        {
            assetIn: KISS.address,
            assetOut: krTSLA.address,
            enabled: true,
        },
        {
            assetIn: KISS.address,
            assetOut: krETH.address,
            enabled: true,
        },
        {
            assetIn: krBTC.address,
            assetOut: krETH.address,
            enabled: true,
        },
    ]);
};

deployPositions()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
