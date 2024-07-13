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
  ],
}
