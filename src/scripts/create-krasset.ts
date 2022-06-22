/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import hre from "hardhat";
const { ethers } = hre;
import minterConfig from "../config/minter";

export async function createKrAsset(name: string, symbol, decimals = 18) {
    const { deployer } = await ethers.getNamedSigners();
    const kresko = hre.Diamond;

    const underlyingSymbol = minterConfig.underlyingPrefix + symbol;
    const kreskoAssetInitializerArgs = [name, underlyingSymbol, decimals, deployer.address, kresko.address];

    const [KreskoAsset] = await hre.deploy<KreskoAsset>(underlyingSymbol, {
        from: deployer.address,
        log: true,
        contract: "KreskoAsset",
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: kreskoAssetInitializerArgs,
            },
        },
    });

    const fixedKreskoAssetInitializerArgs = [KreskoAsset.address, name, symbol, deployer.address];

    const [FixedKreskoAsset] = await hre.deploy(symbol, {
        from: deployer.address,
        log: true,
        contract: "FixedKreskoAsset",
        args: [KreskoAsset.address],
        proxy: {
            owner: deployer.address,
            proxyContract: "OptimizedTransparentProxy",
            execute: {
                methodName: "initialize",
                args: fixedKreskoAssetInitializerArgs,
            },
        },
    });

    hre.krAssets.push([KreskoAsset, FixedKreskoAsset]);

    return [KreskoAsset, FixedKreskoAsset];
}
