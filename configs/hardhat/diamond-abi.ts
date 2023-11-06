interface DiamondAbiUserConfig {
  name: string
  include?: string[]
  exclude?: string[]
  filter?: (abiElement: any, index: number, abi: any[], fullyQualifiedName: string) => boolean
  strict?: boolean
}

const cache = new Map<string, boolean>()
export const diamondAbiConfig: DiamondAbiUserConfig[] = [
  {
    name: 'Kresko',
    include: ['facets/*', 'MEvent', 'SEvent'],
    exclude: ['vendor', 'test/*', 'interfaces/*', 'krasset/*', 'KrStaking'],
    strict: false,
    filter(abiElement) {
      if (cache.has(abiElement.name)) {
        return false
      }
      cache.set(abiElement.name, true)
      return true
    },
  },
]
