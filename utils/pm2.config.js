module.exports = {
  apps: [
    {
      watch: ['sol/contracts/core'],
      autorestart: false,
      watch_delay: 200,
      name: 'anvil',
      script: 'just anvil-local',
    },
    {
      watch: ['sol/contracts/core'],
      autorestart: false,
      watch_delay: 200,
      name: 'deployment',
      script: 'just deploy-local',
    },
    // {
    //   watch: ['sol/contracts', 'sol/scripts'],
    //   autorestart: false,
    //   watch_delay: 200,
    //   name: 'web',
    //   script: 'pnpm dev',
    // },
  ],
};
