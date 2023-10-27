import type { HardhatUserConfig } from 'hardhat/config'

const DEPLOYER_INDEX = process.env.DEPLOYER_INDEX == null ? 0 : parseInt(process.env.DEPLOYER_INDEX)
export const hardhatUsers = {
  admin: {
    default: !process.env.ADMIN ? DEPLOYER_INDEX : process.env.ADMIN,
  },
  deployer: {
    default: DEPLOYER_INDEX,
  },
  operator: {
    default: DEPLOYER_INDEX,
  },
  multisig: {
    default: DEPLOYER_INDEX,
    1: '0x31d866AAf9D8588B1295e3A34B6B714a62fE2989',
    10: '0x22426D3995a56646b5cbA56283159CEC883E68dB',
    137: '0x389297F0d8C489954D65e04ff0690FC54E57Dad6',
    42161: '0x389297F0d8C489954D65e04ff0690FC54E57Dad6',
    421613: '0x83b92b8A21d56941cB9d056B36E0cC2aDa15f1E1',
  },
  treasury: {
    default: !process.env.TREASURY ? 10 : process.env.TREASURY,
  },
  /* ------------------------------- test users ------------------------------- */
  liquidator: {
    default: 9,
  },
  notAdmin: {
    default: 30,
  },
  userOne: {
    default: 31,
  },
  userTwo: {
    default: 32,
  },
  userThree: {
    default: 33,
  },
  userFour: {
    default: 34,
  },
  userFive: {
    default: 35,
  },
  userSix: {
    default: 36,
  },
  userSeven: {
    default: 37,
  },
  userEight: {
    default: 38,
  },
  userNine: {
    default: 39,
  },
  userTen: {
    default: 40,
  },
  userEleven: {
    default: 41,
  },
  userTwelve: {
    default: 42,
  },
  devOne: {
    default: 43,
  },
  extOne: {
    default: 44,
  },
  extTwo: {
    default: 45,
  },
}
export const users: HardhatUserConfig['namedAccounts'] = hardhatUsers
