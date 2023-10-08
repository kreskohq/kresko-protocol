// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {AggregatorV3Interface} from "vendor/AggregatorV3Interface.sol";
import {ERC20} from "vendor/ERC20.sol";
import {SafeERC20} from "vendor/SafeERC20.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {VAssets} from "vault/funcs/Assets.sol";
import {IVault} from "vault/interfaces/IVault.sol";
import {VaultAsset} from "vault/Types.sol";
import {VEvent} from "vault/Events.sol";
import {CError} from "common/CError.sol";

/**
 * @title Vault - A multiple deposit token vault.
 * @author Kresko
 * @notice This is derived from ERC4626 standard.
 * @notice Users deposit tokens into the vault and receive shares of equal value in return.
 * @notice Shares are redeemable for the underlying tokens at any time.
 * @notice Price or exchange rate of SHARE/USD is determined by the total value of the underlying tokens in the vault and the share supply.
 */
contract Vault is IVault, ERC20 {
    using SafeERC20 for ERC20;
    using FixedPointMathLib for uint256;
    using VAssets for uint256;
    using VAssets for VaultAsset;

    uint256 public constant HUNDRED = 1 ether;

    /* -------------------------------------------------------------------------- */
    /*                                    State                                   */
    /* -------------------------------------------------------------------------- */
    address public governance;
    address public feeRecipient;
    uint8 public oracleDecimals;

    mapping(address => VaultAsset) internal _assets;
    address[] public assetList;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint8 _oracleDecimals,
        address _feeRecipient
    ) ERC20(_name, _symbol, _decimals) {
        governance = msg.sender;
        oracleDecimals = _oracleDecimals;
        feeRecipient = _feeRecipient;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Modifiers                                 */
    /* -------------------------------------------------------------------------- */

    modifier onlyGovernance() {
        if (msg.sender != governance) revert CError.INVALID_SENDER(msg.sender, governance);
        _;
    }

    modifier check(address asset) {
        if (!_assets[asset].enabled) revert CError.ASSET_NOT_ENABLED(asset);
        _;
    }

    /// @notice checks if the deposit amounts are valid.
    /// (..close enough to modifier)
    function _checkDeposit(address asset, uint256 assetsIn, uint256 sharesOut) private view {
        uint256 depositLimit = maxDeposit(asset);

        if (assetsIn > depositLimit) revert CError.MAX_DEPOSIT_EXCEEDED(assetsIn, depositLimit);
        else if (sharesOut == 0) revert CError.INVALID_DEPOSIT(assetsIn, sharesOut);
        else if (assetsIn == 0) revert CError.INVALID_DEPOSIT(assetsIn, sharesOut);
    }

    /* -------------------------------------------------------------------------- */
    /*                                Functionality                               */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IVault
    function deposit(
        address asset,
        uint256 assetsIn,
        address receiver
    ) public virtual check(asset) returns (uint256 sharesOut, uint256 assetFee) {
        (sharesOut, assetFee) = previewDeposit(asset, assetsIn);

        _checkDeposit(asset, assetsIn, sharesOut);

        ERC20 token = ERC20(asset);

        token.safeTransferFrom(msg.sender, address(this), assetsIn);

        if (assetFee > 0) token.safeTransfer(feeRecipient, assetFee);

        _mint(receiver == address(0) ? msg.sender : receiver, sharesOut);

        emit VEvent.Deposit(msg.sender, receiver, asset, assetsIn, sharesOut);
    }

    /// @inheritdoc IVault
    function mint(
        address asset,
        uint256 sharesOut,
        address receiver
    ) public virtual check(asset) returns (uint256 assetsIn, uint256 assetFee) {
        (assetsIn, assetFee) = previewMint(asset, sharesOut);

        _checkDeposit(asset, assetsIn, sharesOut);

        ERC20 token = ERC20(asset);

        token.safeTransferFrom(msg.sender, address(this), assetsIn);

        if (assetFee > 0) token.safeTransfer(feeRecipient, assetFee);

        _mint(receiver == address(0) ? msg.sender : receiver, sharesOut);

        emit VEvent.Deposit(msg.sender, receiver, asset, assetsIn, sharesOut);
    }

    /// @inheritdoc IVault
    function redeem(
        address asset,
        uint256 sharesIn,
        address receiver,
        address owner
    ) public virtual check(asset) returns (uint256 assetsOut, uint256 assetFee) {
        (assetsOut, assetFee) = previewRedeem(asset, sharesIn);

        if (assetsOut == 0) {
            revert CError.INVALID_WITHDRAW(sharesIn, assetsOut);
        }

        if (msg.sender != owner) {
            uint256 allowed = allowance[owner][msg.sender]; // Saves gas for limited approvals.

            if (allowed != type(uint256).max) allowance[owner][msg.sender] = allowed - sharesIn;
        }

        ERC20 token = ERC20(asset);

        uint256 balance = token.balanceOf(address(this));

        if (assetsOut + assetFee > balance) {
            assetsOut = balance;
            (sharesIn, assetFee) = previewWithdraw(asset, assetsOut);
            token.safeTransfer(receiver, assetsOut - assetFee);
        } else {
            token.safeTransfer(receiver, assetsOut);
        }

        if (assetFee > 0) token.safeTransfer(feeRecipient, assetFee);

        _burn(owner, sharesIn);

        emit VEvent.Withdraw(msg.sender, receiver, asset, owner, assetsOut, sharesIn);
    }

    /// @inheritdoc IVault
    function withdraw(
        address asset,
        uint256 assetsOut,
        address receiver,
        address owner
    ) public virtual check(asset) returns (uint256 sharesIn, uint256 assetFee) {
        (sharesIn, assetFee) = previewWithdraw(asset, assetsOut);

        if (sharesIn == 0) revert CError.INVALID_WITHDRAW(sharesIn, assetsOut);

        if (msg.sender != owner) {
            uint256 allowed = allowance[owner][msg.sender]; // Saves gas for limited approvals.

            if (allowed != type(uint256).max) allowance[owner][msg.sender] = allowed - sharesIn;
        }

        ERC20 token = ERC20(asset);

        if (assetFee > 0) token.safeTransfer(feeRecipient, assetFee);

        _burn(owner, sharesIn);

        token.safeTransfer(receiver, assetsOut);

        emit VEvent.Withdraw(msg.sender, receiver, asset, owner, assetsOut, sharesIn);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IVault
    function assets(address asset) public view returns (VaultAsset memory) {
        return _assets[asset];
    }

    /// @inheritdoc IVault
    function totalAssets() public view virtual returns (uint256 result) {
        for (uint256 i; i < assetList.length; ) {
            result += _assets[assetList[i]].getDepositValueWad(oracleDecimals);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IVault
    function exchangeRate() public view virtual returns (uint256) {
        uint256 tAssets = totalAssets();
        uint256 tSupply = totalSupply();
        if (tSupply == 0 || tAssets == 0) return 1e18;
        return (tAssets * 1e18) / tSupply;
    }

    /// @inheritdoc IVault
    function previewDeposit(address asset, uint256 assetsIn) public view virtual returns (uint256 sharesOut, uint256 assetFee) {
        uint256 tSupply = totalSupply();
        uint256 tAssets = totalAssets();
        if (tSupply == 0) {
            tSupply = 1e18;
            tAssets = 1e18;
        }
        VaultAsset memory assetInfo = _assets[asset];
        (assetsIn, assetFee) = _handleDepositFee(assetInfo, assetsIn);
        uint256 assetValue = assetInfo.usdWad(assetsIn, oracleDecimals);

        sharesOut = assetValue.mulDivDown(tSupply, tAssets);
    }

    /// @inheritdoc IVault
    function previewMint(address asset, uint256 sharesOut) public view virtual returns (uint256 assetsIn, uint256 assetFee) {
        uint256 tSupply = totalSupply();
        uint256 tAssets = totalAssets();

        if (tSupply == 0 || tAssets == 0) {
            tSupply = 1e18;
            tAssets = 1e18;
        }
        VaultAsset memory assetInfo = _assets[asset];

        (assetsIn, assetFee) = _handleMintFee(
            assetInfo,
            assetInfo.getAmount(sharesOut.mulDivUp(tAssets, tSupply), oracleDecimals)
        );
    }

    /// @inheritdoc IVault
    function previewRedeem(address asset, uint256 sharesIn) public view virtual returns (uint256 assetsOut, uint256 assetFee) {
        uint256 tSupply = totalSupply();
        uint256 tAssets = totalAssets();

        if (tSupply == 0 || tAssets == 0) {
            tSupply = 1e18;
            tAssets = 1e18;
        }
        VaultAsset memory assetInfo = _assets[asset];
        (assetsOut, assetFee) = _handleRedeemFee(
            assetInfo,
            assetInfo.getAmount(sharesIn.mulDivDown(tAssets, tSupply), oracleDecimals)
        );
    }

    /// @inheritdoc IVault
    function previewWithdraw(
        address asset,
        uint256 assetsOut
    ) public view virtual returns (uint256 sharesIn, uint256 assetFee) {
        uint256 tSupply = totalSupply();
        uint256 tAssets = totalAssets();

        if (tSupply == 0 || tAssets == 0) {
            tSupply = 1e18;
            tAssets = 1e18;
        }

        VaultAsset memory assetInfo = _assets[asset];

        (assetsOut, assetFee) = _handleWithdrawFee(assetInfo, assetsOut);

        uint256 assetsValue = assetInfo.usdWad(assetsOut, oracleDecimals);

        sharesIn = assetsValue.mulDivUp(tSupply, tAssets);

        if (sharesIn > tSupply) revert CError.ROUNDING_ERROR("Use redeem instead.", sharesIn, tSupply);
    }

    /// @inheritdoc IVault
    function maxRedeem(address asset, address owner) public view virtual returns (uint256 max) {
        (uint256 assetsOut, uint256 fee) = previewRedeem(asset, balanceOf[owner]);
        uint256 balance = ERC20(asset).balanceOf(address(this));

        if (assetsOut + fee > balance) {
            assetsOut = balance;
            (max, ) = previewWithdraw(asset, assetsOut);
        } else {
            return balanceOf[owner];
        }
    }

    /// @inheritdoc IVault
    function maxWithdraw(address asset, address owner) public view returns (uint256 max) {
        (max, ) = previewRedeem(asset, maxRedeem(asset, owner));
    }

    /// @inheritdoc IVault
    function maxDeposit(address asset) public view virtual returns (uint256) {
        return _assets[asset].maxDeposits - _assets[asset].token.balanceOf(address(this));
    }

    /// @inheritdoc IVault
    function maxMint(address asset, address user) public view virtual returns (uint256 max) {
        uint256 balance = ERC20(asset).balanceOf(user);
        uint256 depositLimit = maxDeposit(asset);
        if (balance > depositLimit) {
            (max, ) = previewDeposit(asset, depositLimit);
        } else {
            (max, ) = previewDeposit(asset, balance);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Admin                                   */
    /* -------------------------------------------------------------------------- */

    /// @inheritdoc IVault
    function addAsset(VaultAsset memory config) external onlyGovernance {
        address token = address(config.token);

        if (token == address(0)) revert CError.ZERO_ADDRESS();
        else if (_assets[token].enabled) revert CError.ASSET_ALREADY_EXISTS(token);

        assetList.push(token);
        _assets[token] = config; // [TODO] Add fees.

        uint256 price = config.price();
        emit VEvent.AssetAdded(token, address(config.oracle), price, config.maxDeposits, block.timestamp);

        if (price == 0) revert CError.ZERO_PRICE(config.token.symbol());
        else if (config.depositFee > 1e18) revert CError.INVALID_PROTOCOL_FEE(token, config.depositFee, 1e18);
        else if (config.withdrawFee > 1e18) revert CError.INVALID_PROTOCOL_FEE(token, config.withdrawFee, 1e18);
    }

    /// @inheritdoc IVault
    function removeAsset(address asset) external onlyGovernance {
        for (uint256 i; i < assetList.length; ) {
            if (assetList[i] == asset) {
                assetList[i] = assetList[assetList.length - 1];
                assetList.pop();
                break;
            }
            unchecked {
                i++;
            }
        }
        delete _assets[asset];

        emit VEvent.AssetRemoved(asset, block.timestamp);
    }

    /// @inheritdoc IVault
    function setOracle(address asset, address oracle) external onlyGovernance {
        bool deleted = oracle == address(0);

        _assets[asset].oracle = AggregatorV3Interface(oracle);
        uint256 price = deleted ? 0 : _assets[asset].price();
        if (price == 0 && !deleted) revert CError.ZERO_PRICE(_assets[asset].token.symbol());

        emit VEvent.OracleSet(asset, oracle, price, block.timestamp);
    }

    /// @inheritdoc IVault
    function setOracleDecimals(uint8 _oracleDecimals) external onlyGovernance {
        oracleDecimals = _oracleDecimals;
    }

    /// @inheritdoc IVault
    function setAssetEnabled(address asset, bool isEnabled) external onlyGovernance {
        _assets[asset].enabled = isEnabled;

        emit VEvent.AssetEnabledStatusChanged(asset, isEnabled, block.timestamp);
    }

    /// @inheritdoc IVault
    function setDepositFee(address asset, uint256 fee) external onlyGovernance {
        if (fee > HUNDRED) revert CError.INVALID_FEE(fee, HUNDRED);

        _assets[asset].depositFee = fee;
    }

    /// @inheritdoc IVault
    function setWithdrawFee(address asset, uint256 fee) external onlyGovernance {
        if (fee > HUNDRED) revert CError.INVALID_FEE(fee, HUNDRED);
        _assets[asset].withdrawFee = fee;
    }

    /// @inheritdoc IVault
    function setMaxDeposits(address asset, uint256 maxDeposits) external onlyGovernance {
        _assets[asset].maxDeposits = maxDeposits;
    }

    /// @inheritdoc IVault
    function setGovernance(address _newGovernance) external onlyGovernance {
        governance = _newGovernance;
    }

    /// @inheritdoc IVault
    function setFeeRecipient(address _newFeeRecipient) external onlyGovernance {
        feeRecipient = _newFeeRecipient;
    }

    function _handleMintFee(
        VaultAsset memory assetInfo,
        uint256 assetsIn
    ) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee) {
        (assetsInAfterFee, assetFee) = assetInfo.handleMintFee(assetsIn);
    }

    function _handleRedeemFee(
        VaultAsset memory assetInfo,
        uint256 assetsIn
    ) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee) {
        (assetsInAfterFee, assetFee) = assetInfo.handleRedeemFee(assetsIn);
    }

    function _handleDepositFee(
        VaultAsset memory assetInfo,
        uint256 assetsIn
    ) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee) {
        (assetsInAfterFee, assetFee) = assetInfo.handleDepositFee(assetsIn);
    }

    function _handleWithdrawFee(
        VaultAsset memory assetInfo,
        uint256 assetsIn
    ) internal view virtual returns (uint256 assetsInAfterFee, uint256 assetFee) {
        (assetsInAfterFee, assetFee) = assetInfo.handleWithdrawFee(assetsIn);
    }
}
