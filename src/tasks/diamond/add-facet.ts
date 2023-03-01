import { getLogger } from "@kreskolabs/lib";
import { constants } from "ethers";
import { FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

const TASK_NAME = "add-facet";

export type AddFacetParams<T> = {
    initializerName: keyof TC;
    initializerArgs: T;
};

task(TASK_NAME)
    .addParam("name", "Artifact/Contract name of the facet")
    .addOptionalParam(
        "initializerName",
        "Contract to deploy and delegatecall to when adding the facet",
        "",
        types.string,
    )
    .addOptionalParam("internalInitializer", "facet has its own initializer", false, types.boolean)
    .addOptionalParam("initializerArgs", "Address to delegatecall to when adding the facet", "", types.json)
    .setAction(async function ({ name, initializerName, internalInitializer, initializerArgs }: TaskArguments, hre) {
        const logger = getLogger(TASK_NAME);
        const { deployments, getUsers } = hre;
        const { deployer } = await getUsers();

        const DiamondDeployment = await hre.deployments.getOrNull("Diamond");
        if (!DiamondDeployment) {
            throw new Error(`Trying to add facet but no diamond deployed @ ${hre.network.name}`);
        }

        const Diamond = await hre.getContractOrFork("Kresko");

        // Single facet addition, maps all functions contained
        const [Facet, Signatures] = await hre.deploy(name, {
            from: deployer.address,
        });

        const Cut: FacetCut = {
            facetAddress: Facet.address,
            functionSelectors: Signatures,
            action: FacetCutAction.Add,
        };

        let initializer: DiamondCutInitializer;
        if (!internalInitializer) {
            const InitializerArtifact = await hre.deployments.getOrNull(initializerName);

            if (InitializerArtifact) {
                if (!initializerArgs) {
                    logger.log("Adding facet with initializer but no parameters were supplied");
                    initializerArgs = "0x";
                } else {
                    logger.log("Adding facet with initializer", initializerName, "params", initializerArgs);
                }
                const [InitializerContract] = await hre.deploy(initializerName);
                const tx = await InitializerContract.populateTransaction.initialize(initializerArgs);
                if (!tx.to || !tx.data) {
                    throw new Error("Initializer transaction is missing to or data");
                }
                initializer = [tx.to, tx.data];
            } else {
                initializer = [constants.AddressZero, "0x"];
                logger.log("Adding facet with no initializer");
            }
        } else {
            const tx = await Facet.populateTransaction.initialize(initializerArgs);
            if (!tx.to || !tx.data) {
                throw new Error("Initializer transaction is missing to or data");
            }
            initializer = [tx.to, tx.data];
        }
        const tx = await Diamond.diamondCut([Cut], ...initializer);

        const receipt = await tx.wait();

        const facets = (await Diamond.facets()).map(f => ({
            facetAddress: f.facetAddress,
            functionSelectors: f.functionSelectors,
        }));

        const facet = facets.find(f => f.facetAddress === Facet.address);
        if (!facet) {
            logger.error("Facet add failed @ ", Facet.address);
            logger.error(
                "All facets found:",
                facets.map(f => f.facetAddress),
            );
            throw new Error("Error adding a facet");
        } else {
            DiamondDeployment.facets = facets;
            await deployments.save("Diamond", DiamondDeployment);
            if (hre.network.live) {
                logger.log(
                    "New facet saved to deployment file, you should update the contracts package with the new ABI",
                );
            }
            logger.success(
                "Facet added @",
                Facet.address,
                "with ",
                Signatures.length,
                " functions - ",
                "txHash:",
                receipt.transactionHash,
            );
            hre.DiamondDeployment = DiamondDeployment;
        }
        return Facet;
    });
