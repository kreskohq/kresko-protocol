export const checkAddress = (address: string, errorMessage = `Invalid address: ${address}`) => {
    if (!hre.ethers.utils.isAddress(address) || address === hre.ethers.constants.AddressZero) {
        throw new Error(errorMessage);
    }
    return true;
};
