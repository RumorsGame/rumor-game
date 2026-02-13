import "dotenv/config";
import { ethers } from "hardhat";
import * as fs from "fs";

const LOG = "deploy-log.txt";
const log = (msg: string) => {
  fs.appendFileSync(LOG, msg + "\n");
  process.stdout.write(msg + "\n");
};

async function main() {
  try {
    const [deployer] = await ethers.getSigners();
    log("Deploying with: " + deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    log("Balance: " + ethers.formatEther(balance) + " tBNB");

    if (balance === 0n) {
      log("ERROR: No tBNB. Get from https://www.bnbchain.org/en/testnet-faucet");
      return;
    }

    log("Deploying AgentNFA...");
    const AgentNFA = await ethers.getContractFactory("AgentNFA");
    const agentNFA = await AgentNFA.deploy();
    await agentNFA.waitForDeployment();
    const nfaAddr = await agentNFA.getAddress();
    log("AgentNFA deployed to: " + nfaAddr);

    log("Deploying RumorSim...");
    const RumorSim = await ethers.getContractFactory("RumorSim");
    const rumorSim = await RumorSim.deploy();
    await rumorSim.waitForDeployment();
    const simAddr = await rumorSim.getAddress();
    log("RumorSim deployed to: " + simAddr);

    log("AGENT_NFA_ADDRESS=" + nfaAddr);
    log("RUMOR_SIM_ADDRESS=" + simAddr);
  } catch (err: any) {
    log("DEPLOY ERROR: " + err.message);
    if (err.code) log("Error code: " + err.code);
  }
}

fs.writeFileSync(LOG, "=== Deploy Start ===\n");
main().catch((e) => {
  log("FATAL: " + e.message);
  process.exitCode = 1;
});
