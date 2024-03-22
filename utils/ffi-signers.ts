import TrezorConnect from '@trezor/connect'
import { $ } from 'bun'
import ethProvider from 'eth-provider'
import { Address, Hex } from 'viem'
import { Signer, getArg } from './ffi-shared'
import { Method, SignResult } from './ffi-shared'

const DERIVATION_PATH = process.env.MNEMONIC_PATH || "m/44'/60'/0'/0/0"
const SIGNER = process.env.SIGNER_TYPE != null ? (Number(process.env.SIGNER_TYPE) as Signer) : Signer.Trezor

const connect = async (op: (trezor: typeof TrezorConnect) => Promise<SignResult>) => {
  await TrezorConnect.init({
    manifest: {
      email: 'hello@kresko.fi',
      appUrl: 'https://kresko.fi',
    },
  })
  return op(TrezorConnect)
}

export const signHash = (hash?: string) =>
  ({
    [Signer.Trezor]: trezor.signHash,
    [Signer.Frame]: frame('eth_sign'),
    [Signer.Cast]: cast('eth_sign'),
  })[SIGNER](getArg(hash))

export const signMessage = (message?: string) =>
  ({
    [Signer.Trezor]: trezor.signMessage,
    [Signer.Frame]: frame('personal_sign'),
    [Signer.Cast]: cast('personal_sign'),
  })[SIGNER](getArg(message))

export const signData = (data?: any) =>
  ({
    [Signer.Trezor]: trezor.signData,
    [Signer.Frame]: frame('eth_signTypedData_v4'),
    [Signer.Cast]: cast('eth_signTypedData_v4'),
  })[SIGNER](getArg(data))

const frame =
  (method: Method = 'personal_sign') =>
  async (message: string) => {
    const provider = ethProvider('frame')
    const [account] = await provider.enable()
    const signature = await provider.send(method, [account, message])
    return [signature as Hex, account as Address]
  }

const cast =
  (method: Method = 'personal_sign') =>
  async (input: string) => {
    const address = (await $`cast wallet address --private-key $PRIVATE_KEY`.text()) as Address
    if (method === 'eth_signTypedData_v4') {
      const signature = (await $`cast wallet sign --private-key $PRIVATE_KEY --data ${JSON.stringify(
        input,
      )}`.text()) as Hex
      return [signature, address]
    }
    if (input?.startsWith('0x')) {
      const signature = (await $`cast wallet sign --private-key $PRIVATE_KEY --no-hash ${input}`.text()) as Hex
      return [signature, address]
    }
    const signature = (await $`cast wallet sign --private-key $PRIVATE_KEY ${input}`.text()) as Hex
    return [signature, address]
  }

const trezor = {
  signHash: (hash?: string) => {
    return connect(async trezor => {
      const result = await trezor.ethereumSignMessage({
        message: getArg(hash),
        hex: true,
        path: DERIVATION_PATH,
      })
      if (!result.success) throw new Error(result.payload.error)
      return [`0x${result.payload.signature}` as Hex, result.payload.address as Address]
    })
  },
  signMessage: (message?: string) => {
    return connect(async trezor => {
      const result = await trezor.ethereumSignMessage({
        message: getArg(message),
        hex: false,
        path: DERIVATION_PATH,
      })
      if (!result.success) throw new Error(result.payload.error)
      return [`0x${result.payload.signature}` as Hex, result.payload.address as Address]
    })
  },
  signData: (data?: any) => {
    return connect(async trezor => {
      let arg = getArg(data)
      if (typeof arg === 'string') {
        arg = JSON.parse(arg)
      }
      const result = await trezor.ethereumSignTypedData({
        path: DERIVATION_PATH,
        data: arg,
        metamask_v4_compat: true,
      })
      if (!result.success) throw new Error(result.payload.error)
      return [`0x${result.payload.signature}` as Hex, result.payload.address as Address]
    })
  },
}
