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
      wait_ready: true,
      name: 'deploy-local',
      script: 'just deploy-local',
    },
  ],
}
