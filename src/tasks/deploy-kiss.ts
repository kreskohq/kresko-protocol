import { getDeploymentUsers } from "@deploy-config/shared";
import { getLogger } from "@kreskolabs/lib";
import { defaultKrAssetArgs } from "@utils/test/mocks";
import { Role } from "@utils/test/roles";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_DEPLOY_KISS } from "./names";

const logger = getLogger(TASK_DEPLOY_KISS, true);

task(TASK_DEPLOY_KISS)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (_taskArgs: TaskArguments, hre) {
        logger.log(`Deploying KISS`);

        const { multisig } = await getDeploymentUsers(hre);
        const { deployer } = await hre.ethers.getNamedSigners();

        const args = {
            name: "KISS",
            symbol: "KISS",
            decimals: 18,
            admin: multisig,
            operator: hre.Diamond.address,
        };

        const [KISSContract] = await hre.deploy("KISS", {
            from: deployer.address,
            contract: "KISS",
            log: true,
            args: [args.name, args.symbol, args.decimals, args.admin, args.operator],
        });
        logger.log(`KISS deployed at ${KISSContract.address}, checking roles...`);
        const hasRole = await KISSContract.hasRole(Role.OPERATOR, args.operator);
        const hasRoleAdmin = await KISSContract.hasRole(Role.ADMIN, args.admin);

        if (!hasRoleAdmin) {
            throw new Error(`Multisig is missing Role.ADMIN`);
        }
        if (!hasRole) {
            throw new Error(`Diamond is missing Role.OPERATOR`);
        }
        logger.success(`KISS succesfully deployed @ ${KISSContract.address}`);

        // Add to runtime for tests and further scripts
        const asset = {
            address: KISSContract.address,
            contract: KISSContract,
            deployArgs: {
                name: "KISS",
                price: 1,
                factor: 1,
                supplyLimit: 1_000_000_000,
                marketOpen: true,
                closeFee: defaultKrAssetArgs.closeFee,
                openFee: defaultKrAssetArgs.openFee,
            },
            mocks: {} as any,
            kresko: async () => await hre.Diamond.kreskoAsset(KISSContract.address),
            getPrice: async () => hre.toBig(1, 8),
            priceFeed: {} as any,
        };

        const found = hre.krAssets.findIndex(c => c.address === asset.address);

        if (found === -1) {
            // @ts-expect-error
            hre.krAssets.push(asset);
            // @ts-expect-error
            hre.allAssets.push(asset);
        } else {
            // @ts-expect-error
            hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
            // @ts-expect-error
            hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
        }
        return {
            contract: KISSContract,
        };
    });
