import type { KISS, KISSConverter, MockERC20 } from "types";
import type { TaskArguments } from "hardhat/types";
import { deployWithSignatures } from "@utils/deployment";
import { defaultSupplyLimit } from "@utils/test/mocks";
import { task, types } from "hardhat/config";

task("deploy-kiss")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("amount", "Amount to mint to deployer", 1_000_000_000, types.float)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);

        const { amount, decimals } = taskArgs;
        const [KISS] = await deploy<KISS>("KISS", {
            from: deployer,
            contract: "KISS",
            log: true,
            args: ["KISS", "KISS", decimals, hre.Diamond.address],
        });

        const DAI = await hre.ethers.getContract<MockERC20>("DAI");

        const underlyings = [DAI.address];
        const [KISSConverter] = await deploy<KISSConverter>("KISSConverter", {
            from: deployer,
            log: true,
            args: [KISS.address, underlyings],
        });

        await KISS.grantRole(await KISS.OPERATOR_ROLE(), KISSConverter.address);

        await DAI.approve(KISSConverter.address, hre.ethers.constants.MaxUint256);
        await KISS.approve(KISSConverter.address, hre.ethers.constants.MaxUint256);

        await KISSConverter.issue(deployer, DAI.address, hre.toBig(amount, decimals));
        console.log("Issued", amount, "of KISS to", deployer);

        const fixedKreskoAssetInitializerArgs = [KISS.address, "wKISS", "wKISS", deployer];
        const [wKISS] = await deploy<WrappedKreskoAsset>("wKISS", {
            from: deployer,
            log: true,
            contract: "WrappedKreskoAsset",
            args: [KISS.address],
            proxy: {
                owner: deployer,
                proxyContract: "OptimizedTransparentProxy",
                execute: {
                    methodName: "initialize",
                    args: fixedKreskoAssetInitializerArgs,
                },
            },
        });
        const asset: KrAsset = {
            address: KISS.address,
            contract: KISS as unknown as KreskoAsset,
            wrapper: wKISS,
            deployArgs: {
                name: "KISS",
                price: 1,
                mintable: false,
                factor: 1,
                supplyLimit: defaultSupplyLimit,
                closeFee: 0,
            },
            kresko: async () => await hre.Diamond.kreskoAsset(KISS.address),
            getPrice: async () => hre.toBig(1, 8),
            priceAggregator: undefined,
            priceFeed: undefined,
        };

        const found = hre.krAssets.findIndex(c => c.address === asset.address);
        if (found === -1) {
            hre.krAssets.push(asset);
            hre.allAssets.push(asset);
        } else {
            hre.krAssets = hre.krAssets.map(c => (c.address === c.address ? asset : c));
            hre.allAssets = hre.allAssets.map(c => (c.address === asset.address && c.collateral ? asset : c));
        }
        return {
            contract: KISS,
            wrapper: wKISS,
        };
    });
