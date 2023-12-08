// solhint-disable state-visibility
// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

library CONST {
    string constant CONFIG_DIR = "configs/foundry/deploy/";
    bytes32 constant DIAMOND_SALT = bytes32("KRESKO");
    bytes32 constant KISS_SALT = bytes32("KISS");
    bytes32 constant VAULT_SALT = bytes32("vKISS");
    bytes32 constant GM_SALT = bytes32("GatingManager");
    bytes32 constant MC_SALT = bytes32("KrMulticall");
    bytes32 constant D1_SALT = bytes32("DataV1");

    string constant KRASSET_NAME_PREFIX = "Kresko: ";
    string constant KISS_PREFIX = "Kresko: ";

    string constant ANCHOR_NAME_PREFIX = "Kresko Asset Anchor: ";
    string constant ANCHOR_SYMBOL_PREFIX = "a";

    string constant VAULT_NAME_PREFIX = "Kresko Vault: ";
    string constant VAULT_SYMBOL_PREFIX = "v";
}
