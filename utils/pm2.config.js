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
      name: 'setup-local',
      script: 'just deploy-local',
    },
    {
      watch: false,
      autorestart: false,
      wait_ready: true,
      name: 'setup-arbitrum',
      script: 'just setup-arbitrum',
    },
  ],
};
