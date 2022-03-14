import { fromBig, toFixedPoint } from "@utils";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre) {
    const { priceFeeds, getNamedAccounts } = hre;

    const { priceFeedValidator } = await getNamedAccounts();
    // USD
    await hre.run("deployone:fluxpricefeed", {
        name: "USD",
        decimals: 8,
        description: "/USD",
        validator: priceFeedValidator,
        wait: 5,
    });

    let tx;
    tx = await priceFeeds["/USD"].transmit(toFixedPoint("1", 8));
    await tx.wait(5);
    const usdPrice = fromBig(await priceFeeds["/USD"].latestAnswer(), 8);
    console.log("USD price set at: ", usdPrice);

    // ETH
    await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
        wait: 5,
    });
    tx = await priceFeeds["ETH/USD"].transmit(toFixedPoint("2605.4", 8));
    await tx.wait(5);
    console.log("eth price set");

    // GOLD
    await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
        wait: 5,
    });
    tx = await priceFeeds["GOLD/USD"].transmit(toFixedPoint("1962", 8));
    await tx.wait(5);

    const goldPrice = await priceFeeds["GOLD/USD"].latestAnswer();
    console.log("gold price", fromBig(goldPrice, 8));

    // TSLA
    await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
        wait: 1,
    });
    tx = await priceFeeds["TSLA/USD"].transmit(toFixedPoint("845.87", 8));
    await tx.wait(5);

    const tslaprice = await priceFeeds["TSLA/USD"].latestAnswer();
    console.log("tsla price", fromBig(tslaprice, 8));

    // QQQ
    await hre.run("deployone:fluxpricefeed", {
        name: "QQQUSD",
        decimals: 8,
        description: "QQQ/USD",
        validator: priceFeedValidator,
    });
    tx = await priceFeeds["QQQ/USD"].transmit(toFixedPoint("339.09", 8));
    await tx.wait(5);

    const qqqPrice = await priceFeeds["QQQ/USD"].latestAnswer();
    console.log("qqq price", fromBig(qqqPrice, 8));

    // AURORA
    await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
        wait: 5,
    });
    tx = await priceFeeds["AURORA/USD"].transmit(toFixedPoint("8.41", 8));
    await tx.wait(5);

    const auroraPrice = await priceFeeds["AURORA/USD"].latestAnswer();
    console.log("aurora price", fromBig(auroraPrice, 8));

    // NEAR
    await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
        wait: 5,
    });
    tx = await priceFeeds["NEAR/USD"].transmit(toFixedPoint("11.41", 8));
    await tx.wait(5);
    console.log("near price set");
    console.log("all prices set");
};
export default func;

func.tags = ["auroratest", "auroratest-oracles"];
