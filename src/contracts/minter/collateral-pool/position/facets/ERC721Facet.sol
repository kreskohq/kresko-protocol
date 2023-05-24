// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;

import {ERC721} from "../state/ERC721Storage.sol";
import {IERC721Permit} from "../interfaces/IERC721Permit.sol";
import {IERC1271} from "../interfaces/IERC1271.sol";
import {pos} from "../state/PositionsStorage.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract ERC721Facet is IERC721Permit {
    using AddressUpgradeable for address;
    /// @dev The hash of the name used in the permit signature verification
    bytes32 private immutable nameHash;

    /// @dev The hash of the version string used in the permit signature verification
    bytes32 private immutable versionHash;

    constructor() {
        nameHash = keccak256("Kresko Positions");
        versionHash = keccak256("1");
    }

    /// @inheritdoc IERC721Permit
    /// @dev Value is equal to keccak256("Permit(address spender,uint256 tokenId,uint256 nonce,uint256 deadline)");
    bytes32 public constant override PERMIT_TYPEHASH =
        0x49ecf333e5b8c95c40fdafc95c1ad136e8914a8fb55e9dc8bb01eaa83a2df9ad;

    function DOMAIN_SEPARATOR() public view override returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    // keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
                    0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f,
                    nameHash,
                    versionHash,
                    getChainId(),
                    address(this)
                )
            );
    }

    function permit(
        address spender,
        uint256 tokenId,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external payable override {
        require(_blockTimestamp() <= deadline, "Permit expired");

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR(),
                keccak256(abi.encode(PERMIT_TYPEHASH, spender, tokenId, pos().getAndIncrementNonce(tokenId), deadline))
            )
        );
        address owner = ERC721().ownerOf(tokenId);
        require(spender != owner, "ERC721Permit: approval to current owner");

        if (AddressUpgradeable.isContract(owner)) {
            require(IERC1271(owner).isValidSignature(digest, abi.encodePacked(r, s, v)) == 0x1626ba7e, "Unauthorized");
        } else {
            address recoveredAddress = ecrecover(digest, v, r, s);
            require(recoveredAddress != address(0), "Invalid signature");
            require(recoveredAddress == owner, "Unauthorized");
        }

        ERC721().approve(spender, tokenId);
    }

    function getCurrentId() external view returns (uint256) {
        return ERC721().currentId;
    }

    function name() external view returns (string memory) {
        return ERC721().name;
    }

    function symbol() external view returns (string memory) {
        return ERC721().symbol;
    }

    function balanceOf(address _owner) external view returns (uint256) {
        return ERC721().balances[_owner];
    }

    function ownerOf(uint256 _tokenId) external view returns (address) {
        return ERC721().owners[_tokenId];
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external {
        ERC721().safeTransferFrom(_from, _to, _tokenId);
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) external {
        //solhint-disable-next-line max-line-length
        require(ERC721().isApprovedOrOwner(msg.sender, _tokenId), "ERC721: caller is not token owner or approved");

        ERC721().transfer(_from, _to, _tokenId);
    }

    function approve(address _approved, uint256 _tokenId) public {
        ERC721().approve(_approved, _tokenId);
    }

    function getApproved(uint256 _tokenId) external view returns (address operator) {
        return ERC721().getApproved(_tokenId);
    }

    function setApprovalForAll(address _operator, bool _approved) external {
        ERC721().setApprovalForAll(_operator, _approved);
    }

    function isApprovedForAll(address _owner, address _operator) external view returns (bool) {
        return ERC721().isApprovedForAll(_owner, _operator);
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes memory _data) external {
        ERC721().safeTransferFrom(_from, _to, _tokenId, _data);
    }

    function _blockTimestamp() internal view virtual returns (uint256) {
        return block.timestamp;
    }

    function getChainId() internal view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }
}
