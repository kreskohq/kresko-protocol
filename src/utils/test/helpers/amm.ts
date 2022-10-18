import type { UniswapV2Pair, UniswapV2Router02 } from "types";
import hre from "hardhat";
import { fromBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type AddLiquidityArgs = {
    user: SignerWithAddress;
    router: UniswapV2Router02;
    token0: Collateral | KrAsset;
    token1: Collateral | KrAsset;
    amount0: number | BigNumber;
    amount1: number | BigNumber;
};
type WithdrawLiquidityArgs = {
    user: SignerWithAddress;
    token0: Collateral | KrAsset;
    token1: Collateral | KrAsset;
};

export const addLiquidity = async (args: AddLiquidityArgs) => {
    const { token0, token1, amount0, amount1, user } = args;
    await token0.contract.connect(user).approve(hre.UniV2Router.address, hre.ethers.constants.MaxUint256);
    await token1.contract.connect(user).approve(hre.UniV2Router.address, hre.ethers.constants.MaxUint256);
    const convertA = typeof amount0 === "string" || typeof amount0 === "number";
    const convertB = typeof amount1 === "string" || typeof amount1 === "number";

    await hre.UniV2Router.connect(user).addLiquidity(
        token0.address,
        token1.address,
        convertA ? hre.toBig(amount0) : amount0,
        convertB ? hre.toBig(amount1) : amount1,
        "0",
        "0",
        user.address,
        (Date.now() / 1000 + 9000).toFixed(0),
    );
    return getPair(token0, token1);
};
export const withdrawAllLiquidity = async (args: WithdrawLiquidityArgs) => {
    const { token0, token1, user } = args;
    await token0.contract.connect(user).approve(hre.UniV2Router.address, hre.ethers.constants.MaxUint256);
    await token1.contract.connect(user).approve(hre.UniV2Router.address, hre.ethers.constants.MaxUint256);
    const pair = await getPair(token0, token1);
    await pair.approve(hre.UniV2Router.address, hre.ethers.constants.MaxUint256);
    const tx = await hre.UniV2Router.connect(user).removeLiquidity(
        token0.address,
        token1.address,
        await pair.balanceOf(user.address),
        "0",
        "0",
        user.address,
        (Date.now() / 1000 + 9000).toFixed(0),
    );
    await pair.sync();
    return pair;
};
type LPValueArgs = {
    user: SignerWithAddress;
    token0: Collateral | KrAsset;
    token1: Collateral | KrAsset;
    LPPair: UniswapV2Pair;
};
export const getLPTokenValue = async (args: LPValueArgs) => {
    const { token0, token1, LPPair, user } = args;
    const [tokenA, tokenB] = (await LPPair.token0()) === token0.address ? [token0, token1] : [token1, token0];
    const tokenAPrice = hre.fromBig(await tokenA.priceAggregator.latestAnswer(), 8);
    const tokenBPrice = hre.fromBig(await tokenB.priceAggregator.latestAnswer(), 8);
    const [rA, rB] = await LPPair.getReserves();
    const totalSupply = hre.fromBig(await LPPair.totalSupply());
    const price = (hre.fromBig(rA) * tokenAPrice + hre.fromBig(rB) * tokenBPrice) / totalSupply;
    const bal = hre.fromBig(await LPPair.balanceOf(user.address));
    return price * bal;
};

export const getPair = async (token0: Collateral | KrAsset, token1: Collateral | KrAsset) => {
    return hre.ethers.getContractAt(
        "UniswapV2Pair",
        await hre.UniV2Factory.getPair(token0.address, token1.address),
    ) as unknown as UniswapV2Pair;
};

export const getAMMPrices = async (token0: Collateral | KrAsset, token1: Collateral | KrAsset) => {
    const Pair = await getPair(token0, token1);
    const [r0, r1] = await Pair.getReserves();

    const r0Dec = fromBig(r0);
    const r1Dec = fromBig(r1);
    return {
        price0: Number(Number(r0Dec / r1Dec).toFixed(3)),
        price1: Number(Number(r1Dec / r0Dec).toFixed(3)),
    };
};

type LPValueArgsUsers = {
    users: SignerWithAddress[];
    token0: Collateral | KrAsset;
    token1: Collateral | KrAsset;
    LPPair: UniswapV2Pair;
};
export const getValuesForUsers = async (logDesc: string, args: LPValueArgsUsers) => {
    const { token0, token1, LPPair, users } = args;
    const [reserveA, reserveB] = await LPPair.getReserves();
    const bPrice = hre.fromBig(reserveB.mul(1e8).div(reserveA), 8);

    let i = 0;
    console.log(`-------- LP token values: ${logDesc} --------`);
    const results = [];
    for (const user of users) {
        i++;
        const LPValue = await getLPTokenValue({ user, token0, token1, LPPair });
        console.log(`User ${i} LP value:`, "$", LPValue);
        results.push(LPValue);
    }
    // console.log("reserveA", hre.fromBig(reserveA));
    // console.log("reserveB", hre.fromBig(reserveB));
    console.log(logDesc, "tokenB AMM price: ", "$", bPrice);
    console.log("----------------------------------");
    return {
        bPrice,
        results,
    };
};

type SwapArgs = {
    user: SignerWithAddress;
    amount: number | BigNumber;
    route: string[];
    router: UniswapV2Router02;
};
export const swap = async (args: SwapArgs) => {
    const { user, amount, router, route } = args;
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    return await router
        .connect(user)
        .swapExactTokensForTokens(
            convert ? hre.toBig(+amount) : amount,
            0,
            route,
            user.address,
            (Date.now() / 1000 + 9000).toFixed(0),
        );
};

export const getTWAPUpdaterFor = (pair: string) => async () => {
    await time.increase(60 * 60);
    await hre.UniV2Oracle.update(pair);
};
