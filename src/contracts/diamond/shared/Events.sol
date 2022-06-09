// SPDX-License-Identifier: MIT
pragma solidity 0.8.14;
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

library GeneralEvent {
    /**
     * @dev Triggered when the contract has been initialized or reinitialized.
     */
    event Deployed(address indexed owner, uint8 version);
    event Initialized(address indexed operator, uint8 version);
}

library DiamondEvent {
    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);
}

library MinterEvent {
    /* ===== Collateral ===== */

    /**
     * @notice Emitted when a collateral asset is added to the protocol.
     * @dev Can only be emitted once for a given collateral asset.
     * @param collateralAsset The address of the collateral asset.
     * @param factor The collateral factor.
     * @param oracle The address of the oracle.
     */
    event CollateralAssetAdded(address indexed collateralAsset, uint256 indexed factor, address indexed oracle);

    /**
     * @notice Emitted when a collateral asset is updated.
     * @param collateralAsset The address of the collateral asset.
     * @param factor The collateral factor.
     * @param oracle The oracle address.
     */
    event CollateralAssetUpdated(address indexed collateralAsset, uint256 indexed factor, address indexed oracle);

    /**
     * @notice Emitted when an account deposits collateral.
     * @param account The address of the account depositing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was deposited.
     */
    event CollateralDeposited(address indexed account, address indexed collateralAsset, uint256 indexed amount);

    /**
     * @notice Emitted when an account withdraws collateral.
     * @param account The address of the account withdrawing collateral.
     * @param collateralAsset The address of the collateral asset.
     * @param amount The amount of the collateral asset that was withdrawn.
     */
    event CollateralWithdrawn(address indexed account, address indexed collateralAsset, uint256 indexed amount);

    /* ===== Kresko Assets ===== */

    /**
     * @notice Emitted when a Kresko asset is added to the protocol.
     * @dev Can only be emitted once for a given Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param symbol The symbol of the Kresko asset.
     * @param kFactor The k-factor.
     * @param oracle The address of the oracle.
     * @param marketCapLimit The initial market capitalization USD limit.
     */
    event KreskoAssetAdded(
        address indexed kreskoAsset,
        string indexed symbol,
        uint256 indexed kFactor,
        address oracle,
        uint256 marketCapLimit
    );

    /**
     * @notice Emitted when a Kresko asset's oracle is updated.
     * @param kreskoAsset The address of the Kresko asset.
     * @param kFactor The k-factor.
     * @param oracle The address of the oracle.
     * @param mintable The mintable value.
     * @param limit The market capitalization USD limit.
     */
    event KreskoAssetUpdated(
        address indexed kreskoAsset,
        uint256 indexed kFactor,
        address indexed oracle,
        bool mintable,
        uint256 limit
    );

    /**
     * @notice Emitted when an account mints a Kresko asset.
     * @param account The address of the account minting the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the Kresko asset that was minted.
     */
    event KreskoAssetMinted(address indexed account, address indexed kreskoAsset, uint256 indexed amount);

    /**
     * @notice Emitted when an account burns a Kresko asset.
     * @param account The address of the account burning the Kresko asset.
     * @param kreskoAsset The address of the Kresko asset.
     * @param amount The amount of the Kresko asset that was burned.
     */
    event KreskoAssetBurned(address indexed account, address indexed kreskoAsset, uint256 indexed amount);

    /**
     * @notice Emitted when an account pays a burn fee with a collateral asset upon burning a Kresko asset.
     * @dev This can be emitted multiple times for a single Kresko asset burn.
     * @param account The address of the account burning the Kresko asset.
     * @param paymentCollateralAsset The address of the collateral asset used to pay the burn fee.
     * @param paymentAmount The amount of the payment collateral asset that was paid.
     * @param paymentValue The USD value of the payment.
     */
    event BurnFeePaid(
        address indexed account,
        address indexed paymentCollateralAsset,
        uint256 indexed paymentAmount,
        uint256 paymentValue
    );

    /**
     * @notice Emitted when a liquidation occurs.
     * @param account The address of the account being liquidated.
     * @param liquidator The account performing the liquidation.
     * @param repayKreskoAsset The address of the Kresko asset being paid back to the protocol by the liquidator.
     * @param repayAmount The amount of the repay Kresko asset being paid back to the protocol by the liquidator.
     * @param seizedCollateralAsset The address of the collateral asset being seized from the account by the liquidator.
     * @param collateralSent The amount of the seized collateral asset being seized from the account by the liquidator.
     */
    event LiquidationOccurred(
        address indexed account,
        address indexed liquidator,
        address indexed repayKreskoAsset,
        uint256 repayAmount,
        address seizedCollateralAsset,
        uint256 collateralSent
    );

    /* ===== Configurable Parameters ===== */

    /**
     * @notice Emitted when the a trusted contract is added/removed.
     * @param contractAddress A trusted contract (eg. Kresko Zapper).
     * @param isTrusted true if the contract was added, false if removed
     */
    event TrustedContract(address indexed contractAddress, bool indexed isTrusted);

    /**
     * @notice Emitted when the burn fee is updated.
     * @param burnFee The new burn fee raw value.
     */
    event BurnFeeUpdated(uint256 indexed burnFee);

    /**
     * @notice Emitted when the fee recipient is updated.
     * @param feeRecipient The new fee recipient.
     */
    event FeeRecipientUpdated(address indexed feeRecipient);

    /**
     * @notice Emitted when the liquidation incentive multiplier is updated.
     * @param liquidationIncentiveMultiplier The new liquidation incentive multiplier raw value.
     */
    event LiquidationIncentiveMultiplierUpdated(uint256 indexed liquidationIncentiveMultiplier);

    /**
     * @notice Emitted when the minimum collateralization ratio is updated.
     * @param minimumCollateralizationRatio The new minimum collateralization ratio raw value.
     */
    event MinimumCollateralizationRatioUpdated(uint256 indexed minimumCollateralizationRatio);

    /**
     * @notice Emitted when the minimum debt value updated.
     * @param minimumDebtValue The new minimum debt value.
     */
    event MinimumDebtValueUpdated(uint256 indexed minimumDebtValue);
}

library StakingEvent {
    event LiquidityAndStakeAdded(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event LiquidityAndStakeRemoved(address indexed to, uint256 indexed amount, uint256 indexed pid);
    event Deposit(address indexed user, uint256 indexed pid, uint256 indexed amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 indexed amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 indexed amount);
    event ClaimRewards(address indexed user, address indexed rewardToken, uint256 indexed amount);
    event ClaimRewardsMulti(address indexed to);
}

library AccessControlEvent {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PendingOwnershipTransfer(address indexed previousOwner, address indexed newOwner);
    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted signaling this.
     *
     * _Available since v3.1._
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call, an admin role
     * bearer except when using {AccessControl-_setupRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
}
