import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Deploy AgentNFA
  const AgentNFA = await ethers.getContractFactory("AgentNFA");
  const agentNFA = await AgentNFA.deploy();
  await agentNFA.waitForDeployment();
  const nfaAddr = await agentNFA.getAddress();
  console.log("AgentNFA deployed to:", nfaAddr);

  // Deploy RumorSim
  const RumorSim = await ethers.getContractFactory("RumorSim");
  const rumorSim = await RumorSim.deploy();
  await rumorSim.waitForDeployment();
  const simAddr = await rumorSim.getAddress();
  console.log("RumorSim deployed to:", simAddr);

  // Approve RumorSim as operator for AgentNFA (so it can record actions)
  console.log("\nDeployed addresses:");
  console.log(`  AGENT_NFA_ADDRESS=${nfaAddr}`);
  console.log(`  RUMOR_SIM_ADDRESS=${simAddr}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
