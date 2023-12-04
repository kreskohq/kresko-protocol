const glob = require('glob')
const path = require('path')
const root = path.resolve(__dirname, '../')

const success = str => {
  process.stdout.write(Buffer.from(str).toString('utf-8'))
  process.exit(0)
}

const error = str => {
  process.stderr.write(Buffer.from(str).toString('utf-8'))
  process.exit(1)
}

const getLatestDeployment = () => {
  const name = process.argv[3]
  const chainId = process.argv[4]
  const deployments = findDeployments(name, chainId)
  if (!deployments.length) {
    error(`No deployment found for ${name} on chain ${chainId}`)
  }
  return deployments.sort((a, b) => Number(a.transaction.nonce) - Number(b.transaction.nonce)).pop().contractAddress
}

const findDeployments = (name, chainId) => {
  const results = []
  const files = glob.sync(`${root}/broadcast/**/${chainId}/*-latest.json`)

  for (const file of files) {
    const data = require(file)
    if (!data.transactions) continue
    const transaction = data.transactions.find(tx => {
      if (!tx?.hash) return false

      const isCreate = tx.transactionType.startsWith('CREATE')
      // const isInnerCreate = transaction.transaction.additionalContracts.length > 0;
      // if(!isCreate && !isInnerCreate) return false;
      if (!isCreate) return false

      return tx.contractName.toLowerCase() === name.toLowerCase()
    })
    if (!transaction) continue
    results.push(transaction)
  }

  return results
}

const commands = {
  getLatestDeployment,
}

const command = process.argv[2]

if (!command) {
  error('No command provided')
}

if (!commands[command]) {
  error(`Unknown command ${command}`)
}

const result = commands[command]()

if (!result) {
  error(`No result for command ${command}`)
}

success(result)
