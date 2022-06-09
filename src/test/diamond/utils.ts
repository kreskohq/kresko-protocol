import { deployments, getSignatures, ethers } from "hardhat";
import {
    AccessControlFacet,
    AccessControlFacet__factory,
    DiamondCutFacet,
    DiamondCutFacet__factory,
    DiamondLoupeFacet,
    DiamondLoupeFacet__factory,
    DiamondOwnershipFacet,
    DiamondOwnershipFacet__factory,
    ERC165Facet,
    ERC165Facet__factory,
    Kresko,
} from "types";

export const getUsers = async (): Promise<Users> => {
    const { deployer, owner, operator, userOne, userTwo, userThree, nonadmin, liquidator, feedValidator } =
        await ethers.getNamedSigners();
    return {
        deployer,
        owner,
        operator,
        userOne,
        userTwo,
        userThree,
        nonadmin,
        liquidator,
        feedValidator,
    };
};

export const getFacets = async () => [
    {
        name: "DiamondCutFacet",
        contract: await ethers.getContract<DiamondCutFacet>("DiamondCutFacet"),
        signatures: getSignatures(DiamondCutFacet__factory.abi),
    },
    {
        name: "DiamondLoupeFacet",
        contract: await ethers.getContract<DiamondLoupeFacet>("DiamondLoupeFacet"),
        signatures: getSignatures(DiamondLoupeFacet__factory.abi),
    },
    {
        name: "DiamondOwnershipFacet",
        contract: await ethers.getContract<DiamondOwnershipFacet>("DiamondOwnershipFacet"),
        signatures: getSignatures(DiamondOwnershipFacet__factory.abi),
    },
    {
        name: "AccessControlFacet",
        contract: await ethers.getContract<AccessControlFacet>("AccessControlFacet"),
        signatures: getSignatures(AccessControlFacet__factory.abi),
    },
    {
        name: "ERC165Facet",
        contract: await ethers.getContract<ERC165Facet>("ERC165Facet"),
        signatures: getSignatures(ERC165Facet__factory.abi),
    },
];

export const fixtures = {
    diamondInit: deployments.createFixture(async _hre => {
        await deployments.fixture(["diamond-init"]);

        const DiamondDeployment = await _hre.deployments.get("Diamond");
        const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);
        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
        };
    }),
    minterInit: deployments.createFixture(async _hre => {
        await deployments.fixture(["diamond-init", "minter-init"]);

        const DiamondDeployment = await _hre.deployments.get("Diamond");
        const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);
        return {
            DiamondDeployment,
            Diamond,
            facets: DiamondDeployment.facets,
            users: await getUsers(),
        };
    }),
};

export const randomContractAddress = () => {
    const pubKey = ethers.Wallet.createRandom().publicKey;

    return ethers.utils.getContractAddress({
        from: pubKey,
        nonce: 0,
    });
};

export enum Errors {
    /* -------------------------------------------------------------------------- */
    /*                                    Diamond                                 */
    /* -------------------------------------------------------------------------- */

    // Preserve readability for the diamond proxy
    DIAMOND_INVALID_FUNCTION_SIGNATURE = "krDiamond: function does not exist",
    DIAMOND_INVALID_PENDING_OWNER = "krDiamond: Must be pending contract owner",
    DIAMOND_INVALID_OWNER = "krDiamond: Must be diamond owner",

    /* -------------------------------------------------------------------------- */
    /*                                   1. General                               */
    /* -------------------------------------------------------------------------- */

    NOT_OWNER = "100", // The sender must be owner
    NOT_OPERATOR = "101", // The sender must be operator
    ZERO_WITHDRAW = "102", // Withdraw must be greater than 0
    ZERO_DEPOSIT = "103", // Deposit must be greater than 0
    ZERO_ADDRESS = "104", // Address provided cannot be address(0)
    CONTRACT_ALREADY_INITIALIZED = "105", // Contract has already been initialized

    /* -------------------------------------------------------------------------- */
    /*                                   2. Minter                                 */
    /* -------------------------------------------------------------------------- */

    ACCOUNT_NOT_LIQUIDATABLE = "200", // Account has collateral deposits exceeding minCollateralValue
    ZERO_MINT = "201", // Mint amount must be greater than 0
    ZERO_BURN = "202", // Burn amount must be greater than 0
    ADDRESS_INVALID_ORACLE = "203", // Oracle address cant be set to address(0)
    ADDRESS_INVALID_NRWT = "204", // Underlying rebasing token address cant be set to address(0)
    ADDRESS_INVALID_FEERECIPIENT = "205", // Fee recipient address cant be set to address(0)
    ADDRESS_INVALID_COLLATERAL = "206", // Collateral address cant be set to address(0)
    COLLATERAL_EXISTS = "207", // Collateral has already been added into the protocol
    COLLATERAL_INVALID_FACTOR = "208", // cFactor must be greater than 1FP
    COLLATERAL_WITHDRAW_OVERFLOW = "209", // Withdraw amount cannot reduce accounts collateral value under minCollateralValue
    KRASSET_INVALID_FACTOR = "210", // kFactor must be greater than 1FP
    KRASSET_BURN_AMOUNT_OVERFLOW = "211", // Burn amount asset debt amount
    KRASSET_EXISTS = "212", // Asset is already added
    PARAM_BURN_FEE_TOO_HIGH = "213", // "Burn fee exceeds MAX_BURN_FEE"
    PARAM_LIQUIDATION_INCENTIVE_LOW = "214", // "Liquidation incentive less than MIN_LIQUIDATION_INCENTIVE_MULTIPLIER"
    PARAM_LIQUIDATION_INCENTIVE_HIGH = "215", // "Liquidation incentive greater than MAX_LIQUIDATION_INCENTIVE_MULTIPLIER"
    PARAM_MIN_COLLATERAL_RATIO_LOW = "216", // Minimum collateral ratio less than MIN_COLLATERALIZATION_RATIO
    PARAM_MIN_DEBT_AMOUNT_HIGH = "217", // Minimum debt param argument exceeds MAX_DEBT_VALUE

    /* -------------------------------------------------------------------------- */
    /*                                   3. Staking                               */
    /* -------------------------------------------------------------------------- */

    REWARD_PER_BLOCK_MISSING = "300", // Each reward token must have a reward per block value
    REWARD_TOKENS_MISSING = "301", // Pool must include an array of reward token addresses
    POOL_EXISTS = "302", // Pool with this deposit token already exists
    POOL_DOESNT_EXIST = "303", // Pool with this deposit token does not exist
    ADDRESS_INVALID_REWARD_RECIPIENT = "304", // Reward recipient cant be address(0)
}
