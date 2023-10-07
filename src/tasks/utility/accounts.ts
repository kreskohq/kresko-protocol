import { task } from 'hardhat/config';
import { TASK_ACCOUNTS } from '../names';

task(TASK_ACCOUNTS, 'Prints the list of accounts', async (_args, hre) => {
  if (process.env.MNEMONIC) {
    for (let i = 0; i <= 102; i++) {
      const wallet = hre.ethers.Wallet.fromMnemonic(process.env.MNEMONIC, `m/44'/60'/0'/0/${i}`);
      console.log('Account:', i, 'Pub:', wallet.address, 'Priv', wallet.privateKey);
    }
  } else {
    console.log('No mnemonic supplied');
  }
});
