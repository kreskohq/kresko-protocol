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

    uint256 public constant MAX_BURN_FEE = 1e17; // Because FP_SCALING_FACTOR = 1e18, this is 10%

    uint256 public minimumCollateralizationRatio;

    /**
     * The percent fee imposed upon the value of burned krAssets, taken in the form of
     * the user's collateral and sent to feeRecipient.
     */
    FixedPoint.Unsigned public burnFee;

    /**
     * The recipient of burn fees.
     */
    address public feeRecipient;

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

    // Events for configurable parameters.
    event UpdateBurnFee(uint256 burnFee);
    event UpdateFeeRecipient(address feeRecipient);
    event UpdateMinimumCollateralizationRatio(uint256 minimumCollateralizationRatio);

    // Collateral asset events
    event AddCollateralAsset(address assetAddress, uint256 factor, address oracle);
    event UpdateCollateralAssetFactor(address assetAddress, uint256 factor);
    event UpdateCollateralAssetOracle(address assetAddress, address oracle);
    event DepositedCollateral(address account, address assetAddress, uint256 amount);
    event WithdrewCollateral(address account, address assetAddress, uint256 amount);
    event BurnFeePaid(address account, address paymentAsset, uint256 paymentAmount, uint256 paymentValue);

    // Kresko asset events
    event AddKreskoAsset(string name, string symbol, address assetAddress, uint256 kFactor, address oracle);
    event UpdateKreskoAssetKFactor(address assetAddress, uint256 kFactor);
    event UpdateKreskoAssetOracle(address assetAddress, address oracle);
    event KreskoAssetMinted(address account, address assetAddress, uint256 amount);
    event KreskoAssetBurned(address account, address assetAddress, uint256 amount);

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

    constructor(
        uint256 _minimumCollateralizationRatio,
        uint256 _burnFee,
        address _feeRecipient
    ) {
        updateMinimumCollateralizationRatio(_minimumCollateralizationRatio);
        setBurnFee(_burnFee);
        setFeeRecipient(_feeRecipient);
    }

    /**
     * @dev Updates the contract's collateralization ratio
     * @param minCollateralizationRatio The new minimum collateralization ratio
     */
    function updateMinimumCollateralizationRatio(uint256 minCollateralizationRatio) public onlyOwner {
        // TODO fix
        // require(minCollateralizationRatio <= 0, "INVALID_RATIO");

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
        (FixedPoint.Unsigned memory withdrawnCollateralValue, ) =
            getCollateralValueAndOraclePrice(
                assetAddress,
                amount,
                false // Take the collateral factor into consideration.
            );
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
        FixedPoint.Unsigned memory totalCollateralValue = FixedPoint.Unsigned(0);

        address[] memory assets = depositedCollateralAssets[account];
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            (FixedPoint.Unsigned memory collateralValue, ) =
                getCollateralValueAndOraclePrice(
                    asset,
                    collateralDeposits[account][asset],
                    false // Take the collateral factor into consideration.
                );
            totalCollateralValue = totalCollateralValue.add(collateralValue);
        }
        return totalCollateralValue;
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param assetAddress The address of the collateral asset.
     * @param amount The amount of the collateral asset to calculate the collateral value for.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValueAndOraclePrice(
        address assetAddress,
        uint256 amount,
        bool ignoreCollateralFactor
    ) public view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
        CollateralAsset memory collateralAsset = collateralAssets[assetAddress];

        FixedPoint.Unsigned memory fixedPointAmount = getCollateralFixedPointAmount(assetAddress, amount);
        FixedPoint.Unsigned memory oraclePrice = FixedPoint.Unsigned(collateralAsset.oracle.value());
        FixedPoint.Unsigned memory value = fixedPointAmount.mul(oraclePrice);

        if (!ignoreCollateralFactor) {
            value = value.mul(collateralAsset.factor);
        }
        return (value, oraclePrice);
    }

    /**
     * @notice For a given collateral asset and amount, returns a FixedPoint.Unsigned representation.
     * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
     *   If decimals > 18, there may be a loss of precision.
     * @param assetAddress The address of the collateral asset.
     * @param amount The amount of the collateral asset.
     * @return A FixedPoint.Unsigned of amount scaled according to the collateral asset's decimals.
     */
    function getCollateralFixedPointAmount(address assetAddress, uint256 amount)
        internal
        view
        returns (FixedPoint.Unsigned memory)
    {
        CollateralAsset memory collateralAsset = collateralAssets[assetAddress];
        // Initially, use the amount as the raw value for the FixedPoint.Unsigned,
        // which internally uses FixedPoint.FP_DECIMALS (18) decimals. Most collateral
        // assets will have 18 decimals.
        FixedPoint.Unsigned memory fixedPointAmount = FixedPoint.Unsigned(amount);
        // Handle cases where the collateral asset's decimal amount is not 18.
        if (collateralAsset.decimals < FixedPoint.FP_DECIMALS) {
            // If the decimals are less than 18, multiply the amount
            // to get the correct fixed point value.
            // E.g. 1 full token of a 17 decimal token will  cause the
            // initial setting of amount to be 0.1, so we multiply
            // by 10 ** (18 - 17) = 10 to get it to 0.1 * 10 = 1.
            return fixedPointAmount.mul(10**(FixedPoint.FP_DECIMALS - collateralAsset.decimals));
        } else if (collateralAsset.decimals > FixedPoint.FP_DECIMALS) {
            // If the decimals are greater than 18, divide the amount
            // to get the correct fixed point value.
            // Note because FixedPoint numbers are 18 decimals, this results
            // in loss of precision. E.g. if the cocllateral asset has 19
            // decimals and the amount is only 1 uint, this will divide
            // 1 by 10 ** (19 - 18), resulting in 1 / 10 = 0
            return fixedPointAmount.div(10**(collateralAsset.decimals - FixedPoint.FP_DECIMALS));
        }
        return fixedPointAmount;
    }

    /**
     * @notice For a given collateral asset and fixed point amount, i.e. where a rawValue of 1e18 is equal to 1
     *   whole token, returns the amount according to the collateral asset's decimals.
     * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
     *   If decimals < 18, there may be a loss of precision.
     * @param assetAddress The address of the collateral asset.
     * @param fixedPointAmount The fixed point amount of the collateral asset.
     * @return An amount that is compatible with the collateral asset's decimals.
     */
    function fromCollateralFixedPointAmount(address assetAddress, FixedPoint.Unsigned memory fixedPointAmount)
        internal
        view
        returns (uint256)
    {
        CollateralAsset memory collateralAsset = collateralAssets[assetAddress];
        // Initially, use the rawValue, which internally uses FixedPoint.FP_DECIMALS (18) decimals
        // Most collateral assets will have 18 decimals.
        uint256 amount = fixedPointAmount.rawValue;
        // Handle cases where the collateral asset's decimal amount is not 18.
        if (collateralAsset.decimals < FixedPoint.FP_DECIMALS) {
            // If the decimals are less than 18, divide the depositAmount
            // to get the correct fixed point value.
            // E.g. 1 full token will result in amount being 1e18 at this point,
            // so if the token has 17 decimals, divide by 10 ** (18 - 17) = 10
            // to get a value of 1e17.
            // This may result in a loss of precision.
            return amount / (10**(FixedPoint.FP_DECIMALS - collateralAsset.decimals));
        } else if (collateralAsset.decimals > FixedPoint.FP_DECIMALS) {
            // If the decimals are greater than 18, multiply the depositAmount
            // to get the correct fixed point value.
            // E.g. 1 full token will result in amount being 1e18 at this point,
            // so if the token has 19 decimals, multiply by 10 ** (19 - 18) = 10
            // to get a value of 1e19.
            return amount * (10**(collateralAsset.decimals - FixedPoint.FP_DECIMALS));
        }
        return amount;
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
     * @notice Burns existing Kresko assets.
     * @param assetAddress The address of the Kresko asset.
     * @param amount The amount of the Kresko asset to be burned.
     * @param mintedKreskoAssetIndex The index of the Kresko asset in the user's minted assets array.
     */
    function burnKreskoAsset(
        address assetAddress,
        uint256 amount,
        uint256 mintedKreskoAssetIndex
    ) external kreskoAssetExists(assetAddress) {
        require(amount > 0, "AMOUNT_ZERO");

        // Ensure the amount being burned is not greater than the sender's debt
        uint256 debtAmount = kreskoAssetDebt[msg.sender][assetAddress];
        require(amount <= debtAmount, "AMOUNT_TOO_HIGH");

        // Transfer kresko assets from the user to Kresko contract
        KreskoAsset asset = KreskoAsset(assetAddress);
        require(asset.transferFrom(msg.sender, address(this), amount), "TRANSFER_IN_FAILED");

        // Record the burn
        kreskoAssetDebt[msg.sender][assetAddress] = debtAmount - amount;
        // If the sender is burning all of the kresko asset, remove it from minted assets array
        if (amount == debtAmount) {
            removeFromMintedKreskoAssets(msg.sender, assetAddress, mintedKreskoAssetIndex);
        }

        chargeBurnFee(msg.sender, assetAddress, amount);

        // Burn the received kresko assets, removing them from circulation
        asset.burn(amount);

        emit KreskoAssetBurned(msg.sender, assetAddress, amount);
    }

    /**
     * @notice Removes a particular kresko asset from an account's minted kresko assets array.
     * @dev Removes an element by copying the last element to the element to remove's place and removing
     * the last element.
     * @param account The account whose minted kresko asset array is being affected.
     * @param assetAddress The kresko asset to remove from the array.
     * @param index The index of the assetAddress in the minted kresko assets array.
     */
    function removeFromMintedKreskoAssets(
        address account,
        address assetAddress,
        uint256 index
    ) internal {
        // Ensure that the provided index corresponds to the provided assetAddress.
        require(mintedKreskoAssets[account][index] == assetAddress, "WRONG_MINTED_KRESKO_ASSETS_INDEX");
        uint256 lastIndex = mintedKreskoAssets[account].length - 1;
        // If the index to remove is not the last one, overwrite the element at the index
        // with the last element.
        if (index != lastIndex) {
            mintedKreskoAssets[account][index] = mintedKreskoAssets[account][lastIndex];
        }
        // Remove the last element.
        mintedKreskoAssets[account].pop();
    }

    /**
     * @notice Charges the protocol burn fee based off the value of the burned asset.
     * @dev Takes the fee from the account's collateral assets. Attempts collateral assets
     *   in reverse order of the account's deposited collateral assets array.
     * @param account The account to charge the burn fee from.
     * @param assetAddress The address of the kresko asset being burned.
     * @param amountBurned The amount of the kresko asset being burned.
     */
    function chargeBurnFee(
        address account,
        address assetAddress,
        uint256 amountBurned
    ) internal {
        KAsset memory kAsset = kreskoAssets[assetAddress];
        // Calculate the value of the fee according to the value of the krAssets being burned.
        FixedPoint.Unsigned memory feeValue =
            FixedPoint.Unsigned(kAsset.oracle.value()).mul(FixedPoint.Unsigned(amountBurned)).mul(burnFee);

        // Do nothing if the fee value is 0.
        if (feeValue.rawValue == 0) {
            return;
        }

        address[] memory accountCollateralAssets = depositedCollateralAssets[account];
        // Iterate backward through the account's deposited collateral assets to safely
        // traverse the array while still being able to remove elements if necessary.
        // This is because removing the last element of the array does not shift around
        // other elements in the array.
        for (uint256 i = accountCollateralAssets.length - 1; i >= 0; i--) {
            address collateralAssetAddress = accountCollateralAssets[i];
            uint256 depositAmount = collateralDeposits[account][collateralAssetAddress];

            (FixedPoint.Unsigned memory depositValue, FixedPoint.Unsigned memory oraclePrice) =
                getCollateralValueAndOraclePrice(
                    collateralAssetAddress,
                    depositAmount,
                    true // Don't take the collateral asset's collateral factor into consideration.
                );

            FixedPoint.Unsigned memory feeValuePaid;
            uint256 transferAmount;
            // If feeValue < depositValue, the entire fee can be charged for this collateral asset.
            if (feeValue.isLessThan(depositValue)) {
                // We want to make sure that transferAmount is < depositAmount.
                // Proof:
                //   depositValue <= oraclePrice * depositAmount (<= due to a potential loss of precision)
                //   feeValue < depositValue
                // Meaning:
                //   feeValue < oraclePrice * depositAmount
                // Solving for depositAmount we get:
                //   feeValue / oraclePrice < depositAmount
                // Due to integer division:
                //   transferAmount = floor(feeValue / oracleValue)
                //   transferAmount <= feeValue / oraclePrice
                // We see that:
                //   transferAmount <= feeValue / oraclePrice < depositAmount
                //   transferAmount < depositAmount
                transferAmount = fromCollateralFixedPointAmount(collateralAssetAddress, feeValue.div(oraclePrice));
                feeValuePaid = feeValue;
            } else {
                // If the feeValue >= depositValue, the entire deposit
                // should be taken as the fee.
                transferAmount = depositAmount;
                feeValuePaid = depositValue;
                // Because the entire deposit is taken, remove it from the depositCollateralAssets array.
                removeFromDepositedCollateralAssets(account, collateralAssetAddress, i);
            }
            // Remove the transferAmount from the stored deposit for the account.
            collateralDeposits[account][collateralAssetAddress] -= transferAmount;
            // Transfer the fee to the feeRecipient.
            require(IERC20(collateralAssetAddress).transfer(feeRecipient, transferAmount), "FEE_TRANSFER_OUT_FAILED");
            emit BurnFeePaid(account, collateralAssetAddress, transferAmount, feeValuePaid.rawValue);

            feeValue = feeValue.sub(feeValuePaid);
            // If the entire fee has been paid, no more action needed.
            if (feeValue.rawValue == 0) {
                return;
            }
        }
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

    /**
     * @notice Sets the burn fee.
     * @param _burnFee The new burn fee as a raw value for a FixedPoint.Unsigned.
     */
    function setBurnFee(uint256 _burnFee) public onlyOwner {
        require(_burnFee <= MAX_BURN_FEE, "BURN_FEE_TOO_HIGH");
        burnFee = FixedPoint.Unsigned(_burnFee);
        emit UpdateBurnFee(_burnFee);
    }

    /**
     * @notice Sets the fee recipient.
     * @param _feeRecipient The new fee recipient.
     */
    function setFeeRecipient(address _feeRecipient) public onlyOwner {
        require(_feeRecipient != address(0), "ZERO_ADDRESS");
        feeRecipient = _feeRecipient;
        emit UpdateFeeRecipient(_feeRecipient);
    }
}
