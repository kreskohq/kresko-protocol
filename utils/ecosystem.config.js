module.exports = {
  apps: [
    {
      watch: ['sol/contracts/core'],
      autorestart: false,
      watch_delay: 200,
      name: 'anvil',
      script: './utils/localnet.sh',
    },
    {
      watch: ['sol/contracts/core'],
      autorestart: false,
      watch_delay: 200,
      name: 'deploy',
      script: './utils/localnet-deploy.sh',
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
