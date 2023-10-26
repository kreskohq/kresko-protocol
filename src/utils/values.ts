import { BigNumber } from 'ethers/lib/ethers'
import { concat, formatUnits, parseUnits, stringToBytes, toHex } from 'viem'
export const HashZero = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const MaxUint128 = '340282366920938463463374607431768211455'
export function formatBytesString(text: string, length: number): string {
  // Get the bytes
  const bytes = stringToBytes(text)

  // Check we have room for null-termination
  if (bytes.length > 31) {
    throw new Error('bytes32 string must be less than 32 bytes')
  }

  // Zero-pad (implicitly null-terminates)
  return toHex(concat([bytes, HashZero]).slice(0, length))
}

export const toBig = (amount: number | string, decimals: string | number = 18) => {
  const value = typeof amount === 'string' ? amount : amount.toString()
  return BigNumber.from(parseUnits(value, +decimals))
}
export const fromBig = (amount: BigNumber | string, decimals: string | number = 18) => {
  const value = typeof amount === 'string' ? amount : amount.toString()
  return +formatUnits(BigInt(value), +decimals)
}

export const PERCENTAGE_FACTOR = 10000n
export const HALF_PERCENTAGE = 5000n
export const WAD = BigNumber.from(10).pow(18)
export const HALF_WAD = BigNumber.from(WAD).div(2)
export const RAY = BigNumber.from(10).pow(27)
export const HALF_RAY = BigNumber.from(RAY).div(2)
export const WAD_RAY_RATIO = BigNumber.from(10).pow(9)
export const MAX_UINT_AMOUNT = BigNumber.from(
  '115792089237316195423570985008687907853269984665640564039457584007913129639935',
)
export const ONE_YEAR = BigNumber.from('31536000')
const wadMul = (wad: bigint, other: bigint): bigint => {
  return (HALF_WAD.toBigInt() + wad * other) / WAD.toBigInt()
}

const wadDiv = (a: bigint, b: bigint): bigint => {
  const halfOther = b / 2n
  return (halfOther + a * WAD.toBigInt()) / b
}

const rayMul = (ray: bigint, other: bigint): bigint => {
  return (HALF_RAY.toBigInt() + ray * other) / RAY.toBigInt()
}

const rayDiv = (ray: bigint, other: bigint): bigint => {
  const halfOther = other / 2n
  return (halfOther + ray * RAY.toBigInt()) / other
}

const wadToRay = (wad: bigint): bigint => {
  return wad * WAD_RAY_RATIO.toBigInt()
}

const rayToWad = (ray: bigint): bigint => {
  const ratioBN = WAD_RAY_RATIO.toBigInt()
  const halfRatio = ratioBN / 2n
  return (halfRatio + ray) / ratioBN
}

const percentMul = (wad: bigint, bps: bigint): bigint => {
  return (HALF_PERCENTAGE + wad * bps) / PERCENTAGE_FACTOR
}

const percentDiv = (wad: bigint, bps: bigint): bigint => {
  const halfBps = bps / 2n
  return (halfBps + wad * PERCENTAGE_FACTOR) / bps
}

Number.prototype.ewadMul = function (b: BigNumberish) {
  return BigNumber.from(wadMul(BigInt(this.toString()), BigInt(b.toString())))
}
Number.prototype.ewadDiv = function (b: BigNumberish) {
  return BigNumber.from(wadDiv(BigInt(this.toString()), BigInt(b.toString())))
}
Number.prototype.erayMul = function (b: BigNumberish) {
  return BigNumber.from(rayMul(BigInt(this.toString()), BigInt(b.toString())))
}

Number.prototype.erayDiv = function (b: BigNumberish) {
  return BigNumber.from(rayDiv(BigInt(this.toString()), BigInt(b.toString())))
}

Number.prototype.epercentMul = function (b: BigNumberish) {
  return BigNumber.from(percentMul(BigInt(this.toString()), BigInt(b.toString())))
}

Number.prototype.epercentDiv = function (b: BigNumberish) {
  return BigNumber.from(percentDiv(BigInt(this.toString()), BigInt(b.toString())))
}

Number.prototype.ewadToRay = function () {
  return BigNumber.from(wadToRay(BigInt(this.toString())))
}

Number.prototype.erayToWad = function () {
  return BigNumber.from(rayToWad(BigInt(this.toString())))
}
Number.prototype.ebn = function (decimals = 18) {
  return BigNumber.from(parseUnits(this.toString(), decimals))
}

BigNumber.prototype.wadMul = function (b: BigNumberish) {
  return BigNumber.from(wadMul(this.toBigInt(), BigInt(b.toString())))
}
BigNumber.prototype.wadDiv = function (b: BigNumberish) {
  return BigNumber.from(wadDiv(this.toBigInt(), BigInt(b.toString())))
}
BigNumber.prototype.rayMul = function (b: BigNumberish) {
  return BigNumber.from(rayMul(this.toBigInt(), BigInt(b.toString())))
}

BigNumber.prototype.rayDiv = function (b: BigNumberish) {
  return BigNumber.from(rayDiv(this.toBigInt(), BigInt(b.toString())))
}

BigNumber.prototype.percentMul = function (b: BigNumberish) {
  return BigNumber.from(percentMul(this.toBigInt(), BigInt(b.toString())))
}

BigNumber.prototype.percentDiv = function (b: BigNumberish) {
  return BigNumber.from(percentDiv(this.toBigInt(), BigInt(b.toString())))
}

BigNumber.prototype.wadToRay = function () {
  return BigNumber.from(wadToRay(this.toBigInt()))
}

BigNumber.prototype.rayToWad = function () {
  return BigNumber.from(rayToWad(this.toBigInt()))
}
BigNumber.prototype.str = function (decimals = 18) {
  return formatUnits(this.toBigInt(), decimals)
}
BigNumber.prototype.num = function (decimals = 18) {
  return Number(formatUnits(this.toBigInt(), decimals))
}
