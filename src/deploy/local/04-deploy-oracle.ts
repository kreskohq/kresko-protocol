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
    });

    await priceFeeds["/USD"].transmit(toFixedPoint(1));

    const usdPrice = fromBig(await priceFeeds["/USD"].latestAnswer());
    console.log("USD price set at: ", usdPrice);

    // ETH
    await hre.run("deployone:fluxpricefeed", {
        name: "ETHUSD",
        decimals: 8,
        description: "ETH/USD",
        validator: priceFeedValidator,
    });

    // GOLD
    await hre.run("deployone:fluxpricefeed", {
        name: "GOLDUSD",
        decimals: 8,
        description: "GOLD/USD",
        validator: priceFeedValidator,
    });

    // TSLA
    await hre.run("deployone:fluxpricefeed", {
        name: "TSLAUSD",
        decimals: 8,
        description: "TSLA/USD",
        validator: priceFeedValidator,
    });

    // AURORA
    await hre.run("deployone:fluxpricefeed", {
        name: "AURORAUSD",
        decimals: 8,
        description: "AURORA/USD",
        validator: priceFeedValidator,
    });

    // NEAR
    await hre.run("deployone:fluxpricefeed", {
        name: "NEARUSD",
        decimals: 8,
        description: "NEAR/USD",
        validator: priceFeedValidator,
    });
};
export default func;

func.tags = ["local", "local-oracles"];
