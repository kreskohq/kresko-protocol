import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { toBig } from "@utils/numbers";
import { sleep } from "@utils/deployment";
import { KreskoViewer } from "types";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, _hre) {
    const { getNamedAccounts, ethers } = _hre;
    const { userFive } = await getNamedAccounts();
    const { userFive: userFiveSigner } = await ethers.getNamedSigners();

    const KreskoViewer = await ethers.getContract<KreskoViewer>("KreskoViewer");
    const Kresko = await ethers.getContract<Kresko>("Kresko");
    const user = await Kresko.getAccountCollateralValue(userFive);
    // const user = await KreskoViewer.healthFactorFor(userFive);

    console.log(user);
});
