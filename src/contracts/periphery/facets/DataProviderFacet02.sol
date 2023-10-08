// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

// /* solhint-disable max-line-length */
// /* solhint-disable var-name-mixedcase */
// /* solhint-disable func-name-mixedcase */
// /* solhint-disable contract-name-camelcase */
// /* solhint-disable no-inline-assembly */
// /* solhint-disable avoid-low-level-calls */
// /* solhint-disable func-visibility */

// import {LibUI} from "../LibUI.sol";
// import {ms} from "minter/State.sol";

// /**
//  * @author Kresko
//  * @title UIDataProviderFacet2
//  * @notice UI data aggregation views
//  */
// contract DataProviderFacet02 {
//     function getGlobalData(
//         address[] memory _collateralAssets,
//         address[] memory _krAssets
//     )
//         external
//         view
//         returns (
//             LibUI.CollateralAssetInfo[] memory collateralAssets,
//             LibUI.krAssetInfo[] memory krAssets,
//             LibUI.ProtocolParams memory protocolParams
//         )
//     {
//         collateralAssets = LibUI.collateralAssetInfos(_collateralAssets);
//         krAssets = LibUI.krAssetInfos(_krAssets);
//         protocolParams = LibUI.ProtocolParams({
//             minCollateralRatio: ms().minCollateralRatio,
//             minDebtValue: cs().minDebtValue,
//             liquidationThreshold: ms().liquidationThreshold
//         });
//     }
// }
