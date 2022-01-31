import hre from "hardhat";
import { KreskoAsset, Token, Kresko } from "types/contracts";
import { fromBig, toBig } from "@utils/numbers";

async function main() {
    const { ethers, getNamedAccounts } = hre;

    const { admin } = await getNamedAccounts();
    const Dollar = await ethers.getContract<Token>("Dollar");
    const Kresko = await ethers.getContract<Kresko>("Kresko");

    // let tx = await Dollar.approve(Kresko.address, ethers.constants.MaxUint256);
    // await tx.wait(4);

    let tx = await Kresko.depositCollateral(Dollar.address, toBig(4000));
    await tx.wait(2);

    const KrGold = await ethers.getContract<KreskoAsset>("KrGold");

    tx = await Kresko.mintKreskoAsset(KrGold.address, toBig(2.2));
    await tx.wait(2);

    console.log("succesfully deposited collateral and minted kreskoAsset");

    const minvalue = await Kresko.getAccountMinimumCollateralValue(admin);
    const collateralValue = await Kresko.getAccountCollateralValue(admin);

    const min = minvalue.rawValue.div(toBig("18")).toNumber();
    const coll = collateralValue.rawValue.div(toBig("18")).toNumber();
    const factor = min / coll;
    console.log(Number(factor));

    tx = await Kresko.burnKreskoAsset(KrGold.address, toBig("1.2"), 0);

    await tx.wait(2);
    console.log("Burned");
}

main()
    .then(() => {
        console.log("script completed");
        process.exit(0);
    })
    .catch(e => {
        console.log("script errored", e);
    });
