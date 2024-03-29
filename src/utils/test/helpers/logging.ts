import { fromBig } from '@utils/values'

export const logBalances = async (user: SignerWithAddress) => {
  const Kresko = await hre.getContractOrFork('Kresko')

  const krAssets = await Kresko.getKreskoAssetsSCDP()
  for (const krAsset of krAssets) {
    const contract = await hre.ethers.getContractAt('MockERC20', krAsset)
    const balance = fromBig(await contract.balanceOf(user.address))
    console.log(`krAsset ${await contract.symbol()}`, balance)
  }
}
