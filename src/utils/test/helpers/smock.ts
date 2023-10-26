import type { KreskoAssetAnchor, MockERC20 } from '@/types/typechain';
import type { MockContract } from '@defi-wonderland/smock';
import { toBig } from '@utils/values';
import { getIsRebased } from './optimizations';

export function setBalanceKrAssetFunc(krAsset: MockContract<KreskoAsset>, akrAsset: MockContract<KreskoAssetAnchor>) {
  return async (user: SignerWithAddress, amount: BigNumber, allowanceFor?: string) => {
    let krSupply = toBig(0);
    let atSupply = toBig(0);
    let diamondBal = toBig(0);

    // faster than calls if no rebase..
    try {
      const [isRebased] = await getIsRebased(krAsset);
      krSupply = isRebased ? await krAsset.totalSupply() : ((await krAsset.getVariable('_totalSupply')) as BigNumber);
      atSupply = isRebased ? ((await akrAsset.getVariable('_totalSupply')) as BigNumber) : krSupply;
      diamondBal = isRebased
        ? await krAsset.balanceOf(hre.Diamond.address)
        : ((await krAsset.getVariable('_balances', [hre.Diamond.address])) as BigNumber);
    } catch {}

    await Promise.all([
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

export function setBalanceCollateralFunc(collateral: MockContract<MockERC20>) {
  return async (user: SignerWithAddress, amount: BigNumber, allowanceFor?: string) => {
    let tSupply = toBig(0);
    try {
      tSupply = (await collateral.getVariable('_totalSupply')) as BigNumber;
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

export function getBalanceCollateralFunc(collateral: MockContract<MockERC20>) {
  return async (account: string | SignerWithAddress) => {
    let balance = toBig(0);
    try {
      balance = (await collateral.getVariable('_balances', [
        typeof account === 'string' ? account : account.address,
      ])) as BigNumber;
    } catch {}

    return balance;
  };
}

export function getBalanceKrAssetFunc(krAsset: MockContract<KreskoAsset>) {
  return async (account: string | SignerWithAddress) => {
    let balance = toBig(0);
    try {
      const [isRebased] = await getIsRebased(krAsset);
      balance = isRebased
        ? await krAsset.balanceOf(account)
        : ((await krAsset.getVariable('_balances', [
            typeof account === 'string' ? account : account.address,
          ])) as BigNumber);
    } catch {}

    return balance;
  };
}
