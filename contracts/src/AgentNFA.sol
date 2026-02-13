// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentNFA
 * @notice BAP-578 compatible Non-Fungible Agent for the Rumor Game.
 *         Each token represents an AI agent persona that can participate in rounds.
 */
contract AgentNFA is ERC721, Ownable {
    uint256 private _nextTokenId;

    enum Status { Active, Paused, Terminated }

    struct AgentMetadata {
        string persona;       // JSON: agent personality/strategy traits
        string experience;    // role summary, e.g. "contrarian trader"
        string version;       // skill.md schema version used
        string vaultURI;      // off-chain extended data (IPFS/Arweave)
        bytes32 vaultHash;    // hash of vault content for verification
    }

    struct AgentState {
        Status status;
        address runner;       // authorized operator (can submit on behalf)
        uint256 totalRounds;  // rounds participated
        uint256 lastActionTs;
    }

    mapping(uint256 => AgentMetadata) private _metadata;
    mapping(uint256 => AgentState) private _state;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, string persona);
    event MetadataUpdated(uint256 indexed tokenId);
    event RunnerUpdated(uint256 indexed tokenId, address indexed runner);
    event StatusChanged(uint256 indexed tokenId, Status newStatus);
    event ActionRecorded(uint256 indexed tokenId, uint256 roundIndex, bytes32 actionHash);

    constructor() ERC721("RumorGameAgent", "RGA") Ownable(msg.sender) {}

    // ===== Mint =====

    function mint(AgentMetadata calldata meta) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _metadata[tokenId] = meta;
        _state[tokenId] = AgentState({
            status: Status.Active,
            runner: address(0),
            totalRounds: 0,
            lastActionTs: 0
        });
        emit AgentMinted(tokenId, msg.sender, meta.persona);
        return tokenId;
    }

    // ===== Metadata =====

    function getAgentMetadata(uint256 tokenId) external view returns (AgentMetadata memory) {
        _requireOwned(tokenId);
        return _metadata[tokenId];
    }

    function updateAgentMetadata(uint256 tokenId, AgentMetadata calldata meta) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _metadata[tokenId] = meta;
        emit MetadataUpdated(tokenId);
    }

    // ===== Runner (operator authorization) =====

    function setRunner(uint256 tokenId, address runner) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _state[tokenId].runner = runner;
        emit RunnerUpdated(tokenId, runner);
    }

    function getRunner(uint256 tokenId) external view returns (address) {
        _requireOwned(tokenId);
        return _state[tokenId].runner;
    }

    function isAuthorized(uint256 tokenId, address actor) public view returns (bool) {
        address owner = ownerOf(tokenId);
        return actor == owner || actor == _state[tokenId].runner;
    }

    // ===== Lifecycle =====

    function pause(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(_state[tokenId].status == Status.Active, "Not active");
        _state[tokenId].status = Status.Paused;
        emit StatusChanged(tokenId, Status.Paused);
    }

    function unpause(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(_state[tokenId].status == Status.Paused, "Not paused");
        _state[tokenId].status = Status.Active;
        emit StatusChanged(tokenId, Status.Active);
    }

    function terminate(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(_state[tokenId].status != Status.Terminated, "Already terminated");
        _state[tokenId].status = Status.Terminated;
        emit StatusChanged(tokenId, Status.Terminated);
    }

    function getState(uint256 tokenId) external view returns (AgentState memory) {
        _requireOwned(tokenId);
        return _state[tokenId];
    }

    // ===== Action Recording (called by RumorSim) =====

    function recordAction(uint256 tokenId, uint256 roundIndex, bytes32 actionHash) external {
        // Only callable by authorized parties (owner, runner, or approved contracts)
        require(
            isAuthorized(tokenId, msg.sender) || isApprovedForAll(ownerOf(tokenId), msg.sender),
            "Not authorized"
        );
        require(_state[tokenId].status == Status.Active, "Agent not active");

        _state[tokenId].totalRounds++;
        _state[tokenId].lastActionTs = block.timestamp;
        emit ActionRecorded(tokenId, roundIndex, actionHash);
    }
}
