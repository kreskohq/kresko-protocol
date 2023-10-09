module.exports = {
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'ugprade',
        'patch',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'misc',
      ],
    ],
  },
  extends: ['@commitlint/config-conventional'],
};
