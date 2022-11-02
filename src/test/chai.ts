import chai from "chai";
import { solidity } from "ethereum-waffle";
import { smock } from "@defi-wonderland/smock";
import { BigNumber } from "ethers";
import chaibn from "chai-bignumber";

chai.use(chaibn(BigNumber)).should();
chai.use(smock.matchers);
chai.use(solidity);

chai.config.includeStack = true;

export const expect = chai.expect;
