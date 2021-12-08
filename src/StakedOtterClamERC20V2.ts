import { ethereum } from '@graphprotocol/graph-ts'
import {
  Approval as ApprovalEvent,
  LogRebase as LogRebaseEvent,
  LogStakingContractUpdated as LogStakingContractUpdatedEvent,
  LogSupply as LogSupplyEvent,
  Transfer as TransferEvent,
} from '../generated/StakedOtterClamERC20V2/StakedOtterClamERC20V2'
import {
  Approval,
  LogRebase,
  LogStakingContractUpdated,
  LogSupply,
  Transfer,
} from '../generated/schema'
import { log } from '@graphprotocol/graph-ts'
import { loadOrCreateTransaction } from './utils/Transactions'
import { updateProtocolMetrics } from './utils/ProtocolMetrics'

export function handleApproval(event: ApprovalEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new Approval(transaction.id)
  entity.owner = event.params.owner
  entity.spender = event.params.spender
  entity.value = event.params.value
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleLogRebase(event: LogRebaseEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new LogRebase(transaction.id)
  entity.epoch = event.params.epoch
  entity.rebase = event.params.rebase
  entity.index = event.params.index
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleLogStakingContractUpdated(
  event: LogStakingContractUpdatedEvent,
): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new LogStakingContractUpdated(transaction.id)
  entity.stakingContract = event.params.stakingContract
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleLogSupply(event: LogSupplyEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new LogSupply(transaction.id)
  entity.epoch = event.params.epoch
  entity.timestamp = event.params.timestamp
  entity.totalSupply = event.params.totalSupply
  entity.transaction = transaction.id
  entity.save()
}

export function handleTransfer(event: TransferEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new Transfer(transaction.id)
  entity.from = event.params.from
  entity.to = event.params.to
  entity.value = event.params.value
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  updateProtocolMetrics(transaction)
  entity.save()
}
