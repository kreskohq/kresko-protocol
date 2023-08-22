// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.19;

import {ISDI, Asset, IERC20Permit, SafeERC20} from "./ISDI.sol";
import {FixedPointMathLib} from "@rari-capital/solmate/src/utils/FixedPointMathLib.sol";
import {IKresko} from "common/IKresko.sol";
import {LibSDI} from "./LibSDI.sol";

contract SDI {
    using LibSDI for uint256;
    using LibSDI for Asset;
    using SafeERC20 for IERC20Permit;
    using FixedPointMathLib for uint256;

    /* -------------------------------------------------------------------------- */
    /*                                   Layout                                   */
    /* -------------------------------------------------------------------------- */

    IKresko public kresko;
    address public governance;

    // internal bookeep of cover balances so users cannot send tokens into this contract and increase the price
    mapping(address coverAsset => uint256 coverAmount) internal _coverBalances;
    mapping(address coverAsset => Asset assetConfig) internal _coverAssets;
    address[] public coverAssetList;

    uint8 oracleDecimals;
    address public feeRecipient;

    int256 public totalDebt; // can go negative
    int256 public totalCover; // int256 just for compability with totalDebt

    constructor(address _kresko, address _feeRecipient, uint8 _oracleDecimals, address _governance) {
        kresko = IKresko(_kresko);
        governance = _governance;
        _oracleDecimals = oracleDecimals;
        feeRecipient = _feeRecipient;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Modifiers                                 */
    /* -------------------------------------------------------------------------- */

    modifier check(address asset) {
        require(_coverAssets[asset].enabled, "NOT_SUPPORTED");
        _;
    }

    modifier onlyKresko() {
        require(msg.sender == address(kresko), "NOT_KRESKO");
        _;
    }

    modifier onlyGov() {
        require(msg.sender == governance, "NOT_GOV");
        _;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Functionality                               */
    /* -------------------------------------------------------------------------- */

    function onSCDPMint(address asset, uint256 mintAmount) public onlyKresko returns (uint256 shares) {
        totalDebt += int256(shares = previewMint(asset, mintAmount));
    }

    function onSCDPBurn(address asset, uint256 burnAmount) public onlyKresko returns (uint256 shares) {
        totalDebt -= int256((shares = previewBurn(asset, burnAmount)));
    }

    function onSCDPLiquidate(
        address asset,
        uint256 burnAmount
    ) public onlyKresko returns (uint256 shares, uint256 value) {
        value = (shares = previewBurn(asset, burnAmount)).mulDivDown(price(), 1e18);
        totalDebt -= int256(shares);
    }

    /// @notice Cover by pushing assets first then call this. (no need for approval)
    function cover(address asset) public check(asset) returns (uint256 shares, uint256 value) {
        uint256 balance = IERC20Permit(asset).balanceOf(address(this));
        uint256 receivedAmount = balance - _coverBalances[asset];

        require(receivedAmount > 0, "NO_COVER_RECEIVED");

        value = _coverAssets[asset].usdWad(receivedAmount, oracleDecimals);
        totalCover += int256((shares = value.mulDivDown(10 ** oracleDecimals, price())));

        // Adjust amount after other adjustments!
        _coverBalances[asset] = balance;
    }

    /// @notice Cover by pulling assets.
    function cover(address asset, uint256 amount) public check(asset) returns (uint256 shares, uint256 value) {
        require(amount > 0, "NO_COVER_RECEIVED");

        value = _coverAssets[asset].usdWad(amount, oracleDecimals);
        totalCover += int256((shares = value.mulDivDown(10 ** oracleDecimals, price())));

        // Adjust amount after other adjustments!
        _coverBalances[asset] += amount;

        IERC20Permit(asset).safeTransferFrom(msg.sender, address(this), amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    function coverAsset(address asset) external view returns (Asset memory) {
        return _coverAssets[asset];
    }

    /// @notice Simply returns the total supply of SDI.
    function totalSupply() public view returns (uint256) {
        return uint256(totalDebt + totalCover);
    }

    /// @notice Returns the total effective debt for the SCDP.
    function effectiveDebt() public view returns (uint256) {
        if (totalCover >= totalDebt) {
            return 0;
        }
        return uint256(totalDebt - totalCover);
    }

    /// @notice Preview how many SDI are removed when burning krAssets.
    function previewBurn(address asset, uint256 burnAmount) public view returns (uint256 shares) {
        uint256 assetsValue = _coverAssets[asset].usdWad(burnAmount, oracleDecimals);

        return assetsValue.mulDivDown(10 ** oracleDecimals, price());
    }

    /// @notice Preview how many SDI are minted when minting krAssets.
    function previewMint(address asset, uint256 mintAmount) public view returns (uint256 shares) {
        uint256 assetsValue = _coverAssets[asset].usdWad(mintAmount, oracleDecimals);

        return assetsValue.mulDivDown(10 ** oracleDecimals, price());
    }

    /// @notice Get the price of SDI in USD, oracle precision.
    function price() public view returns (uint256) {
        uint256 totalValue = totalKrAssetDebtUSD() + totalCoverUSD();
        if (totalValue == 0) {
            return 1e8;
        }
        return totalValue.mulDivDown(1e18, totalSupply());
    }

    /// @notice Gets the total debt value of krAssets, oracle precision
    function totalKrAssetDebtUSD() public view virtual returns (uint256 result) {
        return kresko.getPoolDebtValue(false);
    }

    /// @notice Gets the total cover debt value, oracle precision
    function totalCoverUSD() public view virtual returns (uint256 result) {
        for (uint256 i; i < coverAssetList.length; ) {
            result += _getDepositValue(_coverAssets[coverAssetList[i]]);
            unchecked {
                i++;
            }
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Admin                                   */
    /* -------------------------------------------------------------------------- */

    function assets(address asset) public view returns (Asset memory) {
        return _coverAssets[asset];
    }

    function addAsset(Asset memory config) external onlyGov {
        address token = address(config.token);
        require(token != address(0), "ZERO_ADDRESS");
        require(!_coverAssets[token].enabled, "ALREADY_SUPPORTED");

        coverAssetList.push(token);
        _coverAssets[token] = config; // [TODO] fees?.

        require(config.price() != 0, "ZERO_PRICE");
        require(config.depositFee < 1e18, "INVALID_DEPOSIT_FEE");
        require(config.withdrawFee < 1e18, "INVALID_WITHDRAWAL_FEE");

        // emit AssetAdded(token, address(config.oracle), price, config.maxDeposits, block.timestamp);
    }

    function setGov(address _governance) external onlyGov {
        governance = _governance;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  Internals                                 */
    /* -------------------------------------------------------------------------- */

    /// @notice get total deposit value of `self` in USD, oracle precision.
    function _getDepositValue(Asset memory self) internal view returns (uint256) {
        uint256 bal = _coverBalances[address(self.token)];
        if (bal == 0) return 0;
        return (bal * self.price()) / 10 ** self.token.decimals();
    }
}
