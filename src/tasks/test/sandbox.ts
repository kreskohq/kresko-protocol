/* eslint-disable @typescript-eslint/no-unused-vars */
import { RPC } from "@kreskolabs/configs";
import { getLogger } from "@kreskolabs/lib";
import { getAMMPairs } from "@kreskolabs/protocol-ts";
import { ethers } from "ethers";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { Kresko__factory } from "types/typechain";
// import { FluxPriceFeed__factory } from "types";
// import { flux } from "types/typechain/src/contracts/vendor";
const oracles = [
    {
        asset: "DAI",
        assetType: "collateral",
        feed: "DAI/USD",
        marketstatus: "0xD66D1405dCC754b0Fba9D879Dd131c1C1C547b5E",
        pricefeed: "0x31856c9a2A73aAee6100Aed852650f75c5F539D0",
    },
    {
        asset: "krBTC",
        assetType: "collateral",
        feed: "BTC/USD",
        marketstatus: "0x2764f4151aD29bDeF119A3a0B2529F94F7B2B879",
        pricefeed: "0xC16679B963CeB52089aD2d95312A5b85E318e9d2",
    },
    {
        asset: "WETH",
        assetType: "collateral",
        feed: "ETH/USD",
        marketstatus: "0x03F5285B18D7bF4E123b48c120a2e4A9C98d07a4",
        pricefeed: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
    },
    {
        asset: "SNX",
        assetType: "collateral",
        feed: "SNX/USD",
        marketstatus: "0x527E72fc56Cd81baeF889cB15B5f16b44C2C1B66",
        pricefeed: "0x89A7630f46B8c35A7fBBC4f6e4783f1E2DC715c6",
    },
    {
        asset: "krETH",
        assetType: "collateral",
        feed: "ETH/USD",
        marketstatus: "0x03F5285B18D7bF4E123b48c120a2e4A9C98d07a4",
        pricefeed: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
    },
    {
        asset: "krWTI",
        assetType: "collateral",
        feed: "WTI/USD",
        marketstatus: "0x93d656D80CB8F263c309b7Fa4a78a6821D08C3d0",
        pricefeed: "0xf3d88dBea0ea9DB336773EDe5Cc9bb3BB89Bc418",
    },
    {
        asset: "krXAU",
        assetType: "collateral",
        feed: "XAU/USD",
        marketstatus: "0xBBfcFE2FF22481F05BeFa8DAdA47942341d2B134",
        pricefeed: "0xA8828D339CEFEBf99934e5fdd938d1B4B9730bc3",
    },
    {
        asset: "krTSLA",
        assetType: "collateral",
        feed: "TSLA/USD",
        marketstatus: "0x1b9D6508052F263fC0640B39D1c898921e5C703F",
        pricefeed: "0x1b9D6508052F263fC0640B39D1c898921e5C703F",
    },
    {
        asset: "krETHRATE",
        assetType: "collateral",
        feed: "ETH/USD",
        marketstatus: "0x03F5285B18D7bF4E123b48c120a2e4A9C98d07a4",
        pricefeed: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
    },
    {
        asset: "krTSLA",
        assetType: "krAsset",
        feed: "TSLA/USD",
        marketstatus: "0x1b9D6508052F263fC0640B39D1c898921e5C703F",
        pricefeed: "0x1b9D6508052F263fC0640B39D1c898921e5C703F",
    },
    {
        asset: "krWTI",
        assetType: "krAsset",
        feed: "WTI/USD",
        marketstatus: "0x93d656D80CB8F263c309b7Fa4a78a6821D08C3d0",
        pricefeed: "0xf3d88dBea0ea9DB336773EDe5Cc9bb3BB89Bc418",
    },
    {
        asset: "krBTC",
        assetType: "krAsset",
        feed: "BTC/USD",
        marketstatus: "0x2764f4151aD29bDeF119A3a0B2529F94F7B2B879",
        pricefeed: "0xC16679B963CeB52089aD2d95312A5b85E318e9d2",
    },
    {
        asset: "krXAU",
        assetType: "krAsset",
        feed: "XAU/USD",
        marketstatus: "0xBBfcFE2FF22481F05BeFa8DAdA47942341d2B134",
        pricefeed: "0xA8828D339CEFEBf99934e5fdd938d1B4B9730bc3",
    },
    {
        asset: "krETH",
        assetType: "krAsset",
        feed: "ETH/USD",
        marketstatus: "0x03F5285B18D7bF4E123b48c120a2e4A9C98d07a4",
        pricefeed: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
    },
    {
        asset: "krETHRATE",
        assetType: "krAsset",
        feed: "ETH/USD",
        marketstatus: "0x03F5285B18D7bF4E123b48c120a2e4A9C98d07a4",
        pricefeed: "0x57241A37733983F97C4Ab06448F244A1E0Ca0ba8",
    },
    {
        asset: "KISS",
        assetType: "KISS",
        feed: "KISS/USD",
        marketstatus: "0x75821AB85348A5CcECA44c6ea6c29A45370a3481",
        pricefeed: "0x75821AB85348A5CcECA44c6ea6c29A45370a3481",
    },
];

const TASK_NAME = "sandbox";
const log = getLogger(TASK_NAME);
// const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
task(TASK_NAME).setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer, feedValidator, testnetFunder } = await hre.ethers.getNamedSigners();
    try {
        const deployment = await hre.deployments.get("Diamond");
        const kresko = {
            address: deployment.address,
            abi: Kresko__factory.abi,
        };
        const provider = new ethers.providers.JsonRpcProvider(RPC().optimism.goerli.quicknode);
        const staking = await hre.getContractOrFork("KrStaking");
        const assets = getAMMPairs("optimismGoerli");
        const col = assets.filter(a => a.tokenA.collateral).map(a => a.tokenA.address);
        const kr = assets.filter(a => a.tokenB.krAsset).map(a => a.tokenA.address);
        const kresko2 = (await hre.getContractOrFork("Kresko")).connect(provider);
        console.log("helo");
        const multicall3 = await hre.getContractOrFork("Multicall3");
        const tokens = [(await hre.getContractOrFork("KISS")).address];

        console.log("helo", hre.network, kresko2.provider);
        const events = await kresko2.queryFilter(kresko2.filters.KreskoAssetMinted(), 5933928, "latest");

        const usersPre = [...new Set(events.map(e => e.args.account))];
        const index = Math.floor(usersPre.length / 2);
        const users = usersPre.slice(0, index);
        const users2 = usersPre.slice(index, usersPre.length);

        // console.log(hre.fromBig(underwater))
        // // const is = await Diamond.isAccountLiquidatable('0xd21040ab567F989E0E751BE56f74ca38804e53e9')
        console.time("nonsend");
        const data2 = await Promise.all([
            kresko2.getCollateralRatiosFor(users),
            kresko2.getCollateralRatiosFor(users2),
            kresko2.getCollateralRatiosFor(users2),
            kresko2.getCollateralRatiosFor(users2),
            kresko2.getCollateralRatiosFor(users2),
            kresko2.getCollateralRatiosFor(users2),
        ]);
        console.timeEnd("nonsend");
        console.time("multisend");
        const data = await multicall3.callStatic.aggregate([
            {
                target: kresko.address,
                callData: kresko2.interface.encodeFunctionData("getCollateralRatiosFor", [users]),
            },
            {
                target: kresko.address,
                callData: kresko2.interface.encodeFunctionData("getCollateralRatiosFor", [users2]),
            },
            {
                target: kresko.address,
                callData: kresko2.interface.encodeFunctionData("getCollateralRatiosFor", [users2]),
            },
            {
                target: kresko.address,
                callData: kresko2.interface.encodeFunctionData("getCollateralRatiosFor", [users2]),
            },
            {
                target: kresko.address,
                callData: kresko2.interface.encodeFunctionData("getCollateralRatiosFor", [users2]),
            },
            {
                target: kresko.address,
                callData: kresko2.interface.encodeFunctionData("getCollateralRatiosFor", [users2]),
            },
        ]);
        console.timeEnd("multisend");

        console.log(data.map(v => kresko2.interface.decodeFunctionResult("getCollateralRatiosFor", v.toString())));

        console.log(data2.length);
        // log.log("Starting");

        // const call2 = kresko.interface.encodeFunctionData("getGlobalData");

        // const result = await multisend.callStatic.multiSend(call1);

        // await deployer.sendTransaction({
        //     to: feedValidator.address,
        //     value: hre.ethers.utils.parseEther("5"),
        // });
        // await deployer.sendTransaction({
        //     to: testnetFunder.address,
        //     value: hre.ethers.utils.parseEther("5"),
        // });
        // console.log(hre.network.name);
        // const kresko = await hre.getContractOrFork("Kresko");
        // console.log(kresko.address);
        log.log("Finished");
    } catch (e) {
        log.error(e);
    }

    return;
});
