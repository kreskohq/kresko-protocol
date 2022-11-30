import { defaultKrAssetArgs } from "@utils/test/mocks";
import { Role } from "@utils/test/roles";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import type { KISS } from "types";

task("deploy-kiss")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("amount", "Amount to mint to deployer", 1_000_000_000, types.float)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const users = await hre.getUsers();

        const [KISSContract] = await hre.deploy<KISS>("KISS", {
            from: users.deployer.address,
            contract: "KISS",
            log: true,
            args: ["KISS", "KISS", 18, hre.Diamond.address],
        });

        const hasRole = await KISSContract.hasRole(Role.OPERATOR, hre.Diamond.address);
        const kresko = await KISSContract.kresko();

        const asset: KrAsset = {
            address: KISSContract.address,
            contract: KISSContract as unknown as KreskoAsset,
            deployArgs: {
                name: "KISS",
                price: 1,
                factor: 1,
                supplyLimit: 1_000_000_000,
                marketOpen: true,
                closeFee: defaultKrAssetArgs.closeFee,
                openFee: defaultKrAssetArgs.openFee,
            },

            kresko: async () => await hre.Diamond.kreskoAsset(KISSContract.address),
            getPrice: async () => hre.toBig(1, 8),
            priceAggregator: undefined,
            priceFeed: undefined,
        };

        if (!hasRole) {
            throw new Error(`NO ROLE ${hre.Diamond.address} ${kresko}`);
        }
        const found = hre.krAssets.findIndex(c => c.address === asset.address);

        if (found === -1) {
            hre.krAssets.push(asset);
            hre.allAssets.push(asset);
        } else {
            hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
            hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
        }
        return {
            contract: KISSContract,
        };
    });
