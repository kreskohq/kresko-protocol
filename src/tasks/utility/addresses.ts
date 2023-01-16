import { task } from "hardhat/config";

task("addresses", "Prints the list of addresses", async () => {
    const deployments = await hre.deployments.all();
    for (const [name, deployment] of Object.entries(deployments)) {
        console.log(name, deployment.address);
    }
});
