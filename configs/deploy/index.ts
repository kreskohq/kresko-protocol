import type { HardhatRuntimeEnvironment } from 'hardhat/types';
import type { SCDPInitializer, MinterInitializer, CommonInitializer } from '@/types';
import { assets, testnetConfigs } from './arbitrumGoerli';
import { envCheck } from '@utils/env';
import { ZERO_ADDRESS } from '@kreskolabs/lib';

envCheck();

export type AllTokenSymbols = TestTokenSymbols | 'ETH' | (typeof assets)[keyof typeof assets]['symbol'];

// These function namings are ignored when generating ABI for the diamond
export const signatureFilters = ['init', 'initializer'];

export const diamondFacets = ['DiamondCutFacet', 'DiamondLoupeFacet', 'DiamondStateFacet', 'ERC165Facet'] as const;

export const commonFacets = [
  'CommonConfigurationFacet',
  'AuthorizationFacet',
  'CommonStateFacet',
  'AssetStateFacet',
  'AssetConfigurationFacet',
  'SafetyCouncilFacet',
] as const;

export const minterFacets = [
  'MinterAccountStateFacet',
  'MinterBurnFacet',
  'MinterConfigurationFacet',
  'MinterDepositWithdrawFacet',
  'MinterLiquidationFacet',
  'MinterMintFacet',
  'MinterStateFacet',
] as const;

export const scdpFacets = ['SCDPStateFacet', 'SCDPFacet', 'SCDPConfigFacet', 'SCDPSwapFacet', 'SDIFacet'] as const;

export const getDeploymentUsers = async (hre: HardhatRuntimeEnvironment) => {
  const users = await hre.getNamedAccounts();
  const Safe = await hre.deployments.getOrNull('GnosisSafeL2');

  const multisig = hre.network.live ? users.multisig : !Safe ? ZERO_ADDRESS : Safe.address;
  return { admin: users.admin, multisig, treasury: users.treasury };
};

export const getMinterInitializer = async (hre: HardhatRuntimeEnvironment): Promise<MinterInitializer> => {
  return {
    name: 'MinterConfigurationFacet',
    args: testnetConfigs[hre.network.name].minterInitArgs,
  };
};
export const getCommonInitializer = async (hre: HardhatRuntimeEnvironment): Promise<CommonInitializer> => {
  const { treasury, admin, multisig } = await getDeploymentUsers(hre);

  const config = testnetConfigs[hre.network.name].commonInitAgs;

  return {
    name: 'CommonConfigurationFacet',
    args: {
      ...config,
      admin,
      treasury,
      council: multisig,
      sequencerUptimeFeed: hre.network.live
        ? config.sequencerUptimeFeed
        : (await hre.deployments.get('MockSequencerUptimeFeed')).address,
    },
  };
};
export const getSCDPInitializer = async (hre: HardhatRuntimeEnvironment): Promise<SCDPInitializer> => {
  return {
    name: 'SCDPConfigFacet',
    args: testnetConfigs[hre.network.name].scdpInitArgs,
  };
};
