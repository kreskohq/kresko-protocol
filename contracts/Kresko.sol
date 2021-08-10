// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./KreskoAsset.sol";

import "./interfaces/IOracle.sol";
import "./libraries/FixedPoint.sol";

contract Kresko is Ownable {
    using FixedPoint for FixedPoint.Unsigned;

    /**
     * Whitelist of assets that can be used as collateral
     * with their respective collateral factor and oracle address
     */
    struct CollateralAsset {
        FixedPoint.Unsigned factor;
        IOracle oracle;
        bool exists;
        uint8 decimals;
    }

    /**
     * Whitelist of kresko assets with their respective name,
     * deployed address, k factor, and oracle address
     */
    struct KAsset {
        FixedPoint.Unsigned kFactor;
        IOracle oracle;
        bool exists;
    }

    uint256 public minimumCollateralizationRatio;

    mapping(address => CollateralAsset) public collateralAssets;
    mapping(address => KAsset) public kreskoAssets;
    mapping(string => bool) public kreskoAssetSymbols; // Prevents duplicate KreskoAsset symbols
    /**
     * Maps each account to a mapping of collateral asset address to the amount
     * the user has deposited into this contract. Requires the collateral to not rebase.
     */
    mapping(address => mapping(address => uint256)) public collateralDeposits;

    /**
     * Maps each account to an array of the addresses of each collateral asset the account
     * has deposited. Used for calculating an account's CV.
     */
    mapping(address => address[]) public depositedCollateralAssets;

    /**
     * Maps each account to a mapping of Kresko asset address to the amount
     * the user has currently minted.
     */
    mapping(address => mapping(address => uint256)) public kreskoAssetDebt;

    /**
     * Maps each account to an array of the addresses of each Kresko asset the account
     * has minted. Used for calculating an account's MCV.
     */
    mapping(address => address[]) public mintedKreskoAssets;

    event UpdateMinimumCollateralizationRatio(uint256 minimumCollateralizationRatio);
    // Collateral asset events
    event AddCollateralAsset(address assetAddress, uint256 factor, address oracle);
    event UpdateCollateralAssetFactor(address assetAddress, uint256 factor);
    event UpdateCollateralAssetOracle(address assetAddress, address oracle);
    event DepositedCollateral(address account, address assetAddress, uint256 amount);
    event WithdrewCollateral(address account, address assetAddress, uint256 amount);
    // Kresko asset events
    event AddKreskoAsset(string name, string symbol, address assetAddress, uint256 kFactor, address oracle);
    event UpdateKreskoAssetKFactor(address assetAddress, uint256 kFactor);
    event UpdateKreskoAssetOracle(address assetAddress, address oracle);
    event KreskoAssetMinted(address account, address assetAddress, uint256 amount);

    modifier collateralAssetExists(address assetAddress) {
        require(collateralAssets[assetAddress].exists, "ASSET_NOT_VALID");
        _;
    }

    modifier collateralAssetDoesNotExist(address assetAddress) {
        require(!collateralAssets[assetAddress].exists, "ASSET_EXISTS");
        _;
    }

    modifier kreskoAssetExists(address assetAddress) {
        require(kreskoAssets[assetAddress].exists, "ASSET_NOT_VALID");
        _;
    }

    modifier kreskoAssetDoesNotExist(string calldata symbol) {
        require(!kreskoAssetSymbols[symbol], "SYMBOL_NOT_VALID");
        _;
    }

    modifier nonNullString(string calldata str) {
        require(bytes(str).length > 0, "NULL_STRING");
        _;
    }

    constructor(uint256 minCollateralizationRatio) {
        minimumCollateralizationRatio = minCollateralizationRatio;
    }

    /**
     * @dev Updates the contract's collateralization ratio
     * @param minCollateralizationRatio The new minimum collateralization ratio
     */
    function updateMinimumCollateralizationRatio(uint256 minCollateralizationRatio) external onlyOwner {
        require(minCollateralizationRatio <= 0, "INVALID_RATIO");

        minimumCollateralizationRatio = minCollateralizationRatio;
        emit UpdateMinimumCollateralizationRatio(minimumCollateralizationRatio);
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
        // Transfer tokens into this contract prior to any state changes as an extra measure against re-entrancy.
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
     * deposited collateral assets array. Only needed if withdrawing the entire deposit of a particular
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

        // Ensure the withdrawal does not result in the account having a health factor < 1.
        // I.e. the new account's collateral value must still exceed the account's minimum
        // collateral value.
        // Get the account's current collateral value.
        FixedPoint.Unsigned memory accountCollateralValue = getAccountCollateralValue(msg.sender);
        // Get the collateral value that the account will lose as a result of this withdrawal.
        FixedPoint.Unsigned memory withdrawnCollateralValue = getCollateralValue(assetAddress, amount);
        // Get the account's minimum collateral value.
        FixedPoint.Unsigned memory accountMinCollateralValue = getAccountMinimumCollateralValue(msg.sender);
        // Require accountCollateralValue - withdrawnCollateralValue >= accountMinCollateralValue
        require(
            accountCollateralValue.sub(withdrawnCollateralValue).isGreaterThanOrEqual(accountMinCollateralValue),
            "HEALTH_FACTOR_VIOLATED"
        );

        // Record the withdrawal.
        collateralDeposits[msg.sender][assetAddress] = depositAmount - amount;
        // If the sender is withdrawing all of the collateral asset, remove the collateral asset
        // from the sender's deposited collateral assets array.
        if (amount == depositAmount) {
            removeFromDepositedCollateralAssets(msg.sender, assetAddress, depositedCollateralAssetIndex);
        }
        require(asset.transfer(msg.sender, amount), "TRANSFER_OUT_FAILED");

        emit WithdrewCollateral(msg.sender, assetAddress, amount);
    }

    /**
     * @dev Whitelists a collateral asset
     * @param assetAddress The on chain address of the collateral asset
     * @param factor The collateral factor of the collateral asset. Must be <= 1e18.
     * @param oracle The oracle address for the collateral asset
     */
    function addCollateralAsset(
        address assetAddress,
        uint256 factor,
        address oracle
    ) external onlyOwner collateralAssetDoesNotExist(assetAddress) {
        require(assetAddress != address(0), "ZERO_ADDRESS");
        require(factor <= FixedPoint.FP_SCALING_FACTOR, "INVALID_FACTOR");
        require(oracle != address(0), "ZERO_ADDRESS");

        collateralAssets[assetAddress] = CollateralAsset({
            factor: FixedPoint.Unsigned(factor),
            oracle: IOracle(oracle),
            exists: true,
            decimals: IERC20Metadata(assetAddress).decimals()
        });
        emit AddCollateralAsset(assetAddress, factor, oracle);
    }

    /**
     * @dev Updates the collateral factor of a previously whitelisted collateral asset
     * @param assetAddress The on chain address of the collateral asset
     * @param factor The new collateral factor of the collateral asset. Must be <= 1e18.
     */
    function updateCollateralFactor(address assetAddress, uint256 factor)
        external
        onlyOwner
        collateralAssetExists(assetAddress)
    {
        // Setting the factor to 0 effectively sunsets a collateral asset, which
        // is intentionally allowed.
        require(factor <= FixedPoint.FP_SCALING_FACTOR, "INVALID_FACTOR");

        collateralAssets[assetAddress].factor = FixedPoint.Unsigned(factor);
        emit UpdateCollateralAssetFactor(assetAddress, factor);
    }

    /**
     * @dev Updates the oracle address of a previously whitelisted collateral asset
     * @param assetAddress The on chain address of the collateral asset
     * @param oracle The new oracle address for the collateral asset
     */
    function updateCollateralOracle(address assetAddress, address oracle)
        external
        onlyOwner
        collateralAssetExists(assetAddress)
    {
        require(oracle != address(0), "ZERO_ADDRESS");

        collateralAssets[assetAddress].oracle = IOracle(oracle);
        emit UpdateCollateralAssetOracle(assetAddress, oracle);
    }

    /**
     * @dev Whitelists a kresko asset
     * @param name The name of the kresko asset
     * @param symbol The symbol of the kresko asset
     * @param kFactor The k factor of the kresko asset. Must be >= 1e18.
     * @param oracle The oracle address for the kresko asset
     */
    function addKreskoAsset(
        string calldata name,
        string calldata symbol,
        uint256 kFactor,
        address oracle
    ) external onlyOwner nonNullString(symbol) nonNullString(name) kreskoAssetDoesNotExist(symbol) {
        require(kFactor >= FixedPoint.FP_SCALING_FACTOR, "INVALID_FACTOR");
        require(oracle != address(0), "ZERO_ADDRESS");

        // Store symbol to prevent duplicate KreskoAsset symbols
        kreskoAssetSymbols[symbol] = true;

        // Deploy KreskoAsset contract and store its details
        KreskoAsset asset = new KreskoAsset(name, symbol);
        kreskoAssets[address(asset)] = KAsset({
            kFactor: FixedPoint.Unsigned(kFactor),
            oracle: IOracle(oracle),
            exists: true
        });
        emit AddKreskoAsset(name, symbol, address(asset), kFactor, oracle);
    }

    /**
     * @dev Updates the k factor of a previously whitelisted kresko asset
     * @param assetAddress The address of the kresko asset
     * @param kFactor The new k factor of the kresko asset
     */
    function updateKreskoAssetFactor(address assetAddress, uint256 kFactor)
        external
        onlyOwner
        kreskoAssetExists(assetAddress)
    {
        require(kFactor >= FixedPoint.FP_SCALING_FACTOR, "INVALID_FACTOR");

        kreskoAssets[assetAddress].kFactor = FixedPoint.Unsigned(kFactor);
        emit UpdateKreskoAssetKFactor(assetAddress, kFactor);
    }

    /**
     * @dev Updates the oracle address of a previously whitelisted kresko asset
     * @param assetAddress The address of the kresko asset
     * @param oracle The new oracle address for the kresko asset
     */
    function updateKreskoAssetOracle(address assetAddress, address oracle)
        external
        onlyOwner
        kreskoAssetExists(assetAddress)
    {
        require(oracle != address(0), "ZERO_ADDRESS");

        kreskoAssets[assetAddress].oracle = IOracle(oracle);
        emit UpdateKreskoAssetOracle(assetAddress, oracle);
    }

    /**
     * @notice Gets the collateral value of a particular account.
     * @dev O(# of different deposited collateral assets by account) complexity.
     * @param account The account to calculate the collateral value for.
     * @return The collateral value of a particular account.
     */
    function getAccountCollateralValue(address account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory collateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = depositedCollateralAssets[account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            collateralValue = collateralValue.add(getCollateralValue(asset, collateralDeposits[account][asset]));
        }
        return collateralValue;
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param assetAddress The address of the collateral asset.
     * @param amount The amount of the collateral asset to calculate the collateral value for.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValue(address assetAddress, uint256 amount) public view returns (FixedPoint.Unsigned memory) {
        CollateralAsset memory collateralAsset = collateralAssets[assetAddress];
        // Initially, use the stored amount from collateralDeposits as the
        // raw value for the FixedPoint.Unsigned, which internally uses
        // FixedPoint.FP_DECIMALS (18) decimals. Most collateral assets
        // will have 18 decimals.
        FixedPoint.Unsigned memory depositAmount = FixedPoint.Unsigned(amount);
        // Handle cases where the collateral asset's decimal amount is not 18.
        if (collateralAsset.decimals < FixedPoint.FP_DECIMALS) {
            // If the decimals are less than 18, multiply the depositAmount
            // to get the correct fixed point value.
            // E.g. having deposited 1 full token of a 17 decimal token will
            // cause the initial setting of depositAmount to be 0.1, so we multiply
            // by 10 ** (18 - 17) = 10 to get it to 0.1 * 10 = 1.
            depositAmount = depositAmount.mul(10**(FixedPoint.FP_DECIMALS - collateralAsset.decimals));
        } else if (collateralAsset.decimals > FixedPoint.FP_DECIMALS) {
            // If the decimals are greater than 18, divide the depositAmount
            // to get the correct fixed point value.
            // Note because FixedPoint numbers are 18 decimals, this results
            // in loss of precision. E.g. if the cocllateral asset has 19
            // decimals and the deposit amount is only 1 uint, this will divide
            // 1 by 10 ** (19 - 18), resulting in 1 / 10 = 0
            depositAmount = depositAmount.div(10**(collateralAsset.decimals - FixedPoint.FP_DECIMALS));
        }
        return depositAmount.mul(FixedPoint.Unsigned(collateralAsset.oracle.value())).mul(collateralAsset.factor);
    }

    /**
     * @notice Gets an array of collateral assets the account has deposited.
     * @param account The account to get the deposited collateral assets for.
     * @return An array of addresses of collateral assets the account has deposited.
     */
    function getDepositedCollateralAssets(address account) external view returns (address[] memory) {
        return depositedCollateralAssets[account];
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
        require(depositedCollateralAssets[account][index] == assetAddress, "WRONG_DEPOSITED_COLLATERAL_ASSETS_INDEX");
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
     * @notice Mints new Kresko assets.
     * @dev
     * @param assetAddress The address of the Kresko asset.
     * @param amount The amount of the Kresko asset to be minted.
     */
    function mintKreskoAsset(address assetAddress, uint256 amount) external kreskoAssetExists(assetAddress) {
        require(amount > 0, "AMOUNT_ZERO");

        // Get the value of the minter's current deposited collateral
        FixedPoint.Unsigned memory accountCollateralValue = getAccountCollateralValue(msg.sender);
        // Get the account's current minimum collateral value required to maintain current debts
        FixedPoint.Unsigned memory minAccountCollateralValue = getAccountMinimumCollateralValue(msg.sender);
        // Calculate additional collateral amount required to back requested additional mint
        FixedPoint.Unsigned memory additionalCollateralValue = getMinimumCollateralValue(assetAddress, amount);

        // Verify that minter has sufficient collateral to back current debt + new requested debt
        require(
            minAccountCollateralValue.add(additionalCollateralValue).isLessThanOrEqual(accountCollateralValue),
            "INSUFFICIENT_COLLATERAL"
        );

        // If the account does not have an existing debt for this Kresko Asset
        // push it to the list of the account's minted Kresko Assets
        uint256 existingDebtAmount = kreskoAssetDebt[msg.sender][assetAddress];
        if (existingDebtAmount == 0) {
            mintedKreskoAssets[msg.sender].push(assetAddress);
        }
        // Record the mint
        kreskoAssetDebt[msg.sender][assetAddress] = existingDebtAmount + amount;

        KreskoAsset(assetAddress).mint(msg.sender, amount);

        emit KreskoAssetMinted(msg.sender, assetAddress, amount);
    }

    /**
     * @notice Gets an account's minimum collateral value for its Kresko Asset debts.
     * @param account The account to calculate the minimum collateral value for.
     * @return The minimum collateral value of a particular account.
     */
    function getAccountMinimumCollateralValue(address account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory minCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = mintedKreskoAssets[account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 amount = kreskoAssetDebt[account][asset];
            minCollateralValue = minCollateralValue.add(getMinimumCollateralValue(asset, amount));
        }
        return minCollateralValue;
    }

    /**
     * @notice Get the minimum collateral value required to keep a individual debt position healthy.
     * @param assetAddr The address of the Kresko Asset.
     * @param amount The Kresko Asset debt amount.
     * @return minCollateralValue is the minimum collateral value required for this Kresko Asset amount.
     */
    function getMinimumCollateralValue(address assetAddr, uint256 amount)
        public
        view
        kreskoAssetExists(assetAddr)
        returns (FixedPoint.Unsigned memory minCollateralValue)
    {
        KAsset memory kAsset = kreskoAssets[assetAddr];

        // Calculate the Kresko asset's value weighted by kFactor
        FixedPoint.Unsigned memory weightedKreskoAssetValue =
            FixedPoint.Unsigned(kAsset.oracle.value()).mul(FixedPoint.Unsigned(amount)).mul(kAsset.kFactor);

        // Calculate the minimum collateral required to back this Kresko asset amount
        return weightedKreskoAssetValue.mul(minimumCollateralizationRatio).div(100);
    }

    /**
     * @notice Gets an array of Kresko assets the account has minted.
     * @param account The account to get the minted Kresko assets for.
     * @return An array of addresses of Kresko assets the account has minted.
     */
    function getMintedKreskoAssets(address account) external view returns (address[] memory) {
        return mintedKreskoAssets[account];
    }
}
