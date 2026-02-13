module.exports = {
  apps: [
    {
      name: "rumor-api",
      script: "node_modules/.bin/tsx",
      args: "src/server/index.ts",
      cwd: "/www/wwwroot/rumor-game",
      env: {
        NODE_ENV: "production",
        PORT: 6000,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
    {
      name: "rumor-web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 6001",
      cwd: "/www/wwwroot/rumor-game/web",
      env: {
        NODE_ENV: "production",
        NEXT_PUBLIC_API_URL: "",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
