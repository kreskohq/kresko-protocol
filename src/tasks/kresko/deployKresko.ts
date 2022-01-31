import { deployWithSignatures } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:kresko")
    .addOptionalParam("burnFee", "Burn fee", process.env.BURN_FEE)
    .addOptionalParam("closeFactor", "Close factor", process.env.CLOSE_FACTOR)
    .addOptionalParam("feeRecipient", "Burn fee recipient", process.env.FEE_RECIPIENT_ADDRESS, types.string)
    .addOptionalParam(
        "liquidationIncentiveMultiplier",
        "Liquidation incentive multiplier",
        process.env.LIQUIDATION_INCENTIVE,
    )
    .addOptionalParam(
        "minCollaterRatio",
        "Minimum collateralization ratio",
        process.env.MINIMUM_COLLATERALIZATION_RATIO,
    )
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts, ethers, deployments } = hre;
        const { admin } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);
        const { formatEther } = ethers.utils;
        const { burnFee, closeFactor, feeRecipient, liquidationIncentiveMultiplier, minCollaterRatio } = taskArgs;

        const [Kresko, , deployment] = await deploy<Kresko>("Kresko", {
            from: admin,
            log: true,
            proxy: {
                proxyContract: "OptimizedTransparentProxy",
                execute: {
                    methodName: "initialize",
                    args: [
                        toFixedPoint(burnFee),
                        toFixedPoint(closeFactor),
                        feeRecipient,
                        toFixedPoint(liquidationIncentiveMultiplier),
                        toFixedPoint(minCollaterRatio),
                    ],
                },
            },
        });

        const ProxyAdmin = await deployments.get("DefaultProxyAdmin");

        const initValuesOnChain: KreskoConstructor = {
            burnFee: formatEther(await Kresko.burnFee()),
            liquidationIncentive: formatEther(await Kresko.liquidationIncentiveMultiplier()),
            feeRecipient: await Kresko.feeRecipient(),
            minimumCollateralizationRatio: formatEther(await Kresko.minimumCollateralizationRatio()),
            closeFactor: formatEther(await Kresko.closeFactor()),
        };
        const contracts = {
            ProxyAdmin: ProxyAdmin.address,
            "Kresko (Proxy)": Kresko.address,
            "Kresko Implementation": deployment.implementation,
            txHash: deployment.transactionHash,
        };
        console.table(contracts);

        hre.kresko = Kresko;

        console.table(initValuesOnChain);
    });
