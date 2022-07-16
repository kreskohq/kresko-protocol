import { deployWithSignatures, getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("deploy:kresko")
    .addOptionalParam("burnFee", "Burn fee", process.env.BURN_FEE)
    .addOptionalParam("feeRecipient", "Burn fee recipient", process.env.FEE_RECIPIENT_ADDRESS, types.string)
    .addOptionalParam("liquidationIncentive", "Liquidation incentive multiplier", process.env.LIQUIDATION_INCENTIVE)
    .addOptionalParam(
        "minimumCollateralizationRatio",
        "Minimum collateralization ratio",
        process.env.MINIMUM_COLLATERALIZATION_RATIO,
    )
    .addOptionalParam("minimumDebtValue", "Minimum debt value", process.env.MINIMUM_DEBT_VALUE)
    .addOptionalParam("secondsUntilStalePrice", "Minimum debt value", process.env.SECONDS_UNTIL_PRICE_STALE)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts, ethers, deployments } = hre;
        const { admin, treasury } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);
        const { formatEther } = ethers.utils;

        const logger = getLogger("deployKresko", taskArgs.log);

        console.log(taskArgs);
        const [Kresko, , deployment] = await deploy<Kresko>("Kresko", {
            from: admin,
            log: taskArgs.log,
            proxy: {
                proxyContract: "OptimizedTransparentProxy",
                execute: {
                    methodName: "initialize",
                    args: [
                        toFixedPoint(taskArgs.burnFee),
                        treasury,
                        toFixedPoint(taskArgs.liquidationIncentive),
                        toFixedPoint(taskArgs.minimumCollateralizationRatio),
                        toFixedPoint(taskArgs.minimumDebtValue, 8),
                        taskArgs.secondsUntilStalePrice,
                    ],
                },
            },
        });
        // Deploy kresko viewer
        const [KreskoViewer] = await deploy("KreskoViewer", {
            from: admin,
            args: [Kresko.address],
        });

        if (taskArgs.log) {
            const ProxyAdmin = await deployments.get("DefaultProxyAdmin");
            const initValuesOnChain: KreskoConstructor = {
                burnFee: formatEther(await Kresko.burnFee()),
                liquidationIncentive: formatEther(await Kresko.liquidationIncentiveMultiplier()),
                feeRecipient: await Kresko.feeRecipient(),
                minimumCollateralizationRatio: formatEther(await Kresko.minimumCollateralizationRatio()),
                minimumDebtValue: formatEther(await Kresko.minimumDebtValue()),
                secondsUntilPriceStale: await Kresko.secondsUntilStalePrice(),
            };
            const contracts = {
                ProxyAdmin: ProxyAdmin.address,
                "Kresko (Proxy)": Kresko.address,
                "Kresko Implementation": deployment.implementation,
                KreskoViewer: KreskoViewer.address,
                txHash: deployment.transactionHash,
            };
            logger.table(contracts);
            logger.table(initValuesOnChain);
        }

        logger.success("Kresko succesfully deployed");
        hre.kresko = Kresko;
        return Kresko;
    });
