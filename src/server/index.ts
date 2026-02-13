import "dotenv/config";
import express from "express";
import cors from "cors";
import { roomsRouter } from "./routes/rooms.js";
import { getChainService } from "./services/chainService.js";
import { startAutoFill } from "./services/autoFill.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Ensure UTF-8 encoding on all JSON responses
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// Static files (skill.md)
app.use(express.static(path.resolve(__dirname, "../../public")));

// API routes
app.use("/api/rooms", roomsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "0.1.0" });
});

const PORT = process.env.PORT || 6000;
app.listen(PORT, () => {
  console.log(`Rumor Game API running on http://localhost:${PORT}`);
  console.log(`Skill doc: http://localhost:${PORT}/skill.md`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  const chain = getChainService();
  console.log(`Chain: ${chain.isEnabled() ? "ENABLED (BSC Testnet)" : "DISABLED (no env vars)"}`);
  startAutoFill();
});
