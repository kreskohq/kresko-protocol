import hre from "hardhat";
import { fromBig, toBig } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getBlockTimestamp } from "./calculations";

type AddLiquidityArgs = {
    user: SignerWithAddress;
    router: UniV2Router;
    token0: TestAsset;
    token1: TestAsset;
    amount0: number | BigNumber;
    amount1: number | BigNumber;
};
type WithdrawLiquidityArgs = {
    user: SignerWithAddress;
    token0: TestAsset;
    token1: TestAsset;
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
        convertA ? toBig(amount0) : amount0,
        convertB ? toBig(amount1) : amount1,
        "0",
        "0",
        user.address,
        +(await getBlockTimestamp()) + 1000,
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
        +(await getBlockTimestamp()) + 1000,
    );
    await pair.sync();
    return pair;
};
type LPValueArgs = {
    user: SignerWithAddress;
    token0: TestAsset;
    token1: TestAsset;
    LPPair: TC["UniswapV2Pair"];
};
export const getLPTokenValue = async (args: LPValueArgs) => {
    const { token0, token1, LPPair, user } = args;
    const [tokenA, tokenB] = (await LPPair.token0()) === token0.address ? [token0, token1] : [token1, token0];
    const tokenAPrice = fromBig(await tokenA.getPrice(), 8);
    const tokenBPrice = fromBig(await tokenB.getPrice(), 8);
    const [rA, rB] = await LPPair.getReserves();
    const totalSupply = fromBig(await LPPair.totalSupply());
    const price = (fromBig(rA) * tokenAPrice + fromBig(rB) * tokenBPrice) / totalSupply;
    const bal = fromBig(await LPPair.balanceOf(user.address));
    return price * bal;
};

export const getPair = async (token0: TestAsset, token1: TestAsset) => {
    return hre.ethers.getContractAt("UniswapV2Pair", await hre.UniV2Factory.getPair(token0.address, token1.address));
};

export const getAMMPrices = async (tokenA: TestAsset, tokenB: TestAsset) => {
    const Pair = await getPair(tokenA, tokenB);
    const token0 = await Pair.token0();
    const reserves = await Pair.getReserves();

    const [rA, rB] = token0 === tokenA.address ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]];

    const r0Dec = fromBig(rA);
    const r1Dec = fromBig(rB);
    return {
        price0: Number(Number(r0Dec / r1Dec).toFixed(3)),
        price1: Number(Number(r1Dec / r0Dec).toFixed(3)),
    };
};

type LPValueArgsUsers = {
    users: SignerWithAddress[];
    token0: TestAsset;
    token1: TestAsset;
    LPPair: TC["UniswapV2Pair"];
};
export const getValuesForUsers = async (logDesc: string, args: LPValueArgsUsers) => {
    const { token0, token1, LPPair, users } = args;
    const [reserveA, reserveB] = await LPPair.getReserves();
    const bPrice = fromBig(reserveB.mul(1e8).div(reserveA), 8);

    let i = 0;
    console.log(`-------- LP token values: ${logDesc} --------`);
    const results = [];
    for (const user of users) {
        i++;
        const LPValue = await getLPTokenValue({ user, token0, token1, LPPair });
        console.log(`User ${i} LP value:`, "$", LPValue);
        results.push(LPValue);
    }

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
    router: UniV2Router;
};
export const swap = async (args: SwapArgs) => {
    const { user, amount, router, route } = args;
    const convert = typeof args.amount === "string" || typeof args.amount === "number";
    return await router
        .connect(user)
        .swapExactTokensForTokens(
            convert ? toBig(+amount) : amount,
            0,
            route,
            user.address,
            +(await getBlockTimestamp()) + 1000,
        );
};

export const getTWAPUpdaterFor = (pair: string) => async () => {
    await time.increase(60 * 60);
    await hre.UniV2Oracle.update(pair);
};
