import { MockContract } from '@defi-wonderland/smock';
import { toBig } from '@utils/values';
import hre from 'hardhat';

const keccak256 = hre.ethers.utils.keccak256;
const hexZeroPad = hre.ethers.utils.hexZeroPad;
const hexStripZeros = hre.ethers.utils.hexStripZeros;
const getStorageAt = hre.ethers.provider.getStorageAt;

function increaseHexBy(hex: string, index: number) {
  return toBig(hex, 0).add(index).toHexString();
}

async function getMappingArray(slot: string, key: string) {
  const paddedSlot = hexZeroPad(slot, 32);
  const paddedKey = hexZeroPad(key, 32);
  const indexKey = paddedKey + paddedSlot.slice(2);
  const itemSlot = keccak256(indexKey);
  return [keccak256(itemSlot), Number(await getStorageAt(hre.Diamond.address, itemSlot))] as const;
}

async function getNestedMappingItem(slot: string, key: string, innerKey: string) {
  const paddedSlot = hexZeroPad(slot, 32);
  const paddedKey = hexZeroPad(key, 32);
  const paddedInnerKey = hexZeroPad(innerKey, 32);
  const indexKey = keccak256(paddedInnerKey + keccak256(paddedKey + paddedSlot.slice(2)).slice(2));
  return await getStorageAt(hre.Diamond.address, indexKey);
}

export const slots = {
  minter: '0x5076ab9fa18d2a17cfce4375a530b76392de8264a11126885cd5534d39f0a97c',
  depositedCollateralAssets: 0,
  collateralDeposits: 1,
  kreskoAssetDebt: 2,
  mintedKreskoAssets: 3,
  feeRecipient: 4,
  maxLiquidationRatio: 5,
  minCollateralRatio: 5,
  liquidationThreshold: 15,
  kreskoAssetStorageStart: 208,
  kreskoAssetIsRebased: 208,
};

export async function getAccountCollateralAssets(address: string) {
  try {
    const [dataSlot, length] = await getMappingArray(
      increaseHexBy(slots.minter, slots.depositedCollateralAssets),
      address,
    );
    if (!length) return [];

    return Promise.all(
      Array.from({ length }).map(async (_, i) => {
        const data = await getStorageAt(hre.Diamond.address, increaseHexBy(dataSlot, i));
        return hre.ethers.utils.getAddress(hexStripZeros(data));
      }),
    );
  } catch {
    return [];
  }
}
export async function getAccountMintedAssets(address: string) {
  try {
    const [dataSlot, length] = await getMappingArray(increaseHexBy(slots.minter, slots.mintedKreskoAssets), address);
    if (!length) return [];

    return Promise.all(
      Array.from({ length }).map(async (_, i) => {
        const data = await getStorageAt(hre.Diamond.address, increaseHexBy(dataSlot, i));
        return hre.ethers.utils.getAddress(hexStripZeros(data));
      }),
    );
  } catch {
    return [];
  }
}
export async function getAccountCollateralAmount<T extends Omit<TestKrAsset, 'deployed'>>(
  address: string,
  asset: string | any,
) {
  try {
    let assetAddress: string = '';
    if (typeof asset === 'string') {
      assetAddress = asset;
    } else {
      assetAddress = asset.address;
      if ((await getIsRebased(asset.contract))[0]) {
        return await hre.Diamond.getAccountCollateralAmount(address, assetAddress);
      }
    }
    const data = await getNestedMappingItem(
      increaseHexBy(slots.minter, slots.collateralDeposits),
      address,
      assetAddress,
    );
    return toBig(hexStripZeros(data), 0);
  } catch {
    return toBig(0);
  }
}
export async function getAccountDebtAmount(address: string, krAsset: TestKrAsset) {
  try {
    if ((await getIsRebased(krAsset.contract))[0]) {
      return await hre.Diamond.getAccountDebtAmount(address, krAsset.address);
    }
    const data = await getNestedMappingItem(
      increaseHexBy(slots.minter, slots.kreskoAssetDebt),
      address,
      krAsset.address,
    );
    return toBig(hexStripZeros(data), 0);
  } catch {
    return toBig(0);
  }
}

export async function getMinCollateralRatio() {
  return hre.Diamond.getMinCollateralRatio();
  // try {
  //     const data = await getStorageAt(hre.Diamond.address, increaseHexBy(slots.minter, slots.minCollateralRatio));
  //     return BigNumber.from(hexStripZeros(data));
  // } catch {
  //     return BigNumber.from(0);
  // }
}
export async function getMinDebtValue() {
  return hre.Diamond.getMinDebtValue();
  // try {
  //     const data = await getStorageAt(hre.Diamond.address, increaseHexBy(slots.minter, slots.minDebtValue));
  //     return BigNumber.from(hexStripZeros(data));
  // } catch {
  //     return BigNumber.from(0);
  // }
}
export async function getLiquidationThreshold() {
  return hre.Diamond.getLiquidationThreshold();
  // try {
  //     const data = await getStorageAt(hre.Diamond.address, increaseHexBy(slots.minter, slots.liquidationThreshold));
  //     return BigNumber.from(hexStripZeros(data));
  // } catch {
  //     return BigNumber.from(0);
  // }
}
export async function getMaxLiquidationRatio() {
  return hre.Diamond.getMaxLiquidationRatio();
  // try {
  //     const data = await getStorageAt(hre.Diamond.address, increaseHexBy(slots.minter, slots.maxLiquidationRatio));
  //     return BigNumber.from(hexStripZeros(data));
  // } catch {
  //     return BigNumber.from(0);
  // }
}
export async function getIsRebased<T extends KreskoAsset | ERC20Upgradeable>(asset: MockContract<T>) {
  let denominator = toBig(0);
  let isRebased = false;
  let isPositive = false;

  // @ts-expect-error
  if (typeof asset.isRebased !== 'function') return [Boolean(false), isPositive, denominator] as const;

  try {
    isPositive = Boolean(Number(await getStorageAt(asset.address, slots.kreskoAssetIsRebased)));
    try {
      denominator = toBig(hexStripZeros(await getStorageAt(asset.address, slots.kreskoAssetIsRebased + 1)), 0);
    } catch {}
    isRebased = denominator.gt(toBig(1));
  } catch {
    // @ts-expect-error
    isRebased = await asset.isRebased();
  }
  return [isRebased, isPositive, denominator] as const;
}

export async function getAccountDepositIndex(address: string, asset: string) {
  try {
    const assets = await getAccountCollateralAssets(address);
    return assets.indexOf(asset);
  } catch {
    return hre.Diamond.getAccountDepositIndex(address, asset);
  }
}
export async function getAccountMintIndex(address: string, asset: string) {
  try {
    const assets = await getAccountMintedAssets(address);
    return assets.indexOf(asset);
  } catch {
    return hre.Diamond.getAccountMintIndex(address, asset);
  }
}

export default {
  getIsRebased,
  getAccountMintedAssets,
  getAccountCollateralAssets,
  getAccountDebtAmount,
  getAccountCollateralAmount,
  getMaxLiquidationRatio,
  getMinCollateralRatio,
  getMinDebtValue,
  getLiquidationThreshold,
  getAccountDepositIndex,
  getAccountMintIndex,
};
