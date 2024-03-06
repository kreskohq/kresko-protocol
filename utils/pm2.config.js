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
      name: 'anvil-fork',
      script: 'just anvil-fork',
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
  ],
}
