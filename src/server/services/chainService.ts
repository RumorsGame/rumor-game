import { ethers, JsonRpcProvider, Wallet, Contract, keccak256, toUtf8Bytes } from "ethers";

// ABI subsets — only the functions we call from the backend
const RUMOR_SIM_ABI = [
  "function submitActionHash(bytes32 roomId, uint256 roundIndex, address player, bytes32 actionHash, bytes32 narrativeHash) external",
  "function resolveRound(bytes32 roomId, uint256 roundIndex, bytes32 preStateHash, bytes32 postStateHash, bytes32 actionsHash, bytes32 rumorCardHash, bytes32 roundHash) external",
  "function getRound(bytes32 roomId, uint256 roundIndex) external view returns (tuple(bytes32 preStateHash, bytes32 postStateHash, bytes32 actionsHash, bytes32 rumorCardHash, bytes32 roundHash, uint256 timestamp, bool exists))",
  "function verifyRoundHash(bytes32 roomId, uint256 roundIndex, bytes32 expectedHash) external view returns (bool)",
  "event RoundResolved(bytes32 indexed roomId, uint256 indexed roundIndex, bytes32 preStateHash, bytes32 postStateHash, bytes32 actionsHash, bytes32 roundHash)",
  "event ActionSubmitted(bytes32 indexed roomId, uint256 indexed roundIndex, address indexed player, bytes32 actionHash, bytes32 narrativeHash)",
];

const AGENT_NFA_ABI = [
  "function mint(tuple(string persona, string experience, string version, string vaultURI, bytes32 vaultHash) meta) external returns (uint256)",
  "function getAgentMetadata(uint256 tokenId) external view returns (tuple(string persona, string experience, string version, string vaultURI, bytes32 vaultHash))",
  "function getState(uint256 tokenId) external view returns (tuple(uint8 status, address runner, uint256 totalRounds, uint256 lastActionTs))",
  "function setRunner(uint256 tokenId, address runner) external",
  "function recordAction(uint256 tokenId, uint256 roundIndex, bytes32 actionHash) external",
  "event AgentMinted(uint256 indexed tokenId, address indexed owner, string persona)",
];

export interface ChainConfig {
  rpcUrl: string;
  privateKey: string;
  rumorSimAddress: string;
  agentNFAAddress: string;
}

export class ChainService {
  private provider: JsonRpcProvider;
  private signer: Wallet;
  private rumorSim: Contract;
  private agentNFA: Contract;
  private enabled: boolean;

  constructor(config?: ChainConfig) {
    if (!config || !config.privateKey || !config.rumorSimAddress) {
      this.enabled = false;
      this.provider = null as any;
      this.signer = null as any;
      this.rumorSim = null as any;
      this.agentNFA = null as any;
      return;
    }

    this.enabled = true;
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.signer = new Wallet(config.privateKey, this.provider);
    this.rumorSim = new Contract(config.rumorSimAddress, RUMOR_SIM_ABI, this.signer);
    this.agentNFA = new Contract(config.agentNFAAddress, AGENT_NFA_ABI, this.signer);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Convert off-chain room ID string to bytes32
  roomIdToBytes32(roomId: string): string {
    return keccak256(toUtf8Bytes(roomId));
  }

  // Convert hex hash string (from engine sha256) to bytes32
  hexToBytes32(hex: string): string {
    if (hex.startsWith("0x")) return hex.padEnd(66, "0").slice(0, 66);
    return "0x" + hex.padEnd(64, "0").slice(0, 64);
  }

  // ===== RumorSim =====

  async submitActionHash(
    roomId: string,
    roundIndex: number,
    playerAddress: string,
    actionHash: string,
    narrativeHash: string,
  ) {
    if (!this.enabled) return null;
    const tx = await this.rumorSim.submitActionHash(
      this.roomIdToBytes32(roomId),
      roundIndex,
      playerAddress,
      this.hexToBytes32(actionHash),
      this.hexToBytes32(narrativeHash),
    );
    return tx.wait();
  }

  async resolveRoundOnChain(
    roomId: string,
    roundIndex: number,
    hashes: {
      preStateHash: string;
      postStateHash: string;
      actionsHash: string;
      rumorCardHash: string;
      roundHash: string;
    },
  ) {
    if (!this.enabled) return null;
    const tx = await this.rumorSim.resolveRound(
      this.roomIdToBytes32(roomId),
      roundIndex,
      this.hexToBytes32(hashes.preStateHash),
      this.hexToBytes32(hashes.postStateHash),
      this.hexToBytes32(hashes.actionsHash),
      this.hexToBytes32(hashes.rumorCardHash),
      this.hexToBytes32(hashes.roundHash),
    );
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  async verifyRoundHash(roomId: string, roundIndex: number, expectedHash: string): Promise<boolean> {
    if (!this.enabled) return false;
    return this.rumorSim.verifyRoundHash(
      this.roomIdToBytes32(roomId),
      roundIndex,
      this.hexToBytes32(expectedHash),
    );
  }

  async getRoundOnChain(roomId: string, roundIndex: number) {
    if (!this.enabled) return null;
    try {
      return await this.rumorSim.getRound(
        this.roomIdToBytes32(roomId),
        roundIndex,
      );
    } catch {
      return null;
    }
  }

  // ===== AgentNFA =====

  async mintAgent(persona: string, experience: string, version: string = "1.0") {
    if (!this.enabled) return null;
    const meta = {
      persona,
      experience,
      version,
      vaultURI: "",
      vaultHash: ethers.zeroPadValue("0x", 32),
    };
    const tx = await this.agentNFA.mint(meta);
    const receipt = await tx.wait();
    // Parse AgentMinted event to get tokenId
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === "AgentMinted",
    );
    return {
      txHash: receipt.hash,
      tokenId: event?.args?.[0]?.toString() || null,
    };
  }

  async getAgentMetadata(tokenId: number) {
    if (!this.enabled) return null;
    return this.agentNFA.getAgentMetadata(tokenId);
  }

  async getAgentState(tokenId: number) {
    if (!this.enabled) return null;
    return this.agentNFA.getState(tokenId);
  }

  async recordAction(tokenId: number, roundIndex: number, actionHash: string) {
    if (!this.enabled) return null;
    const tx = await this.agentNFA.recordAction(
      tokenId,
      roundIndex,
      this.hexToBytes32(actionHash),
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  async setRunner(tokenId: number, runnerAddress: string) {
    if (!this.enabled) return null;
    const tx = await this.agentNFA.setRunner(tokenId, runnerAddress);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }
}

// Singleton — initialized from env vars
let _instance: ChainService | null = null;

export function getChainService(): ChainService {
  if (!_instance) {
    const config: ChainConfig | undefined =
      process.env.CHAIN_RPC_URL && process.env.CHAIN_PRIVATE_KEY && process.env.RUMOR_SIM_ADDRESS
        ? {
            rpcUrl: process.env.CHAIN_RPC_URL,
            privateKey: process.env.CHAIN_PRIVATE_KEY,
            rumorSimAddress: process.env.RUMOR_SIM_ADDRESS,
            agentNFAAddress: process.env.AGENT_NFA_ADDRESS || "",
          }
        : undefined;
    _instance = new ChainService(config);
  }
  return _instance;
}
