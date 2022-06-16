import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { BigNumber, extractEventFromTxReceipt } from "@utils";
import { getLogger } from "@utils/deployment";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { executeContractCallWithSigners } from "@utils/gnosis";
import { GnosisSafeL2__factory } from "types/typechain/factories/GnosisSafeL2__factory";
import { GnosisSafeL2 } from "types/typechain/GnosisSafeL2";
import { GnosisSafeProxyFactory, ProxyCreationEvent } from "types/typechain/GnosisSafeProxyFactory";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("multisig");
    const { ethers, deployments } = hre;

    // Multisig signers
    const { deployer, devTwo, extOne, extTwo, extThree } = await ethers.getNamedSigners();

    // Get the factory
    const Factory = await ethers.getContract<GnosisSafeProxyFactory>("GnosisSafeProxyFactory");

    // Local mastercopy
    const MasterCopy = await ethers.getContract<GnosisSafeL2>("GnosisSafeL2");
    const ReentrancyGuard = await ethers.getContract("ReentrancyTransactionGuard");
    // Multisig users
    const safeUsers = [deployer, devTwo, extOne, extTwo, extThree];

    const creationArgs = [
        safeUsers.map(user => user.address),
        BigNumber.from(3),
        ethers.constants.AddressZero,
        "0x",
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero,
    ] as const;

    // Encoded params for setup
    const creationTx = await MasterCopy.populateTransaction.setup(...creationArgs);

    const tx = await Factory.createProxy(MasterCopy.address, creationTx.data);

    const creationEvent = await extractEventFromTxReceipt<ProxyCreationEvent>(tx, "ProxyCreation");

    const receipt = await tx.wait();

    const SafeProxy = await ethers.getContractAt<GnosisSafeL2>(GnosisSafeL2__factory.abi, creationEvent.args.proxy);

    const SafeDeployment = await deployments.get("GnosisSafeL2");

    await deployments.save("Multisig", {
        abi: SafeDeployment.abi,
        address: creationEvent.args.proxy,
        args: [...creationArgs],
        receipt: receipt,
    });

    // Test utility to execute the multisig upgrade
    await executeContractCallWithSigners(
        SafeProxy,
        SafeProxy,
        "setGuard",
        [ReentrancyGuard.address],
        [deployer, devTwo, extOne],
    );

    logger.success("Multisig succesfully deployed through proxyFactory @", SafeProxy.address);
    hre.Multisig = SafeProxy;
};

deploy.tags = ["local", "gnosis-safe"];
export default deploy;