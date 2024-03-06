/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-extra-non-null-assertion */
import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { zeroAddress } from 'viem';
import { BigNumber, type BigNumberish, Contract, Signer } from 'ethers';

export const EIP712_SAFE_TX_TYPE = {
  // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
  SafeTx: [
    { type: 'address', name: 'to' },
    { type: 'uint256', name: 'value' },
    { type: 'bytes', name: 'data' },
    { type: 'uint8', name: 'operation' },
    { type: 'uint256', name: 'safeTxGas' },
    { type: 'uint256', name: 'baseGas' },
    { type: 'uint256', name: 'gasPrice' },
    { type: 'address', name: 'gasToken' },
    { type: 'address', name: 'refundReceiver' },
    { type: 'uint256', name: 'nonce' },
  ],
};

export interface MetaTransaction {
  to: string;
  value: string | number | BigNumber;
  data: string;
  operation: number;
}

export interface SafeTransaction extends MetaTransaction {
  safeTxGas: string | number;
  baseGas: string | number;
  gasPrice: string | number;
  gasToken: string;
  refundReceiver: string;
  nonce: string | number;
}

export interface SafeSignature {
  signer: string;
  data: string;
}

export const safeSignTypedData = async (
  signer: Signer & TypedDataSigner,
  safe: Contract,
  safeTx: SafeTransaction,
  chainId?: BigNumberish,
): Promise<SafeSignature> => {
  if (!chainId && !signer?.provider) throw Error('Provider required to retrieve chainId');
  const cid = chainId || (await signer.provider!.getNetwork()).chainId;
  const signerAddress = await signer.getAddress();
  return {
    signer: signerAddress,
    data: await signer._signTypedData({ verifyingContract: safe.address, chainId: cid }, EIP712_SAFE_TX_TYPE, safeTx),
  };
};

export const buildSignatureBytes = (signatures: SafeSignature[]): string => {
  signatures.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()));
  let signatureBytes = '0x';
  for (const sig of signatures) {
    signatureBytes += sig.data.slice(2);
  }
  return signatureBytes;
};

export const executeTx = async (
  safe: GnosisSafeL2,
  safeTx: SafeTransaction,
  signatures: SafeSignature[],
  overrides?: any,
): Promise<any> => {
  const signatureBytes = buildSignatureBytes(signatures);
  return safe.execTransaction(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    signatureBytes,
    overrides || {},
  );
};

export const buildContractCall = (
  contract: Contract,
  method: string,
  params: any[],
  nonce: number,
  delegateCall?: boolean,
  overrides?: Partial<SafeTransaction>,
): SafeTransaction => {
  const data = contract.interface.encodeFunctionData(method, params);
  return buildSafeTransaction(
    Object.assign(
      {
        to: contract.address,
        data,
        operation: delegateCall ? 1 : 0,
        nonce,
      },
      overrides,
    ),
  );
};

export const executeTxWithSigners = async (
  safe: GnosisSafeL2,
  tx: SafeTransaction,
  signers: SignerWithAddress[],
  overrides?: any,
) => {
  const sigs = await Promise.all(signers.map(signer => safeSignTypedData(signer, safe, tx)));
  return executeTx(safe, tx, sigs, overrides);
};

export const executeContractCallWithSigners = async (
  safe: GnosisSafeL2,
  contract: Contract,
  method: string,
  params: any[],
  signers: SignerWithAddress[],
  delegateCall?: boolean,
  overrides?: Partial<SafeTransaction>,
) => {
  const tx = buildContractCall(contract, method, params, Number(await safe.nonce()), delegateCall, overrides);
  return executeTxWithSigners(safe, tx, signers);
};

export const buildSafeTransaction = (template: {
  to: string;
  value?: BigNumber | number | string;
  data?: string;
  operation?: number;
  safeTxGas?: number | string;
  baseGas?: number | string;
  gasPrice?: number | string;
  gasToken?: string;
  refundReceiver?: string;
  nonce: number;
}): SafeTransaction => {
  return {
    to: template.to,
    value: template.value || 0,
    data: template.data || '0x',
    operation: template.operation || 0,
    safeTxGas: template.safeTxGas || 0,
    baseGas: template.baseGas || 0,
    gasPrice: template.gasPrice || 0,
    gasToken: template.gasToken || zeroAddress,
    refundReceiver: template.refundReceiver || zeroAddress,
    nonce: template.nonce,
  };
};
