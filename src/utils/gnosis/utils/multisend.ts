import { buildContractCall, MetaTransaction, SafeTransaction } from './execution';
import { toBytes, encodePacked, bytesToString } from 'viem';

const encodeMetaTransaction = (tx: MetaTransaction): string => {
  const data = toBytes(tx.data);
  const encoded = encodePacked(
    ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
    [tx.operation, tx.to as any, BigInt(tx.value as any), BigInt(data.length), bytesToString(data) as any],
  );
  return encoded.slice(2);
};

export const encodeMultiSend = (txs: MetaTransaction[]): string => {
  return '0x' + txs.map(tx => encodeMetaTransaction(tx)).join('');
};

export const buildMultiSendSafeTx = (
  multiSend: Contract,
  txs: MetaTransaction[],
  nonce: number,
  overrides?: Partial<SafeTransaction>,
): SafeTransaction => {
  return buildContractCall(multiSend, 'multiSend', [encodeMultiSend(txs)], nonce, true, overrides);
};
