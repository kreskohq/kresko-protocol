// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;
import "./interfaces/IERC3156FlashBorrower.sol";
import "./interfaces/IWETH10.sol";
import "./interfaces/IKresko.sol";
import "../libraries/FixedPoint.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract ExampleFlashLiquidator is IERC3156FlashBorrower {
    using FixedPoint for FixedPoint.Unsigned;
    bytes32 public immutable CALLBACK_SUCCESS = keccak256("ERC3156FlashBorrower.onFlashLoan");

    IWETH10 public weth10;
    IKresko public kresko;
    uint256 public flashBalance;
    address owner;

    constructor(address _weth10, address _kresko) {
        weth10 = IWETH10(_weth10);
        kresko = IKresko(_kresko);
        owner = msg.sender;
    }

    function flashLiquidate(
        address _kreskoUser,
        address _kreskoAssetToRepay,
        address _rewardCollateral
    ) external {
        require(kresko.isAccountLiquidatable(_kreskoUser), "!liquidatable");

        // Calculate amount to repay and amount to flashloan
        (uint256 flashAmount, uint256 repayAmount) = calculateAmountToFlashLoan(
            _kreskoUser,
            _kreskoAssetToRepay,
            _rewardCollateral
        );

        // Encode data for `onFlashLoan` callback
        bytes memory data = abi.encode(_kreskoUser, _kreskoAssetToRepay, _rewardCollateral, repayAmount);
        weth10.flashLoan(this, address(weth10), flashAmount, data);
    }

    /// @dev Calculates the amount to flash weth
    /// @dev This amount will allow us to mint the exact amount of kresko asset to repay
    function calculateAmountToFlashLoan(
        address _kreskoUser,
        address _kreskoAssetToRepay,
        address _rewardCollateral
    ) public view returns (uint256 amountToFlashLoan, uint256 amountToRepay) {
        FixedPoint.Unsigned memory maxLiquidationValue = kresko.calculateMaxLiquidatableValueForAssets(
            _kreskoUser,
            _kreskoAssetToRepay,
            _rewardCollateral
        );

        (FixedPoint.Unsigned memory oneWeth, ) = kresko.getCollateralValueAndOraclePrice(
            address(weth10),
            1 ether,
            false
        );

        FixedPoint.Unsigned memory krAssetValue = kresko.getKrAssetValue(_kreskoAssetToRepay, 1 ether, false);
        FixedPoint.Unsigned memory kFactor = kresko.kreskoAssets(_kreskoAssetToRepay).kFactor;
        FixedPoint.Unsigned memory cFactor = kresko.collateralAssets(address(weth10)).factor;
        FixedPoint.Unsigned memory MCR = kresko.minimumCollateralizationRatio();

        amountToFlashLoan = maxLiquidationValue.div(oneWeth.mul(cFactor)).mul(MCR).rawValue;
        uint256 kreskoUserDebtAmount = kresko.kreskoAssetDebt(_kreskoUser, _kreskoAssetToRepay);
        uint256 maxKrAssetRepayAmount = maxLiquidationValue.mul(kFactor).div(krAssetValue).rawValue;

        amountToRepay = kreskoUserDebtAmount > maxKrAssetRepayAmount ? maxKrAssetRepayAmount : kreskoUserDebtAmount;
    }

    /// @dev Helper to get the asset indexes for the user
    /// @notice YOU MOST LIKELY WANNA DO THIS OFFCHAIN IN AURORA DUE TO GAS LIMITS - THIS IS STRICTLY FOR SIMPLICITY.
    function getAssetIndexes(
        address _kreskoUser,
        address _rewardCollateral,
        address _repayKreskoAsset
    ) public view returns (uint256 collateralIndex, uint256 krAssetIndex) {
        address[] memory userCollaterals = kresko.getDepositedCollateralAssets(_kreskoUser);
        address[] memory userMintedAssets = kresko.getMintedKreskoAssets(_kreskoUser);

        require(userCollaterals.length > 0, "!collaterals");
        require(userMintedAssets.length > 0, "!mints");

        for (collateralIndex; collateralIndex < userCollaterals.length; collateralIndex++) {
            if (userCollaterals[collateralIndex] == _rewardCollateral) break;
        }

        for (krAssetIndex; krAssetIndex < userCollaterals.length; krAssetIndex++) {
            if (userMintedAssets[krAssetIndex] == _repayKreskoAsset) break;
        }
    }

    /**
     * @dev Receive a flash loan to liquidate a kresko user (from weth10, not useful for this simple use case)
     * @param initiator The initiator of the loan.
     * @param token The loan currency.
     * @param amount The amount of tokens lent.
     * @param fee The additional amount of tokens to repay.
     * @param data Arbitrary data structure, intended to contain user-defined parameters.
     * @return The keccak256 hash of "ERC3156FlashBorrower.onFlashLoan"
     */
    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external override returns (bytes32) {
        require(msg.sender == address(weth10), "nono");

        // Decode the data we passed through WETH10.
        (address _kreskoUser, address _repayKreskoAsset, address _rewardCollateral, uint256 _repayAmount) = abi.decode(
            data,
            (address, address, address, uint256)
        );

        uint256 rewardTokenBalBefore = IERC20(_rewardCollateral).balanceOf(address(this));

        flashBalance = amount;

        // Get the collateral indexes
        (uint256 collateralIndex, uint256 krAssetIndex) = getAssetIndexes(
            _kreskoUser,
            _rewardCollateral,
            _repayKreskoAsset
        );

        // Deposit our flash balance to Kresko as Collateral
        kresko.depositCollateral(address(this), address(weth10), flashBalance);
        // Ensure we are not repaying more than the debt

        // Mint the repayment asset
        kresko.mintKreskoAsset(address(this), _repayKreskoAsset, _repayAmount);

        // Liqudate the user
        kresko.liquidate(
            _kreskoUser,
            _repayKreskoAsset,
            _repayAmount,
            _rewardCollateral,
            krAssetIndex,
            collateralIndex,
            false // do not keep debt - we want the profits after repaying this flashloan
        );

        // Withdraw our collateral back = remaining deposited weth10 amount
        uint256 weth10CollateralDepositAmount = kresko.collateralDeposits(address(this), address(weth10));
        kresko.withdrawCollateral(address(this), address(weth10), weth10CollateralDepositAmount, 0);

        uint256 diff = flashBalance - weth10CollateralDepositAmount;
        require(diff > 0, "revert");
        weth10.deposit(diff);

        uint256 rewardTokenBalAfter = IERC20(_rewardCollateral).balanceOf(address(this));

        require(rewardTokenBalAfter > rewardTokenBalBefore, "FAIL: No profits");
        return CALLBACK_SUCCESS;
    }

    function sendProfits(IERC20 _token) external {
        require(msg.sender == owner, "nono");
        _token.transfer(msg.sender, _token.balanceOf(address(this)));
    }
}
