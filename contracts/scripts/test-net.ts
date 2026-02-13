import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  fs.writeFileSync("test-log.txt", "script started\n");
  const [deployer] = await ethers.getSigners();
  fs.appendFileSync("test-log.txt", "addr: " + deployer.address + "\n");
  const balance = await ethers.provider.getBalance(deployer.address);
  fs.appendFileSync("test-log.txt", "balance: " + ethers.formatEther(balance) + "\n");
}

main().catch((e) => {
  fs.writeFileSync("test-log.txt", "ERROR: " + e.message + "\n");
  process.exitCode = 1;
});
