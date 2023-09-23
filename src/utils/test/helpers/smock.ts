import { MockContract } from "@defi-wonderland/smock";
import { BigNumber } from "ethers";
import { KreskoAssetAnchor } from "types/typechain";

const hexlify = hre.ethers.utils.hexlify;
const zeroPad = hre.ethers.utils.zeroPad;
const id = hre.ethers.utils.id;
const keccak256 = hre.ethers.utils.keccak256;
const hexZeroPad = hre.ethers.utils.hexZeroPad;
function increaseHexBy(hex: string, index: number) {
    let x = BigNumber.from(hex);
    let sum = x.add(index);
    let result = sum.toHexString();
    return result;
}
// const index = "0x0000000000000000000000000000000000000000000000000000000000000006";
// const key = "0x00000000000000000000000xbccc714d56bc0da0fd33d96d2a87b680dd6d0df6";
//    let newKey =  increaseHexByOne(
//      web3.sha3(key + index, {"encoding":"hex"}))
function getMappingItem(contractAddress: string, slot: string, key: string) {
    const paddedSlot = hre.ethers.utils.hexZeroPad(slot, 32);
    const paddedKey = hre.ethers.utils.hexZeroPad(key, 32);
    const indexKey = paddedSlot + paddedKey.slice(2);
    const itemSlot = hre.ethers.utils.keccak256(indexKey);
    return itemSlot;
}
// function getItem(slot: string, key: string) {
//     const paddedSlot = hre.ethers.utils.hexZeroPad(slot, 32);
//     const paddedKey = hre.ethers.utils.hexZeroPad(key, 32);
//     const newKey = paddedKey + paddedSlot.slice(2);
//     const itemSlot = hre.ethers.utils.keccak256(newKey);
//     return itemSlot;
// }

async function getUint256(slot: string, contractAddress: string) {
    const paddedSlot = hre.ethers.utils.hexZeroPad(slot, 32);
    const storageLocation = await hre.ethers.provider.getStorageAt(contractAddress, paddedSlot);
    // const storageValue = BigNumber.from(storageLocation);
    return storageLocation;
}

const secondSlot = "0xf0e0c281d990fa8037096fa05bda505f579a131dca0f286098136971829656da";
// 0x6d6988f07dbd7e9cca1d731df9137286afdf117348e52893bb6f7c4570d7f647
export async function read() {
    let minterStorageSlot = "0x5076ab9fa18d2a17cfce4375a530b76392de8264a11126885cd5534d39f0a97c";
    let minterState = "0x000000000000000000000000b6f4b52f2ffbe0989c558990a1d2588e20d9508b";

    for (let i = 0; i < 20; i++) {
        console.debug(
            await hre.ethers.provider.getStorageAt(
                hre.Diamond.address,
                "0x6d6988f07dbd7e9cca1d731df9137286afdf117348e52893bb6f7c4570d7f647",
            ),
        );
        const slot = increaseHexBy(minterStorageSlot, i);
        const data = await hre.ethers.provider.getStorageAt(hre.Diamond.address, slot);
        console.debug(data);
    }
}
export function setBalanceKrAssetFunc(krAsset: MockContract<KreskoAsset>, akrAsset: MockContract<KreskoAssetAnchor>) {
    return async (user: SignerWithAddress, amount: BigNumber, allowanceFor?: string) => {
        let krSupply = BigNumber.from(0);
        let atSupply = BigNumber.from(0);
        let diamondBal = BigNumber.from(0);

        // faster than calls if no rebase..
        try {
            const isRebased = await krAsset.getVariable("isRebased");
            krSupply = isRebased
                ? await krAsset.totalSupply()
                : ((await krAsset.getVariable("_totalSupply")) as BigNumber);
            atSupply = isRebased ? ((await akrAsset.getVariable("_totalSupply")) as BigNumber) : krSupply;
            diamondBal = isRebased
                ? await krAsset.balanceOf(hre.Diamond.address)
                : ((await krAsset.getVariable("_balances", [hre.Diamond.address])) as BigNumber);
        } catch {}

        return Promise.all([
            akrAsset.setVariables({
                _totalSupply: atSupply.add(amount),
                _balances: {
                    [hre.Diamond.address]: diamondBal.add(amount),
                },
            }),
            krAsset.setVariables({
                _totalSupply: krSupply.add(amount),
                _balances: {
                    [user.address]: amount,
                },
                _allowances: allowanceFor && {
                    [user.address]: {
                        [allowanceFor]: hre.ethers.constants.MaxInt256, // doesnt work with uint
                    },
                },
            }),
        ]);
    };
}

export function setBalanceCollateralFunc(collateral: MockContract<ERC20Upgradeable>) {
    return async (user: SignerWithAddress, amount: BigNumber, allowanceFor?: string) => {
        let tSupply = BigNumber.from(0);
        try {
            tSupply = (await collateral.getVariable("_totalSupply")) as BigNumber;
        } catch {}

        return collateral.setVariables({
            _totalSupply: tSupply.add(amount),
            _balances: {
                [user.address]: amount,
            },
            _allowances: allowanceFor && {
                [user.address]: {
                    [allowanceFor]: hre.ethers.constants.MaxInt256, // doesnt work with uint
                },
            },
        });
    };
}

export function getBalanceCollateralFunc(collateral: MockContract<ERC20Upgradeable>) {
    return async (account: string | SignerWithAddress) => {
        let balance = BigNumber.from(0);
        try {
            balance = (await collateral.getVariable("_balances", [
                typeof account === "string" ? account : account.address,
            ])) as BigNumber;
        } catch {}

        return balance;
    };
}

export function getBalanceKrAssetFunc(krAsset: MockContract<KreskoAsset>) {
    return async (account: string | SignerWithAddress) => {
        let balance = BigNumber.from(0);
        try {
            const isRebased = await krAsset.getVariable("isRebased");
            balance = isRebased
                ? await krAsset.balanceOf(hre.Diamond.address)
                : ((await krAsset.getVariable("_balances", [
                      typeof account === "string" ? account : account.address,
                  ])) as BigNumber);
        } catch {}

        return balance;
    };
}
