// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {VaultAsset} from "vault/Types.sol";

interface IVault {
    /* -------------------------------------------------------------------------- */
    /*                                Functionality                               */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice This function deposits `assetsIn` of `asset`, regardless of the amount of vault shares minted.
     * @notice If depositFee > 0, `depositFee` of `assetsIn` is sent to the fee recipient.
     * @dev emits Deposit(caller, receiver, asset, assetsIn, sharesOut);
     * @param asset Asset to deposit.
     * @param assetsIn Amount of `asset` to deposit.
     * @param receiver Address to receive `sharesOut` of vault shares.
     * @return sharesOut Amount of vault shares minted for `assetsIn`.
     * @return assetFee Amount of fees paid in `asset`.
     */
    function deposit(address asset, uint256 assetsIn, address receiver) external returns (uint256 sharesOut, uint256 assetFee);

    /**
     * @notice This function mints `sharesOut` of vault shares, regardless of the amount of `asset` received.
     * @notice If depositFee > 0, `depositFee` of `assetsIn` is sent to the fee recipient.
     * @param asset Asset to deposit.
     * @param sharesOut Amount of vault shares desired to mint.
     * @param receiver Address to receive `sharesOut` of shares.
     * @return assetsIn Assets used to mint `sharesOut` of vault shares.
     * @return assetFee Amount of fees paid in `asset`.
     * @dev emits Deposit(caller, receiver, asset, assetsIn, sharesOut);
     */
    function mint(address asset, uint256 sharesOut, address receiver) external returns (uint256 assetsIn, uint256 assetFee);

    /**
     * @notice This function burns `sharesIn` of shares from `owner`, regardless of the amount of `asset` received.
     * @notice If withdrawFee > 0, `withdrawFee` of `assetsOut` is sent to the fee recipient.
     * @param asset Asset to redeem.
     * @param sharesIn Amount of vault shares to redeem.
     * @param receiver Address to receive the redeemed assets.
     * @param owner Owner of vault shares.
     * @return assetsOut Amount of `asset` used for redeem `assetsOut`.
     * @return assetFee Amount of fees paid in `asset`.
     * @dev emits Withdraw(caller, receiver, asset, owner, assetsOut, sharesIn);
     */
    function redeem(
        address asset,
        uint256 sharesIn,
        address receiver,
        address owner
    ) external returns (uint256 assetsOut, uint256 assetFee);

    /**
     * @notice This function withdraws `assetsOut` of assets, regardless of the amount of vault shares required.
     * @notice If withdrawFee > 0, `withdrawFee` of `assetsOut` is sent to the fee recipient.
     * @param asset Asset to withdraw.
     * @param assetsOut Amount of `asset` desired to withdraw.
     * @param receiver Address to receive the withdrawn assets.
     * @param owner Owner of vault shares.
     * @return sharesIn Amount of vault shares used to withdraw `assetsOut` of `asset`.
     * @return assetFee Amount of fees paid in `asset`.
     * @dev emits Withdraw(caller, receiver, asset, owner, assetsOut, sharesIn);
     */
    function withdraw(
        address asset,
        uint256 assetsOut,
        address receiver,
        address owner
    ) external returns (uint256 sharesIn, uint256 assetFee);

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Returns the total value of all assets in the shares contract in USD WAD precision.
     */
    function totalAssets() external view returns (uint256 result);

    /**
     * @notice Assets array used for iterating through the assets in the shares contract
     */
    function assetList(uint256 index) external view returns (address asset);

    /**
     * @notice Fee recipient address
     */
    function feeRecipient() external view returns (address);

    /**
     * @notice Returns the asset struct for a given asset
     * @param asset Supported asset address
     * @return asset Asset struct for `asset`
     */
    function assets(address) external view returns (VaultAsset memory asset);

    /**
     * @notice This function is used for previewing the amount of shares minted for `assetsIn` of `asset`.
     * @param asset Supported asset address
     * @param assetsIn Amount of `asset` in.
     * @return sharesOut Amount of vault shares minted.
     * @return assetFee Amount of fees paid in `asset`.
     */
    function previewDeposit(address asset, uint256 assetsIn) external view returns (uint256 sharesOut, uint256 assetFee);

    /**
     * @notice This function is used for previewing `assetsIn` of `asset` required to mint `sharesOut` of vault shares.
     * @param asset Supported asset address
     * @param sharesOut Desired amount of vault shares to mint.
     * @return assetsIn Amount of `asset` required.
     * @return assetFee Amount of fees paid in `asset`.
     */
    function previewMint(address asset, uint256 sharesOut) external view returns (uint256 assetsIn, uint256 assetFee);

    /**
     * @notice This function is used for previewing `assetsOut` of `asset` received for `sharesIn` of vault shares.
     * @param asset Supported asset address
     * @param sharesIn Desired amount of vault shares to burn.
     * @return assetsOut Amount of `asset` received.
     * @return assetFee Amount of fees paid in `asset`.
     */
    function previewRedeem(address asset, uint256 sharesIn) external view returns (uint256 assetsOut, uint256 assetFee);

    /**
     * @notice This function is used for previewing `sharesIn` of vault shares required to burn for `assetsOut` of `asset`.
     * @param asset Supported asset address
     * @param assetsOut Desired amount of `asset` out.
     * @return sharesIn Amount of vault shares required.
     * @return assetFee Amount of fees paid in `asset`.
     */
    function previewWithdraw(address asset, uint256 assetsOut) external view returns (uint256 sharesIn, uint256 assetFee);

    /**
     * @notice Returns the maximum deposit amount of `asset`
     * @param asset Supported asset address
     * @return assetsIn Maximum depositable amount of assets.
     */
    function maxDeposit(address asset) external view returns (uint256 assetsIn);

    /**
     * @notice Returns the maximum mint using `asset`
     * @param asset Supported asset address.
     * @param owner Owner of assets.
     * @return sharesOut Maximum mint amount.
     */
    function maxMint(address asset, address owner) external view returns (uint256 sharesOut);

    /**
     * @notice Returns the maximum redeemable amount for `user`
     * @param asset Supported asset address.
     * @param owner Owner of vault shares.
     * @return sharesIn Maximum redeemable amount of `shares` (vault share balance)
     */
    function maxRedeem(address asset, address owner) external view returns (uint256 sharesIn);

    /**
     * @notice Returns the maximum redeemable amount for `user`
     * @param asset Supported asset address.
     * @param owner Owner of vault shares.
     * @return amountOut Maximum amount of `asset` received.
     */
    function maxWithdraw(address asset, address owner) external view returns (uint256 amountOut);

    /**
     * @notice Returns the exchange rate of one vault share to USD.
     * @return rate Exchange rate of one vault share to USD in wad precision.
     */
    function exchangeRate() external view returns (uint256 rate);

    /**
     * @notice Returns the oracle decimals used for value calculations.
     */
    function oracleDecimals() external view returns (uint8);

    /**
     * @notice Returns the governance address.
     */
    function governance() external view returns (address);

    /* -------------------------------------------------------------------------- */
    /*                                    Admin                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Adds a new asset to the vault
     * @param asset Asset to add
     */
    function addAsset(VaultAsset memory asset) external;

    /**
     * @notice Removes an asset from the vault
     * @param asset Asset address to remove
     * emits assetRemoved(asset, block.timestamp);
     */
    function removeAsset(address asset) external;

    /**
     * @notice Current governance sets a new governance address
     * @param _newGovernance The new governance address
     */
    function setGovernance(address _newGovernance) external;

    /**
     * @notice Current governance sets a new fee recipient address
     * @param _newFeeRecipient The new fee recipient address
     */
    function setFeeRecipient(address _newFeeRecipient) external;

    /**
     * @notice Sets a new oracle for a asset
     * @param asset Asset to set the oracle for
     * @param oracle Oracle to set
     * @param timeout Oracle timeout to set
     */
    function setOracle(address asset, address oracle, uint32 timeout) external;

    /**
     * @notice Sets a new oracle decimals
     * @param _oracleDecimals New oracle decimal precision
     */
    function setOracleDecimals(uint8 _oracleDecimals) external;

    /**
     * @notice Sets the max deposit amount for a asset
     * @param asset Asset to set the max deposits for
     * @param maxDeposits Max deposits to set
     */
    function setMaxDeposits(address asset, uint248 maxDeposits) external;

    /**
     * @notice Sets the enabled status for a asset
     * @param asset Asset to set the enabled status for
     * @param isEnabled Enabled status to set
     */
    function setAssetEnabled(address asset, bool isEnabled) external;

    /**
     * @notice Sets the deposit fee for a asset
     * @param asset Asset to set the deposit fee for
     * @param fee Fee to set
     */
    function setDepositFee(address asset, uint32 fee) external;

    /**
     * @notice Sets the withdraw fee for a asset
     * @param asset Asset to set the withdraw fee for
     * @param fee Fee to set
     */
    function setWithdrawFee(address asset, uint32 fee) external;

    /* -------------------------------------------------------------------------- */
    /*                                   Errors                                   */
    /* -------------------------------------------------------------------------- */
}
