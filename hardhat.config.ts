/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment
import '@nomicfoundation/hardhat-foundry';
import type { HardhatUserConfig } from 'hardhat/config';
import 'tsconfig-paths/register';
/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */

import 'hardhat-diamond-abi';
// note: hardhat-diamond-abi should always be exported before typechain if used together
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomiclabs/hardhat-ethers';
import '@typechain/hardhat';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-interface-generator';
import 'solidity-docgen';
// import "hardhat-watcher";

/* -------------------------------------------------------------------------- */
/*                                   Dotenv                                   */
/* -------------------------------------------------------------------------- */
import { configDotenv } from 'dotenv';
configDotenv();

const mnemonic = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error('No mnemonic set');
}

/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */
import 'src/tasks';
/* -------------------------------------------------------------------------- */
/*                                Config helpers                              */
/* -------------------------------------------------------------------------- */
import { compilers, diamondAbiConfig, handleForking, networks, users } from '@config/hardhat';
/* -------------------------------------------------------------------------- */
/*                              Extensions To HRE                             */
/* -------------------------------------------------------------------------- */
import '@config/hardhat/extensions';

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

if (process.env.EXPORT) {
  console.log('exporting..');
}

const config: HardhatUserConfig = {
  solidity: compilers,
  networks: handleForking(networks(mnemonic)),
  namedAccounts: users,
  mocha: {
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'pages/test-report',
      assetsDir: 'pages/test-report/assets',
      reportTitle: 'Kresko Protocol Hardhat Test Report',
      reportPageTitle: 'Kresko Protocol Hardhat Test Report',
    },
    timeout: process.env.CI ? 45000 : process.env.FORKING ? 300000 : 30000,
  },
  docgen: {
    outputDir: 'pages/natspec',
    pages: 'files',
    exclude: ['test', 'vendor', 'libs'],
  },
  paths: {
    artifacts: 'artifacts',
    cache: 'cache',
    tests: 'src/test/',
    sources: 'src/contracts/core',
    deploy: 'src/deploy/',
    deployments: 'deployments/',
  },
  diamondAbi: diamondAbiConfig,
  typechain: {
    outDir: 'types/typechain',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
    discriminateTypes: true,
    tsNocheck: true,
    externalArtifacts: [],
  },
};

export default config;
