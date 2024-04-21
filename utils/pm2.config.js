module.exports = {
  apps: [
    {
      watch: false,
      autorestart: false,
      name: 'anvil-local',
      script: 'just anvil-local',
    },
    {
      watch: false,
      autorestart: false,
      name: 'anvil-arbitrum-fork',
      script: 'just anvil-arbitrum-fork',
    },
    {
      watch: false,
      autorestart: false,
      name: 'anvil-live-arbitrum-fork',
      script: 'just anvil-live-arbitrum-fork',
    },
    {
      watch: false,
      autorestart: false,
      wait_ready: true,
      name: 'deploy-local',
      script: 'just deploy-local',
    },
    {
      watch: false,
      autorestart: false,
      wait_ready: true,
      name: 'deploy-arbitrum-fork',
      script: 'just deploy-arbitrum-fork',
    },
    {
      watch: false,
      autorestart: false,
      wait_ready: true,
      name: 'balances-live-arbitrum-fork',
      script: 'just balances-live-arbitrum-fork',
    },
    {
      watch: false,
      autorestart: false,
      wait_ready: true,
      name: 'sync-prices-arbitrum-fork',
      script: 'just sync-prices-arbitrum-fork',
    },
  ],
}
