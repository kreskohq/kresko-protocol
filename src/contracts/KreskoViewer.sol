// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "./libraries/FixedPointMath.sol";
import "./libraries/FixedPoint.sol";
import "./interfaces/IKresko.sol";
import "./interfaces/IKrStaking.sol";

contract KreskoViewer {
    using FixedPoint for FixedPoint.Unsigned;
    using FixedPointMath for uint256;

    IKresko public Kresko;
    IKrStaking public Staking;

    struct krAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        uint256 amount;
        FixedPoint.Unsigned amountUSD;
        uint256 index;
        FixedPoint.Unsigned kFactor;
        bool mintable;
        uint256 price;
        string symbol;
        string name;
    }

    struct CollateralAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        address underlyingRebasingToken;
        uint256 amount;
        FixedPoint.Unsigned amountUSD;
        FixedPoint.Unsigned cFactor;
        uint8 decimals;
        uint256 index;
        uint256 price;
        string symbol;
        string name;
    }

    struct CollateralAssetInfo {
        address assetAddress;
        address oracleAddress;
        address underlyingRebasingToken;
        uint256 price;
        uint256 value;
        FixedPoint.Unsigned cFactor;
        uint8 decimals;
        string symbol;
        string name;
    }

    struct krAssetInfo {
        address oracleAddress;
        address assetAddress;
        uint256 price;
        uint256 value;
        FixedPoint.Unsigned kFactor;
        string symbol;
        string name;
    }

    struct KreskoUser {
        krAssetInfoUser[] krAssets;
        CollateralAssetInfoUser[] collateralAssets;
        FixedPoint.Unsigned healthFactor;
        FixedPoint.Unsigned debtActualUSD;
        FixedPoint.Unsigned debtUSD;
        FixedPoint.Unsigned collateralActualUSD;
        FixedPoint.Unsigned collateralUSD;
        FixedPoint.Unsigned minCollateralUSD;
        FixedPoint.Unsigned borrowingPowerUSD;
    }

    struct GenericInfo {
        address assetAddress;
        FixedPoint.Unsigned kFactor;
        FixedPoint.Unsigned cFactor;
        uint256 price;
        bool isKrAsset;
        bool isCollateral;
        uint256 debtAmount;
        uint256 depositAmount;
        uint256 walletBalance;
    }

    struct Price {
        uint256 price;
        uint256 timestamp;
        address assetAddress;
        uint80 roundId;
    }

    struct Allowance {
        address owner;
        address spender;
        uint256 allowance;
    }

    struct Balance {
        address token;
        uint256 balance;
    }

    struct TokenMetadata {
        uint8 decimals;
        string symbol;
        string name;
    }

    struct StakingData {
        uint256 pid;
        address depositToken;
        uint256 totalDeposits;
        uint256 allocPoint;
        uint256[] rewardPerBlocks;
        uint256 lastRewardBlock;
        uint256 depositAmount;
        address[] rewardTokens;
        uint256[] rewardAmounts;
    }

    constructor(IKresko _kresko, IKrStaking _staking) {
        Kresko = _kresko;
        Staking = _staking;
    }

    function healthFactorFor(address _account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory userDebt = Kresko.getAccountKrAssetValue(_account);
        FixedPoint.Unsigned memory userCollateral = Kresko.getAccountCollateralValue(_account);

        if (userDebt.isGreaterThan(0)) {
            return userCollateral.div(userDebt);
        } else {
            return FixedPoint.Unsigned(0);
        }
    }

    function kreskoUser(address _account) external view returns (KreskoUser memory user) {
        (krAssetInfoUser[] memory krInfos, FixedPoint.Unsigned memory totalDebtUSD) = krAssetInfoFor(_account);
        (
            CollateralAssetInfoUser[] memory collateralInfos,
            FixedPoint.Unsigned memory totalCollateralUSD
        ) = collateralAssetInfoFor(_account);

        if (krInfos.length > 0 || collateralInfos.length > 0) {
            user = KreskoUser({
                collateralAssets: collateralInfos,
                krAssets: krInfos,
                borrowingPowerUSD: borrowingPowerUSD(_account),
                healthFactor: healthFactorFor(_account),
                debtActualUSD: totalDebtUSD,
                debtUSD: Kresko.getAccountKrAssetValue(_account),
                collateralActualUSD: totalCollateralUSD,
                collateralUSD: Kresko.getAccountCollateralValue(_account),
                minCollateralUSD: Kresko.getAccountMinimumCollateralValue(_account)
            });
        }
    }

    function krAssetInfoFor(address _account)
        public
        view
        returns (krAssetInfoUser[] memory result, FixedPoint.Unsigned memory totalDebtUSD)
    {
        address[] memory krAssetAddresses = Kresko.getMintedKreskoAssets(_account);
        if (krAssetAddresses.length > 0) {
            result = new krAssetInfoUser[](krAssetAddresses.length);
            for (uint256 i; i < krAssetAddresses.length; i++) {
                address assetAddress = krAssetAddresses[i];
                IKresko.KrAsset memory krAsset = Kresko.kreskoAssets(assetAddress);
                uint256 amount = Kresko.kreskoAssetDebt(_account, assetAddress);

                uint256 price = uint256(krAsset.oracle.latestAnswer());
                FixedPoint.Unsigned memory amountUSD = Kresko.getKrAssetValue(assetAddress, amount, true);

                string memory symbol = IERC20MetadataUpgradeable(assetAddress).symbol();
                string memory name = IERC20MetadataUpgradeable(assetAddress).name();

                krAssetInfoUser memory assetInfo = krAssetInfoUser({
                    assetAddress: assetAddress,
                    oracleAddress: address(krAsset.oracle),
                    amount: amount,
                    amountUSD: amountUSD,
                    index: i,
                    kFactor: krAsset.kFactor,
                    mintable: krAsset.mintable,
                    price: price,
                    symbol: symbol,
                    name: name
                });

                totalDebtUSD.add(amountUSD);
                result[i] = assetInfo;
            }
        }
    }

    function collateralAssetInfoFor(address _account)
        public
        view
        returns (CollateralAssetInfoUser[] memory result, FixedPoint.Unsigned memory totalCollateralUSD)
    {
        address[] memory collateralAssetAddresses = Kresko.getDepositedCollateralAssets(_account);
        if (collateralAssetAddresses.length > 0) {
            result = new CollateralAssetInfoUser[](collateralAssetAddresses.length);
            for (uint256 i; i < collateralAssetAddresses.length; i++) {
                address assetAddress = collateralAssetAddresses[i];
                IKresko.CollateralAsset memory collateralAsset = Kresko.collateralAssets(assetAddress);
                uint8 decimals = IERC20MetadataUpgradeable(assetAddress).decimals();

                uint256 amount = Kresko.collateralDeposits(_account, assetAddress);

                string memory symbol = IERC20MetadataUpgradeable(assetAddress).symbol();
                (FixedPoint.Unsigned memory amountUSD, FixedPoint.Unsigned memory price) = Kresko
                    .getCollateralValueAndOraclePrice(assetAddress, amount, true);

                string memory name = IERC20MetadataUpgradeable(assetAddress).name();

                CollateralAssetInfoUser memory assetInfo = CollateralAssetInfoUser({
                    amount: amount,
                    amountUSD: amountUSD,
                    oracleAddress: address(collateralAsset.oracle),
                    underlyingRebasingToken: collateralAsset.underlyingRebasingToken,
                    assetAddress: assetAddress,
                    cFactor: collateralAsset.factor,
                    decimals: decimals,
                    index: i,
                    price: price.rawValue,
                    symbol: symbol,
                    name: name
                });

                totalCollateralUSD.add(amountUSD);
                result[i] = assetInfo;
            }
        }
    }

    function collateralAssetInfos(address[] memory assetAddresses)
        public
        view
        returns (CollateralAssetInfo[] memory result)
    {
        result = new CollateralAssetInfo[](assetAddresses.length);
        for (uint256 i; i < assetAddresses.length; i++) {
            address assetAddress = assetAddresses[i];
            IKresko.CollateralAsset memory collateralAsset = Kresko.collateralAssets(assetAddress);
            uint8 decimals = IERC20MetadataUpgradeable(assetAddress).decimals();

            string memory symbol = IERC20MetadataUpgradeable(assetAddress).symbol();
            (FixedPoint.Unsigned memory value, FixedPoint.Unsigned memory price) = Kresko
                .getCollateralValueAndOraclePrice(assetAddress, 1 * 10**decimals, false);

            string memory name = IERC20MetadataUpgradeable(assetAddress).name();

            CollateralAssetInfo memory assetInfo = CollateralAssetInfo({
                value: value.rawValue,
                oracleAddress: address(collateralAsset.oracle),
                underlyingRebasingToken: collateralAsset.underlyingRebasingToken,
                assetAddress: assetAddress,
                cFactor: collateralAsset.factor,
                decimals: decimals,
                price: price.rawValue,
                symbol: symbol,
                name: name
            });

            result[i] = assetInfo;
        }
    }

    function getAssetInfos(address[] memory _collateralAssets, address[] memory _krAssets)
        external
        view
        returns (CollateralAssetInfo[] memory collateralAssets, krAssetInfo[] memory krAssets)
    {
        collateralAssets = collateralAssetInfos(_collateralAssets);
        krAssets = krAssetInfos(_krAssets);
    }

    function krAssetInfos(address[] memory assetAddresses) public view returns (krAssetInfo[] memory result) {
        result = new krAssetInfo[](assetAddresses.length);
        for (uint256 i; i < assetAddresses.length; i++) {
            address assetAddress = assetAddresses[i];

            IKresko.KrAsset memory krAsset = Kresko.kreskoAssets(assetAddress);

            FixedPoint.Unsigned memory value = Kresko.getKrAssetValue(assetAddress, 1 ether, false);
            uint256 price = uint256(krAsset.oracle.latestAnswer());

            string memory name = IERC20MetadataUpgradeable(assetAddress).name();
            string memory symbol = IERC20MetadataUpgradeable(assetAddress).symbol();

            krAssetInfo memory assetInfo = krAssetInfo({
                value: value.rawValue,
                oracleAddress: address(krAsset.oracle),
                assetAddress: assetAddress,
                kFactor: krAsset.kFactor,
                price: price,
                symbol: symbol,
                name: name
            });

            result[i] = assetInfo;
        }
    }

    function batchPrices(address[] calldata _assets, AggregatorV2V3Interface[] calldata _oracles)
        external
        view
        returns (Price[] memory result)
    {
        require(_assets.length == _oracles.length, "Query must be equal");
        result = new Price[](_assets.length);
        for (uint256 i; i < _assets.length; i++) {
            (uint80 roundId, int256 answer, , uint256 updatedAt, ) = _oracles[i].latestRoundData();
            result[i] = Price(uint256(answer), updatedAt, _assets[i], roundId);
        }
    }

    function getGenericInfo(
        address _account,
        address _asset,
        AggregatorV2V3Interface oracle
    ) external view returns (GenericInfo memory) {
        return
            GenericInfo({
                assetAddress: _asset,
                depositAmount: Kresko.collateralDeposits(_account, _asset),
                debtAmount: Kresko.kreskoAssetDebt(_account, _asset),
                isKrAsset: Kresko.krAssetExists(_asset),
                isCollateral: Kresko.collateralExists(_asset),
                price: uint256(oracle.latestAnswer()),
                kFactor: Kresko.kreskoAssets(_asset).kFactor,
                cFactor: Kresko.collateralAssets(_asset).factor,
                walletBalance: IERC20MetadataUpgradeable(_asset).balanceOf(_account)
            });
    }

    function borrowingPowerUSD(address _account) public view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory minCollateral = Kresko.getAccountMinimumCollateralValue(_account);
        FixedPoint.Unsigned memory collateral = Kresko.getAccountCollateralValue(_account);

        if (collateral.isLessThan(minCollateral)) {
            return FixedPoint.Unsigned(0);
        } else {
            return collateral.sub(minCollateral);
        }
    }

    function getTokenMetadatas(IERC20MetadataUpgradeable[] memory _tokens)
        external
        view
        returns (TokenMetadata[] memory metadatas)
    {
        metadatas = new TokenMetadata[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            metadatas[i] = TokenMetadata({
                decimals: _tokens[i].decimals(),
                name: _tokens[i].name(),
                symbol: _tokens[i].symbol()
            });
        }
    }

    function getBalances(IERC20Upgradeable[] memory _tokens, address account)
        external
        view
        returns (Balance[] memory balances)
    {
        balances = new Balance[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            balances[i] = Balance({token: address(_tokens[i]), balance: _tokens[i].balanceOf(account)});
        }
    }

    function getAllowances(
        IERC20Upgradeable[] memory _tokens,
        address owner,
        address spender
    ) external view returns (Allowance[] memory allowances) {
        allowances = new Allowance[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            allowances[i] = Allowance({
                allowance: _tokens[i].allowance(owner, spender),
                spender: spender,
                owner: owner
            });
        }
    }

    function getStakingData(address _account) external view returns (StakingData[] memory result) {
        IKrStaking.Reward[] memory rewards = Staking.allPendingRewards(_account);
        result = new StakingData[](rewards.length);

        for (uint256 i; i < rewards.length; i++) {
            IKrStaking.UserInfo memory userInfo = Staking.userInfo(rewards[i].pid, _account);
            IKrStaking.PoolInfo memory poolInfo = Staking.poolInfo(rewards[i].pid);
            address depositTokenAddress = address(poolInfo.depositToken);
            result[i] = StakingData({
                pid: rewards[i].pid,
                totalDeposits: poolInfo.depositToken.balanceOf(address(Staking)),
                allocPoint: poolInfo.allocPoint,
                depositToken: depositTokenAddress,
                depositAmount: userInfo.amount,
                rewardTokens: rewards[i].tokens,
                rewardAmounts: rewards[i].amounts,
                rewardPerBlocks: Staking.rewardPerBlockFor(depositTokenAddress),
                lastRewardBlock: poolInfo.lastRewardBlock
            });
        }
    }
}
