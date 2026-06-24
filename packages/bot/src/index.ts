import "dotenv/config";
import { startBotManager, stopBotManager } from "./manager.js";

console.log("====================================");
console.log("Fivem-Status Bot v2.0");
console.log("====================================");

const clusterId = process.env.CLUSTER_ID || "default";

startBotManager({ clusterId }).catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await stopBotManager();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await stopBotManager();
  process.exit(0);
});
