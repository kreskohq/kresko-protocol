import { task } from "hardhat/config";
import { TASK_PRINT_DEPLOYMENTS } from "../names";

task(TASK_PRINT_DEPLOYMENTS, "Prints the list of deployment addresses", async () => {
  const deployments = await hre.deployments.all();
  const docs = [];
  for (const [name, deployment] of Object.entries(deployments)) {
    console.log(`${name}: ${deployment.address}`);
    docs.push(`${name},  [${deployment.address}](https://goerli-optimism.etherscan.io/address/${deployment.address})`);
  }

  console.log(docs.join("\n"));
});
