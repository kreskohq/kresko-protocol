import { spawn } from 'child_process'
import dotenv from 'dotenv'
dotenv.config()

const options = {
  wallet: {
    mnemonic: process.env.MNEMONIC,
    defaultBalance: 100,
    unlockedAccounts: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    lock: false,
  },
  fork: {
    url: `${process.env.RPC_URL_OPTIMISM_GOERLI_ALCHEMY}@5561222`,
  },
  server: {
    port: 7545,
  },
  miner: {
    defaultGasPrice: 100,
  },
  chain: {
    allowUnlimitedContractSize: false,
  },
}

const server = spawn('ganache-cli', [
  '--fork',
  options.fork.url,
  '--mnemonic',
  options.wallet.mnemonic!,
  '--defaultBalanceEther',
  options.wallet.defaultBalance.toString(),
  '--unlock',
  options.wallet.unlockedAccounts.join(','),
  '--allowUnlimitedContractSize',
  '--gasPrice',
  options.miner.defaultGasPrice.toString(),
  '--port',
  options.server.port.toString(),
])

server.stdout.on('data', (data: any) => {
  console.log(`${data}`)
})
