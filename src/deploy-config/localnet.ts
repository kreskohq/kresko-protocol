/* ========================================================================== */
/*                         KRESKO MINTER CONFIGURATION                        */
/* ========================================================================== */

import { anchorTokenPrefix } from "./shared";

export const collaterals = {
    test: [
        ["USDC", "USDC"],
        ["Wrapped ETH", "WETH"],
        ["Aurora", "Aurora"],
        ["Wrapped NEAR", "WNEAR"],
    ],
};

export const krAssets = {
    test: [
        ["Tesla Inc.", "krTSLA", anchorTokenPrefix + "krTSLA"],
        ["GameStop Corp.", "krGME", anchorTokenPrefix + "krGME"],
        ["iShares Gold Trust", "krIAU", anchorTokenPrefix + "krIAU"],
        ["Invesco QQQ Trust", "krQQQ", anchorTokenPrefix + "krQQQ"],
    ],
};
