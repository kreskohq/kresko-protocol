import { MinterEvent__factory } from "types";

export const EventContract = () => MinterEvent__factory.connect(hre.Diamond.address, hre.ethers.provider);
