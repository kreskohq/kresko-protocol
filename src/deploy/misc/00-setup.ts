import { DeployFunction } from "hardhat-deploy/types";
// import deployDiamondBase from "../testnet/01-create-diamond-base";
// import addMinterFacets from "../testnet/04-add-minter-facets";

const deploy: DeployFunction = async () => {
    const Multisig = await hre.ethers.getContract("Multisig");
    console.log("Multisig", Multisig.address);
    // await deployDiamondBase(hre);
    // await addMinterFacets(hre);

    // Create KISS first
    // const { contract: KISSContract } = await hre.run("deploy-kiss", {
    //     amount: assets.KISS.mintAmount,
    //     decimals: 18,
    // });
};

deploy.tags = ["partial"];

deploy.skip = async hre => {
    return hre.network.name !== "opgoerli";
};
export default deploy;
