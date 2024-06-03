// solhint-disable state-visibility
// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

library CONST {
    string constant CONFIG_DIR = "configs/foundry/deploy/";

    bytes32 constant SALT_ID = bytes32("_1");
    bytes32 constant KISS_SALT = bytes32("KISS_1");
    bytes32 constant VAULT_SALT = bytes32("vKISS_1");
    bytes32 constant GM_SALT = bytes32("GatingManager_1");
    bytes32 constant MOCK_STATUS_SALT = bytes32("mock_market_status");
    bytes32 constant PYTH_MOCK_SALT = bytes32("MockPythEP_1");
    bytes32 constant MC_SALT = bytes32("Multicall_1");
    bytes32 constant D1_SALT = bytes32("DataV1_1");

    string constant KRASSET_NAME_PREFIX = "Kresko: ";
    string constant KISS_PREFIX = "Kresko: ";

    string constant ANCHOR_NAME_PREFIX = "Kresko Asset Anchor: ";
    string constant ANCHOR_SYMBOL_PREFIX = "a";

    string constant VAULT_NAME_PREFIX = "Kresko Vault: ";
    string constant VAULT_SYMBOL_PREFIX = "v";
}
