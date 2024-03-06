/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// Deployment
import '@nomicfoundation/hardhat-foundry'
import type { HardhatUserConfig } from 'hardhat/config'
import 'tsconfig-paths/register'
/* -------------------------------------------------------------------------- */
/*                                   Plugins                                  */
/* -------------------------------------------------------------------------- */

// note: hardhat-diamond-abi should always be imported before typechain - if used together
import '@nomiclabs/hardhat-ethers'
import 'hardhat-diamond-abi'
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-chai-matchers'
import 'hardhat-deploy'
import 'hardhat-deploy-ethers'

/* -------------------------------------------------------------------------- */
/*                                   Dotenv                                   */
/* -------------------------------------------------------------------------- */
import { configDotenv } from 'dotenv'
configDotenv()
process.env.HARDHAT = 'true'

const mnemonic = process.env.MNEMONIC_DEVNET || 'test test test test test test test test test test test junk'

/* -------------------------------------------------------------------------- */
/*                                Config helpers                              */
/* -------------------------------------------------------------------------- */
import { compilers, diamondAbiConfig, handleForking, networks, users } from '@config/hardhat'
/* -------------------------------------------------------------------------- */
/*                              Extensions To HRE                             */
/* -------------------------------------------------------------------------- */
// import '@config/hardhat/extensions'
/* -------------------------------------------------------------------------- */
/*                                    Tasks                                   */
/* -------------------------------------------------------------------------- */
// import 'src/tasks'

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

if (process.env.EXPORT) {
  console.log('exporting..')
}

const config: HardhatUserConfig = {
  solidity: compilers,
  networks: handleForking(networks(mnemonic)),
  namedAccounts: users,
  mocha: {
    reporter: process.env.CI ? 'spec' : 'mochawesome',
    reporterOptions: process.env.CI
      ? undefined
      : {
          reportDir: 'docs/test-report',
          assetsDir: 'docs/test-report/assets',
          reportTitle: 'Kresko Protocol Hardhat Test Report',
          reportPageTitle: 'Kresko Protocol Hardhat Test Report',
        },
    timeout: process.env.CI ? 45000 : process.env.FORKING ? 300000 : 30000,
  },
  paths: {
    artifacts: 'build/hardhat/artifacts',
    cache: 'build/hardhat/cache',
    tests: 'src/test',
    sources: 'src/contracts/core',
    deploy: 'src/deploy',
    deployments: 'out/hardhat/deploy',
  },
  diamondAbi: diamondAbiConfig,
  typechain: {
    outDir: 'src/types/typechain',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false,
    dontOverrideCompile: false,
    discriminateTypes: true,
    tsNocheck: true,
    externalArtifacts: [],
  },
}

export default config
