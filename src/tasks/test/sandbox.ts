import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { KreskoViewer } from "types";

task("test:viewer").setAction(async function (taskArgs: TaskArguments, hre) {
    const { getNamedAccounts, ethers } = hre;
    const { deployer } = await getNamedAccounts();
    // const deploy = deployWithSignatures(hre);

    const KreskoViewer = await ethers.getContract<KreskoViewer>("KreskoViewer");

    const balances = await KreskoViewer.getBalances(["0x259EC843BC69540a3Aafe07f7a411460d6733c11"], deployer);
    const allowances = await KreskoViewer.getAllowances(
        ["0x259EC843BC69540a3Aafe07f7a411460d6733c11"],
        deployer,
        deployer,
    );
    const metadatas = await KreskoViewer.getTokenMetadatas(["0x259EC843BC69540a3Aafe07f7a411460d6733c11"]);

    console.log({
        balances,
        allowances,
        metadatas,
    });
});
