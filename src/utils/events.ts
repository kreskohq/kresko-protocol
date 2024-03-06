import type { Log } from '@ethersproject/providers'
import { Contract, type ContractReceipt, type ContractTransaction, type Event } from 'ethers'

export async function getNamedEvent<T extends Event = Event>(tx: ContractTransaction, eventName: string): Promise<T> {
  const receipt: ContractReceipt = await tx.wait()
  const event = receipt.events
    ? receipt.events.find(x => {
        return x.event === eventName
      })
    : undefined
  return event as unknown as T
}

// Extracts named events from a transaction receipt
export async function getAllNamedEvents<T extends Event = Event>(
  tx: ContractTransaction,
  eventName: string,
): Promise<T[]> {
  const receipt = await tx.wait()
  const events: (Event | Log)[] = receipt.events
    ? receipt.events.filter((x: any) => {
        return x.event == eventName
      })
    : []
  return events as T[]
}

// Extracts internal event from a transaction receipt
export async function getInternalEvent<T>(tx: ContractTransaction, contract: Contract, eventName: string): Promise<T> {
  const receipt = await tx.wait()
  const events: (Event | Log)[] = receipt.events
    ? receipt.events.filter((e: any) => e.address === contract.address)
    : []
  return events
    .map(e => {
      const eventFragment = contract.interface.getEvent(eventName)
      const topicHash = contract.interface.getEventTopic(eventFragment)
      if (e.topics[0] === topicHash) {
        return contract.interface.decodeEventLog(eventName, e.data, e.topics) as unknown as T
      }
    })
    .filter(Boolean)[0] as T
}

export async function getAllInternalEvents<T>(
  tx: ContractTransaction,
  contract: Contract,
  eventName: string,
): Promise<T[]> {
  const receipt = await tx.wait()
  const events: (Event | Log)[] = receipt.events
    ? receipt.events.filter((e: any) => e.address === contract.address)
    : []
  return events
    .map(e => {
      const eventFragment = contract.interface.getEvent(eventName)
      const topicHash = contract.interface.getEventTopic(eventFragment)

      if (e.topics[0] === topicHash) {
        return contract.interface.decodeEventLog(eventName, e.data, e.topics) as unknown as T
      }
    })
    .filter(Boolean) as T[]
}
