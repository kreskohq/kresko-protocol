import { getLogger, getNamedEvent } from "@kreskolabs/lib";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ProxyCreationEvent } from "types/typechain/src/contracts/vendor/gnosis/GnosisSafeProxyFactory";
// import { executeContractCallWithSigners } from "@utils/gnosis";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("multisig");
    const { ethers, deployments } = hre;

    // Multisig signers
    const { deployer, devTwo, extOne, extTwo, devOne } = await ethers.getNamedSigners();

    // Get the factory
    const FactoryDeployment = await deployments.get("GnosisSafeProxyFactory");
    const Factory = await ethers.getContractAt(FactoryDeployment.abi, FactoryDeployment.address);

    // Local mastercopy
    const MasterCopyDeployment = await deployments.get("GnosisSafeL2");

    const MasterCopy = await ethers.getContractAt(MasterCopyDeployment.abi, MasterCopyDeployment.address);
    // TODO: bring ReentrancyGuard back into this deployment
    // const ReentrancyGuard = await hre.getContractOrFork("ReentrancyTransactionGuard");
    // Multisig users
    const safeUsers = [deployer, devOne, devTwo, extOne, extTwo];

    const creationArgs = [
        safeUsers.map(user => user.address),
        3,
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
    const SafeProxy = await ethers.getContractAt(SafeDeployment.abi, creationEvent.args.proxy);
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
