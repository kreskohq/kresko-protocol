import { testnetConfigs } from "@deploy-config/testnet";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { FluxPriceFeedFactory } from "types";

task("update-oracles").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { feedValidator, operator } = await hre.ethers.getNamedSigners();
    const factory = await hre.ethers.getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    const logger = getLogger("sandbox");
    const Kresko = (await hre.ethers.getContract<Kresko>("Diamond")).connect(operator);
    for (const collateral of testnetConfigs[hre.network.name].collaterals) {
        const fluxFeed = await factory.addressOfPricePair(collateral.oracle.description, 8, feedValidator.address);
        const contract = await hre.ethers.getContract(collateral.symbol);
        const asset = await Kresko.collateralAsset(contract.address);
        if (contract.address === hre.ethers.constants.AddressZero || fluxFeed === hre.ethers.constants.AddressZero) {
            throw new Error(`0 addr ${collateral.symbol}`);
        }
        await Kresko.updateCollateralAsset(contract.address, asset.anchor, asset.factor.rawValue, fluxFeed);
    }
    for (const krAsset of testnetConfigs[hre.network.name].krAssets) {
        const fluxFeed = await factory.addressOfPricePair(krAsset.oracle.description, 8, feedValidator.address);
        const contract = await hre.ethers.getContract(krAsset.symbol);
        if (contract.address === hre.ethers.constants.AddressZero || fluxFeed === hre.ethers.constants.AddressZero) {
            throw new Error(`0 addr ${krAsset.symbol}`);
        }
        const asset = await Kresko.kreskoAsset(contract.address);
        await Kresko.updateKreskoAsset(
            contract.address,
            asset.anchor,
            asset.kFactor.rawValue,
            fluxFeed,
            asset.supplyLimit,
            asset.closeFee.rawValue,
            asset.openFee.rawValue,
        );
    }
    logger.success("All price feeds deployed");
});
