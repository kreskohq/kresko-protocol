import { toFixedPoint } from "@utils";
import { getLogger } from "@utils/deployment";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
    const loggerGeneral = getLogger("general");
    const logger = getLogger("deploy-oracle");
    loggerGeneral.log("Starting deployment to Aurora Testnet");
    const { getNamedAccounts } = hre;

    const { priceFeedValidator } = await getNamedAccounts();
    // USD
    const USDCFeed = await hre.run("deployone:fluxpricefeed", {
        name: "USD",
        decimals: 8,
        description: "/USD",
        validator: priceFeedValidator,
    });
    let tx = await USDCFeed.transmit(toFixedPoint("1", 8));
    await tx.wait(2);

    // ETH
    const ethusd = await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
    });
    tx = await ethusd.transmit(toFixedPoint("1109.24", 8));
    await tx.wait(2);

    // GOLD
    const goldusd = await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
    });

    tx = await goldusd.transmit(toFixedPoint("34.52", 8));

    await tx.wait(2);
    // TSLA
    const tslausd = await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
    });

    tx = await tslausd.transmit(toFixedPoint("671.38", 8));
    await tx.wait(2);

    // QQQ
    const qqqusd = await hre.run("deployone:fluxpricefeed", {
        name: "QQQUSD",
        decimals: 8,
        description: "QQQ/USD",
        validator: priceFeedValidator,
    });

    tx = await qqqusd.transmit(toFixedPoint("283.3", 8));
    await tx.wait(2);

    // GME
    const gmeusd = await hre.run("deployone:fluxpricefeed", {
        name: "GMEUSD",
        decimals: 8,
        description: "GME/USD",
        validator: priceFeedValidator,
    });

    tx = await gmeusd.transmit(toFixedPoint("121.98", 8));
    await tx.wait(2);

    // AURORA
    const aurorausd = await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
    });

    tx = await aurorausd.transmit(toFixedPoint("1.32", 8));
    await tx.wait(2);

    // NEAR
    const nearusd = await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
    });

    tx = await nearusd.transmit(toFixedPoint("3.48", 8));
    await tx.wait(2);
    logger.success("All price feeds deployed");
};

func.tags = ["auroratest", "auroratest-oracles"];

export default func;
