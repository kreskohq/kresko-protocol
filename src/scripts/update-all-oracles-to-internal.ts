import { testnetConfigs } from "@deploy-config/opgoerli";
import { fromBig, getLogger } from "@kreskolabs/lib";

export default async function run() {
    const { feedValidator, deployer } = await hre.ethers.getNamedSigners();
    const factory = await hre.getContractOrFork("FluxPriceFeedFactory");
    const logger = getLogger("sandbox");
    const Kresko = (await hre.getContractOrFork("Kresko")).connect(deployer);
    for (const collateral of testnetConfigs[hre.network.name].collaterals) {
        const fluxFeed = await factory.addressOfPricePair(collateral.oracle!.description, 8, feedValidator.address);
        const contract = await hre.getContractOrFork("ERC20Upgradeable", collateral.symbol);
        const asset = await Kresko.collateralAsset(contract.address);
        const id = await factory.getId(collateral.oracle!.description, 8, feedValidator.address);
        const latest = await factory.valueFor(id);
        console.log(
            `adding collateral ${collateral.symbol}`,
            "fluxfeed info",
            `price: ${fromBig(latest[0], 8)} marketOpen: ${latest[1]}`,
        );
        if (contract.address === hre.ethers.constants.AddressZero || fluxFeed === hre.ethers.constants.AddressZero) {
            throw new Error(`0 addr ${collateral.symbol}`);
        }
        const priceFeed = collateral.oracle!.chainlink ? collateral.oracle!.chainlink : fluxFeed;
        await Kresko.updateCollateralAsset(contract.address, {
            ...asset,
            oracle: priceFeed,
            marketStatusOracle: fluxFeed,
        });
    }
    for (const krAsset of testnetConfigs[hre.network.name].krAssets) {
        const fluxFeed = await factory.addressOfPricePair(krAsset.oracle!.description, 8, feedValidator.address);
        const contract = await hre.getContractOrFork("ERC20Upgradeable", krAsset.symbol);
        if (contract.address === hre.ethers.constants.AddressZero || fluxFeed === hre.ethers.constants.AddressZero) {
            throw new Error(`0 addr ${krAsset.symbol}`);
        }
        const asset = await Kresko.kreskoAsset(contract.address);

        const id = await factory.getId(krAsset.oracle!.description, 8, feedValidator.address);
        const latest = await factory.valueFor(id);
        console.log(
            `adding collateral ${krAsset.symbol}`,
            "fluxfeed info",
            `price: ${fromBig(latest[0], 8)} marketOpen: ${latest[1]}`,
        );
        const priceFeed = krAsset.oracle!.chainlink ? krAsset.oracle!.chainlink : fluxFeed;
        await Kresko.updateKreskoAsset(contract.address, {
            ...asset,
            oracle: priceFeed,
            marketStatusOracle: fluxFeed,
        });
    }
    logger.success("All price feeds updated");
}
