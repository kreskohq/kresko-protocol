// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./libraries/FixedPoint.sol";

contract Kresko is Ownable {
    using FixedPoint for FixedPoint.Unsigned;

    /**
     * Whitelist of assets that can be used as collateral
     * with their respective collateral factor and oracle address
     */
    struct CollateralAsset {
        FixedPoint.Unsigned factor;
        address oracle;
        bool exists;
    }

    mapping(address => CollateralAsset) public collateralAssets;

    /**
     * Maps each account to a mapping of collateral asset address to the amount
     * the user has deposited into this contract. Requires collateral to not rebase.
     */
    mapping(address => mapping(address => uint256)) public collateralDeposits;

    /**
     * Maps each account to an array of the addresses of each collateral asset the account
     * has deposited.
     */
    mapping(address => address[]) public depositedCollateralAssets;

    event AddCollateralAsset(address assetAddress, uint256 factor, address oracle);
    event UpdateCollateralAssetFactor(address assetAddress, uint256 factor);
    event UpdateCollateralAssetOracle(address assetAddress, address oracle);
    event DepositedCollateral(address account, address assetAddress, uint256 amount);
    event WithdrewCollateral(address account, address assetAddress, uint256 amount);

    modifier collateralAssetExists(address assetAddress) {
        require(collateralAssets[assetAddress].exists, "ASSET_NOT_VALID");
        _;
    }

    modifier collateralAssetDoesNotExist(address assetAddress) {
        require(!collateralAssets[assetAddress].exists, "ASSET_EXISTS");
        _;
    }

    constructor() {
        // Intentionally left blank
    }

    /**
     * @notice Deposits collateral into the protocol.
     * @dev The collateral asset must be whitelisted.
     * @param assetAddress The address of the collateral asset.
     * @param amount The amount of the collateral asset to deposit.
     */
    function depositCollateral(address assetAddress, uint256 amount) external collateralAssetExists(assetAddress) {
        // Because the depositedCollateralAssets[msg.sender] is pushed to if the existing
        // deposit amount is 0, require the amount to be > 0. Otherwise, the depositedCollateralAssets[msg.sender]
        // could be filled with duplicates, causing collateral to be double-counted in the collateral value.
        require(amount > 0, "AMOUNT_ZERO");

        IERC20 asset = IERC20(assetAddress);
        // Transfer tokens into this contract prior to any state changes as a measure against re-entrancy.
        require(asset.transferFrom(msg.sender, address(this), amount), "TRANSFER_IN_FAILED");

        // If the account does not have an existing deposit for this collateral asset,
        // push it to the list of the account's deposited collateral assets.
        uint256 existingDepositAmount = collateralDeposits[msg.sender][assetAddress];
        if (existingDepositAmount == 0) {
            depositedCollateralAssets[msg.sender].push(assetAddress);
        }
        // Record the deposit.
        collateralDeposits[msg.sender][assetAddress] = existingDepositAmount + amount;

        emit DepositedCollateral(msg.sender, assetAddress, amount);
    }

    /**
     * @notice Withdraws collateral from the protocol.
     * @dev The collateral asset must be whitelisted.
     * @param assetAddress The address of the collateral asset.
     * @param amount The amount of the collateral asset to withdraw.
     * @param depositedCollateralAssetIndex The index of the collateral asset in the sender's
     * deposited collateral assets array. Only needed if withdrawing the entire amount of a particular
     * collateral asset.
     */
    function withdrawCollateral(
        address assetAddress,
        uint256 amount,
        uint256 depositedCollateralAssetIndex
    ) external collateralAssetExists(assetAddress) {
        // Require the amount to be over 0, otherwise someone could attempt to withdraw 0 collateral
        // for an asset they have not deposited. This would fail further down, but we require here
        // to be explicit.
        require(amount > 0, "AMOUNT_ZERO");

        IERC20 asset = IERC20(assetAddress);
        // Ensure the amount being withdrawn is not greater than the amount of the collateral asset
        // the sender has deposited.
        uint256 depositAmount = collateralDeposits[msg.sender][assetAddress];
        require(amount <= depositAmount, "AMOUNT_TOO_HIGH");
        // Record the withdrawal.
        collateralDeposits[msg.sender][assetAddress] = depositAmount - amount;
        // If the sender is withdrawing all of the collateral asset, remove the collateral asset
        // from the sender's deposited collateral assets array.
        if (amount == depositAmount) {
            removeFromDepositedCollateralAssets(msg.sender, assetAddress, depositedCollateralAssetIndex);
        }
        // If for some reason the balance of this contract of the collateral asset is less than
        // the amount being withdrawn, give the sender the entire balance of the contract.
        // This shouldn't happen, as even loss of precision when it comes to deposited collateral
        // is unlikely, but just to be safe this is added.
        uint256 assetBalance = asset.balanceOf(address(this));
        uint256 transferAmount = assetBalance < amount ? assetBalance : amount;
        require(asset.transfer(msg.sender, transferAmount), "TRANSFER_OUT_FAILED");

        emit WithdrewCollateral(msg.sender, assetAddress, amount);
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(deposited collateral assets) complexity.
     * @param account The account to calculate the collateral value for.
     */
    function getCollateralValue(address account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory collateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = depositedCollateralAssets[account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            collateralValue = collateralValue.add(
                collateralAssets[asset].factor.mul(collateralDeposits[account][asset])
            );
        }
        return collateralValue;
    }

    /**
     * @notice Removes a particular collateral asset from an account's deposited collateral assets array.
     * @dev Removes an element by copying the last element to the element to remove's place and removing
     * the last element.
     * @param account The account whose deposited collateral asset array is being affected.
     * @param assetAddress The collateral asset to remove from the array.
     * @param index The index of the assetAddress in the deposited collateral assets array.
     */
    function removeFromDepositedCollateralAssets(
        address account,
        address assetAddress,
        uint256 index
    ) internal {
        // Ensure that the provided index corresponds to the provided assetAddress.
        require(depositedCollateralAssets[account][index] == assetAddress, "BAD_DEPOSITED_COLLATERAL_ASSETS_INDEX");
        uint256 lastIndex = depositedCollateralAssets[account].length - 1;
        // If the index to remove is not the last one, overwrite the element at the index
        // with the last element.
        if (index != lastIndex) {
            depositedCollateralAssets[account][index] = depositedCollateralAssets[account][lastIndex];
        }
        // Remove the last element.
        depositedCollateralAssets[account].pop();
    }

    /**
     * @dev Whitelists a collateral asset
     * @param assetAddress The on chain address of the asset
     * @param factor The collateral factor of the asset
     * @param oracle The oracle address for this asset
     */
    function addCollateralAsset(
        address assetAddress,
        uint256 factor,
        address oracle
    ) external onlyOwner collateralAssetDoesNotExist(assetAddress) {
        require(assetAddress != address(0), "ZERO_ADDRESS");
        require(factor != 0, "INVALID_FACTOR");
        require(oracle != address(0), "ZERO_ADDRESS");

        collateralAssets[assetAddress] = CollateralAsset({
            factor: FixedPoint.Unsigned(factor),
            oracle: oracle,
            exists: true
        });
        emit AddCollateralAsset(assetAddress, factor, oracle);
    }

    /**
     * @dev Updates the collateral factor of a previously whitelisted asset
     * @param assetAddress The on chain address of the asset
     * @param factor The new collateral factor of the asset
     */
    function updateCollateralFactor(address assetAddress, uint256 factor)
        external
        onlyOwner
        collateralAssetExists(assetAddress)
    {
        require(factor != 0, "INVALID_FACTOR");

        collateralAssets[assetAddress].factor = FixedPoint.Unsigned(factor);
        emit UpdateCollateralAssetFactor(assetAddress, factor);
    }

    /**
     * @dev Updates the oracle address of a previously whitelisted asset
     * @param assetAddress The on chain address of the asset
     * @param oracle The new oracle address for this asset
     */
    function updateCollateralOracle(address assetAddress, address oracle)
        external
        onlyOwner
        collateralAssetExists(assetAddress)
    {
        require(oracle != address(0), "ZERO_ADDRESS");

        collateralAssets[assetAddress].oracle = oracle;
        emit UpdateCollateralAssetOracle(assetAddress, oracle);
    }
}
