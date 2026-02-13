// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RumorSim
 * @notice On-chain settlement record for the Rumor Game.
 *         Stores round hashes for auditability. No large text on-chain.
 */
contract RumorSim is Ownable {
    struct RoundRecord {
        bytes32 preStateHash;
        bytes32 postStateHash;
        bytes32 actionsHash;
        bytes32 rumorCardHash;
        bytes32 roundHash;
        uint256 timestamp;
        bool exists;
    }

    // roomId (bytes32) => roundIndex => RoundRecord
    mapping(bytes32 => mapping(uint256 => RoundRecord)) public rounds;

    // roomId => total rounds recorded
    mapping(bytes32 => uint256) public roundCount;

    // Authorized submitters (backend service addresses)
    mapping(address => bool) public submitters;

    event SubmitterUpdated(address indexed submitter, bool authorized);
    event ActionSubmitted(
        bytes32 indexed roomId,
        uint256 indexed roundIndex,
        address indexed player,
        bytes32 actionHash,
        bytes32 narrativeHash
    );
    event RoundResolved(
        bytes32 indexed roomId,
        uint256 indexed roundIndex,
        bytes32 preStateHash,
        bytes32 postStateHash,
        bytes32 actionsHash,
        bytes32 roundHash
    );

    constructor() Ownable(msg.sender) {
        submitters[msg.sender] = true;
    }

    modifier onlySubmitter() {
        require(submitters[msg.sender], "Not authorized submitter");
        _;
    }

    // ===== Admin =====

    function setSubmitter(address submitter, bool authorized) external onlyOwner {
        submitters[submitter] = authorized;
        emit SubmitterUpdated(submitter, authorized);
    }

    // ===== Submit Action Hash =====

    /**
     * @notice Record a player's action hash for a round.
     * @param roomId   Keccak256 of the off-chain room ID
     * @param roundIndex Round number (0-based)
     * @param player   Player address or identifier hash
     * @param actionHash Hash of the submission JSON (agent_name, action, intensity, signals, confidence)
     * @param narrativeHash Hash of the narrative text (stored off-chain)
     */
    function submitActionHash(
        bytes32 roomId,
        uint256 roundIndex,
        address player,
        bytes32 actionHash,
        bytes32 narrativeHash
    ) external onlySubmitter {
        emit ActionSubmitted(roomId, roundIndex, player, actionHash, narrativeHash);
    }

    // ===== Resolve Round =====

    /**
     * @notice Record the deterministic settlement result of a round.
     * @dev roundHash = sha256(preStateHash + rumorCardHash + actionsHash + postStateHash)
     *      Anyone can verify by recomputing from the same inputs.
     */
    function resolveRound(
        bytes32 roomId,
        uint256 roundIndex,
        bytes32 preStateHash,
        bytes32 postStateHash,
        bytes32 actionsHash,
        bytes32 rumorCardHash,
        bytes32 roundHash
    ) external onlySubmitter {
        require(!rounds[roomId][roundIndex].exists, "Round already recorded");

        rounds[roomId][roundIndex] = RoundRecord({
            preStateHash: preStateHash,
            postStateHash: postStateHash,
            actionsHash: actionsHash,
            rumorCardHash: rumorCardHash,
            roundHash: roundHash,
            timestamp: block.timestamp,
            exists: true
        });

        roundCount[roomId]++;

        emit RoundResolved(
            roomId,
            roundIndex,
            preStateHash,
            postStateHash,
            actionsHash,
            roundHash
        );
    }

    // ===== View =====

    function getRound(bytes32 roomId, uint256 roundIndex)
        external
        view
        returns (RoundRecord memory)
    {
        require(rounds[roomId][roundIndex].exists, "Round not found");
        return rounds[roomId][roundIndex];
    }

    function verifyRoundHash(
        bytes32 roomId,
        uint256 roundIndex,
        bytes32 expectedHash
    ) external view returns (bool) {
        if (!rounds[roomId][roundIndex].exists) return false;
        return rounds[roomId][roundIndex].roundHash == expectedHash;
    }
}
