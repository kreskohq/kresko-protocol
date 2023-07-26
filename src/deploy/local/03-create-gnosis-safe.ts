import { getLogger, getNamedEvent } from "@kreskolabs/lib";
import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ProxyCreationEvent } from "types/typechain/src/contracts/vendor/gnosis/GnosisSafeProxyFactory";
// import { executeContractCallWithSigners } from "@utils/gnosis";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("multisig");
    const { ethers, deployments } = hre;

    // Multisig signers
    const { deployer, devTwo, extOne, extTwo } = await ethers.getNamedSigners();

    // Get the factory
    const Factory = await hre.getContractOrFork("GnosisSafeProxyFactory");

    // Local mastercopy
    const MasterCopy = await hre.getContractOrFork("GnosisSafeL2");
    // TODO: bring ReentrancyGuard back into this deployment
    // const ReentrancyGuard = await hre.getContractOrFork("ReentrancyTransactionGuard");
    // Multisig users
    const safeUsers = [deployer, devTwo, extOne, extTwo];

    const creationArgs = [
        safeUsers.map(user => user.address),
        BigNumber.from(1),
        ethers.constants.AddressZero,
        "0x",
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
    ] as const;

    // Encoded params for setup
    const creationTx = await MasterCopy.populateTransaction.setup(...creationArgs);

    if (!creationTx.data) throw new Error("No data found in gnosis creationTx");
    const tx = await Factory.createProxy(MasterCopy.address, creationTx.data);

    const creationEvent = await getNamedEvent<ProxyCreationEvent>(tx, "ProxyCreation");

    const receipt = await tx.wait();

    const SafeDeployment = await deployments.get("GnosisSafeL2");
    const SafeProxy = await ethers.getContractAt("GnosisSafeL2", creationEvent.args.proxy);
    await deployments.save("GnosisSafeL2", {
        abi: SafeDeployment.abi,
        address: creationEvent.args.proxy,
        args: [...creationArgs],
        receipt: receipt,
    });

    // Test utility to execute the multisig upgrade
    // await executeContractCallWithSigners(
    //     SafeProxy,
    //     SafeProxy,
    //     "setGuard",
    //     [ReentrancyGuard.address],
    //     [deployer, devTwo, extOne],
    // );

    logger.success("Multisig succesfully deployed through proxyFactory @", SafeProxy.address);
    hre.Multisig = SafeProxy;
};

deploy.tags = ["local", "gnosis-safe", "all"];
// deploy.skip = async hre => hre.network.live;

export default deploy;
