import { pad, toHex } from 'viem'
export const Role = {
  DEFAULT_ADMIN: pad(toHex(0), { size: 32 }),
  ADMIN: '0xb9dacdf02281f2e98ddbadaaf44db270b3d5a916342df47c59f77937a6bcd5d8',
  OPERATOR: '0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd',
  MANAGER: '0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0',
  SAFETY_COUNCIL: '0x9c387ecf1663f9144595993e2c602b45de94bf8ba3a110cb30e3652d79b581c0',
}
