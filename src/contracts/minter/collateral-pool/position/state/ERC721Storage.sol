// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {LibERC721} from "../libs/LibERC721.sol";

struct ERC721Storage {
    uint256 currentId;
    // Token name
    string name;
    // Token symbol
    string symbol;
    // Mapping from token ID to owner address
    mapping(uint256 => address) owners;
    // Mapping owner address to token count
    mapping(address => uint256) balances;
    // Mapping from token ID to approved address
    mapping(uint256 => address) tokenApprovals;
    // Mapping from owner to operator approvals
    mapping(address => mapping(address => bool)) operatorApprovals;
    string baseURI;
}

// Storage position
bytes32 constant ERC721_STORAGE_POSITION = keccak256("kresko.positions.erc721.storage");

function ERC721() pure returns (ERC721Storage storage state) {
    bytes32 position = ERC721_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

using LibERC721 for ERC721Storage global;
