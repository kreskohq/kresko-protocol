import { task } from "hardhat/config";

task("print-deployments", "Prints the list of deployment addresses", async () => {
    const deployments = await hre.deployments.all();
    const docs = [];
    for (const [name, deployment] of Object.entries(deployments)) {
        console.log(`${name}: ${deployment.address}`);
        docs.push(
            `${name},  [${deployment.address}](https://goerli-optimism.etherscan.io/address/${deployment.address})`,
        );
    }

    console.log(docs.join("\n"));
});
