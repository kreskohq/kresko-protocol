import { deployWithSignatures } from "@utils/deployment";
import { defaultKrAssetArgs, defaultSupplyLimit } from "@utils/test/mocks";
import { Role } from "@utils/test/roles";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { anchorTokenPrefix } from "@deploy-config/shared";
import type { KISS, KISSConverter, KreskoAssetAnchor, MockERC20 } from "types";

task("deploy-kiss")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("amount", "Amount to mint to deployer", 1_000_000_000, types.float)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const users = hre.users;
        const deploy = deployWithSignatures(hre);

        const { amount, decimals } = taskArgs;
        const [KISSContract] = await deploy<KISS>("KISS", {
            from: users.deployer.address,
            contract: "KISS",
            log: true,
            args: ["KISS", "KISS", decimals, hre.Diamond.address],
        });

        const DAI = await hre.ethers.getContract<MockERC20>("DAI");

        const underlyings = [DAI.address];
        const [KISSConverter] = await deploy<KISSConverter>("KISSConverter", {
            from: users.deployer.address,
            log: true,
            args: [KISSContract.address, underlyings],
        });

        await KISSContract.grantRole(await KISSContract.OPERATOR_ROLE(), KISSConverter.address);

        await DAI.approve(KISSConverter.address, hre.ethers.constants.MaxUint256);
        await KISSContract.approve(KISSConverter.address, hre.ethers.constants.MaxUint256);

        await KISSConverter.issue(users.deployer.address, DAI.address, hre.toBig(amount, decimals));

        const kreskoAssetAnchorInitArgs = [
            KISSContract.address,
            anchorTokenPrefix + "KISS",
            anchorTokenPrefix + "KISS",
            users.deployer.address,
        ];
        const [KISSUselessAnchor] = await deploy<KreskoAssetAnchor>(anchorTokenPrefix + "KISS", {
            from: users.deployer.address,
            log: true,
            contract: "KreskoAssetAnchor",
            args: [KISSContract.address],
            proxy: {
                owner: users.deployer.address,
                proxyContract: "OptimizedTransparentProxy",
                execute: {
                    methodName: "initialize",
                    args: kreskoAssetAnchorInitArgs,
                },
            },
        });
        const asset: KrAsset = {
            address: KISSContract.address,
            contract: KISSContract as unknown as KreskoAsset,
            anchor: KISSUselessAnchor,
            deployArgs: {
                name: "KISS",
                price: 1,
                factor: 1,
                supplyLimit: defaultSupplyLimit,
                closeFee: defaultKrAssetArgs.closeFee,
                openFee: defaultKrAssetArgs.openFee,
            },

            kresko: async () => await hre.Diamond.kreskoAsset(KISSContract.address),
            getPrice: async () => hre.toBig(1, 8),
            priceAggregator: undefined,
            priceFeed: undefined,
        };
        const hasRole = await KISSContract.hasRole(Role.OPERATOR, hre.Diamond.address);
        const kresko = await KISSContract.kresko();
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
            anchor: KISSUselessAnchor,
        };
    });
