// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "./interfaces/IKresko.sol";

contract KreskoViewer {
    using FixedPoint for FixedPoint.Unsigned;

    IKresko public Kresko;

    struct krAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        uint256 amount;
        uint256 amountUSD;
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
        uint256 amountUSD;
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
        uint256 healthFactor;
        uint256 debtActualUSD;
        uint256 debtUSD;
        uint256 collateralActualUSD;
        uint256 collateralUSD;
        uint256 minCollateralUSD;
        uint256 borrowingPowerUSD;
    }

    constructor(IKresko _kresko) {
        Kresko = _kresko;
    }

    function healthFactorFor(address _account) public view returns (uint256) {
        uint256 minCollateral = Kresko.getAccountMinimumCollateralValue(_account).rawValue;
        uint256 userCollateral = Kresko.getAccountCollateralValue(_account).rawValue;

        return (userCollateral * 10**18) / minCollateral;
    }

    function kreskoUser(address _account) external view returns (KreskoUser memory user) {
        (krAssetInfoUser[] memory krInfos, uint256 totalDebtUSD) = krAssetInfoFor(_account);
        (CollateralAssetInfoUser[] memory collateralInfos, uint256 totalCollateralUSD) = collateralAssetInfoFor(
            _account
        );
        if (krInfos.length > 0 || collateralInfos.length > 0) {
            user = KreskoUser({
                collateralAssets: collateralInfos,
                krAssets: krInfos,
                borrowingPowerUSD: borrowingPowerUSD(_account),
                healthFactor: healthFactorFor(_account),
                debtActualUSD: totalDebtUSD,
                debtUSD: Kresko.getAccountKrAssetValue(_account).rawValue,
                collateralActualUSD: totalCollateralUSD,
                collateralUSD: Kresko.getAccountCollateralValue(_account).rawValue,
                minCollateralUSD: Kresko.getAccountMinimumCollateralValue(_account).rawValue
            });
        }
    }

    function krAssetInfoFor(address _account)
        public
        view
        returns (krAssetInfoUser[] memory result, uint256 totalDebtUSD)
    {
        address[] memory krAssetAddresses = Kresko.getMintedKreskoAssets(_account);
        if (krAssetAddresses.length > 0) {
            result = new krAssetInfoUser[](krAssetAddresses.length);
            for (uint256 i; i < krAssetAddresses.length; i++) {
                address assetAddress = krAssetAddresses[i];
                IKresko.KrAsset memory krAsset = Kresko.kreskoAssets(assetAddress);
                uint256 amount = Kresko.kreskoAssetDebt(_account, assetAddress);

                uint256 price = uint256(krAsset.oracle.latestAnswer());
                uint256 amountUSD = Kresko.getKrAssetValue(assetAddress, amount, true).rawValue;

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

                totalDebtUSD += amountUSD;
                result[i] = assetInfo;
            }
        }
    }

    function collateralAssetInfoFor(address _account)
        public
        view
        returns (CollateralAssetInfoUser[] memory result, uint256 totalCollateralUSD)
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
                    amountUSD: amountUSD.rawValue,
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

                totalCollateralUSD += amountUSD.rawValue;
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

    function borrowingPowerUSD(address _account) public view returns (uint256) {
        FixedPoint.Unsigned memory minCollateral = Kresko.getAccountMinimumCollateralValue(_account);
        FixedPoint.Unsigned memory collateral = Kresko.getAccountCollateralValue(_account);

        if (collateral.isLessThan(minCollateral)) {
            return 0;
        } else {
            return collateral.sub(minCollateral).rawValue;
        }
    }
}
