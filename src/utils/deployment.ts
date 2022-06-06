import { DeployOptions } from "@kreskolabs/hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { signatureFilters } from "src/contracts/diamond/diamond-config";

export const deployWithSignatures =
    (hre: HardhatRuntimeEnvironment) =>
    async <T extends Contract>(name: string, options?: DeployOptions): Promise<DeployResultWithSignatures<T>> => {
        const { getNamedAccounts, deployments, ethers } = hre;
        const { admin } = await getNamedAccounts();
        const { deploy } = deployments;
        const defaultOptions = {
            from: admin,
            log: true,
        };
        const deployment = await deploy(name, options ? { ...options } : defaultOptions);

        if (name === "Diamond") {
            console.log("GAS USED HERE", Number(deployment.receipt.gasUsed));
        }

        const implementation = await ethers.getContract<T>(name);
        return [
            implementation,
            implementation.interface.fragments
                .filter(
                    frag =>
                        frag.type !== "constructor" &&
                        !signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
                )
                .map(frag => ethers.utils.Interface.getSighash(frag)),
            deployment,
        ];
    };

export const getSignatures =
    (hre: HardhatRuntimeEnvironment) =>
    async <T extends Contract>(name: string) => {
        const implementation = await hre.ethers.getContract<T>(name);

        const fragments = implementation.interface.fragments
            .filter(
                frag =>
                    frag.type !== "constructor" && !signatureFilters.some(f => f.indexOf(frag.name.toLowerCase()) > -1),
            )
            .reduce<{ [key: string]: string }>((result, frag) => {
                result[frag.name] = hre.ethers.utils.Interface.getSighash(frag);
                return result;
            }, {});

        return fragments;
    };

export const getLogger = (prefix?: string, log = true) => ({
    warn: (...args: any[]) => log && console.warn(prefix, ...args),
    error: (...args: any[]) => log && console.error(prefix, ...args),
    log: (...args: any[]) =>
        log &&
        console.log(
            "\x1b[35m",
            "\x1b[1m",
            `${prefix}:`.padEnd(24),
            "\x1b[0m",
            ...args.flatMap(a => ["\x1b[37m", a, ""]),
            "\x1b[0m",
        ),
    success: (...args: any[]) =>
        log &&
        console.log(
            "\x1b[32m",
            "\x1b[1m",
            `${prefix}:`.padEnd(24),
            "\x1b[32m",
            ...args.flatMap(a => ["\x1b[32m", a, ""]),
            "\x1b[0m",
        ),
    table: (...args: any) => log && console.table(...args),
});

export function sleep(delay: number) {
    const start = new Date().getTime();
    while (new Date().getTime() < start + delay);
}

export async function getPriceFeeds(hre: HardhatRuntimeEnvironment) {
    const priceFeeds: any = {};

    priceFeeds["/USD"] = await hre.ethers.getContract("USD");
    priceFeeds["AURORA/USD"] = await hre.ethers.getContract("AURORAUSD");
    priceFeeds["NEAR/USD"] = await hre.ethers.getContract("NEARUSD");
    priceFeeds["ETH/USD"] = await hre.ethers.getContract("ETHUSD");
    priceFeeds["GME/USD"] = await hre.ethers.getContract("GMEUSD");
    priceFeeds["GOLD/USD"] = await hre.ethers.getContract("GOLDUSD");
    priceFeeds["TSLA/USD"] = await hre.ethers.getContract("TSLAUSD");
    priceFeeds["QQQ/USD"] = await hre.ethers.getContract("QQQUSD");

    return priceFeeds;
}
