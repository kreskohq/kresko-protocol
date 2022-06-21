/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import hre from "hardhat";
const { ethers } = hre;

export async function createKrAsset(name: string, symbol: string, decimals = 18) {
    const { deployer } = await ethers.getNamedSigners();
    const kresko = hre.Diamond;
    const kreskoAssetInitializerArgs = [name, symbol, decimals, deployer, kresko.address];

    const [KreskoAsset] = await hre.deploy<KreskoAsset>(symbol + "-e", {
        from: deployer.address,
        log: true,
        contract: "KreskoAsset",
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                init: "initialize",
                args: kreskoAssetInitializerArgs,
            },
        },
    });

    const fixedKreskoAssetInitializerArgs = [KreskoAsset.address, name, symbol, deployer];

    const [FixedKreskoAsset] = await hre.deploy(symbol, {
        from: deployer.address,
        log: true,
        contract: "FixedKreskoAsset",
        args: [KreskoAsset.address],
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                init: "initialize",
                args: fixedKreskoAssetInitializerArgs,
            },
        },
    });

    hre.krAssets.push([KreskoAsset, FixedKreskoAsset]);

    return [KreskoAsset, FixedKreskoAsset];
}
