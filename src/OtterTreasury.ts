import {
  ChangeActivated as ChangeActivatedEvent,
  ChangeQueued as ChangeQueuedEvent,
  CreateDebt as CreateDebtEvent,
  Deposit as DepositEvent,
  RepayDebt as RepayDebtEvent,
  ReservesAudited as ReservesAuditedEvent,
  ReservesManaged as ReservesManagedEvent,
  ReservesUpdated as ReservesUpdatedEvent,
  RewardsMinted as RewardsMintedEvent,
  Withdrawal as WithdrawalEvent,
} from '../generated/OtterTreasury/OtterTreasury'
import {
  ChangeActivated,
  ChangeQueued,
  CreateDebt,
  Deposit,
  RepayDebt,
  ReservesAudited,
  ReservesManaged,
  ReservesUpdated,
  RewardsMinted,
  Withdrawal,
} from '../generated/schema'

import { loadOrCreateTransaction } from './utils/Transactions'
import { updateProtocolMetrics } from './utils/ProtocolMetrics'

export function handleChangeActivated(event: ChangeActivatedEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new ChangeActivated(transaction.id)
  entity.managing = event.params.managing
  entity.activated = event.params.activated
  entity.result = event.params.result
  entity.transaction = transaction.id
  entity.timestamp = transaction.timestamp
  entity.save()
}

export function handleChangeQueued(event: ChangeQueuedEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new ChangeQueued(transaction.id)
  entity.managing = event.params.managing
  entity.queued = event.params.queued
  entity.transaction = transaction.id
  entity.timestamp = transaction.timestamp
  entity.save()
}

export function handleCreateDebt(event: CreateDebtEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new CreateDebt(transaction.id)
  entity.debtor = event.params.debtor
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.value = event.params.value
  entity.transaction = transaction.id
  entity.timestamp = transaction.timestamp
  entity.save()
}

export function handleDeposit(event: DepositEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new Deposit(transaction.id)
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.value = event.params.value
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleRepayDebt(event: RepayDebtEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new RepayDebt(transaction.id)
  entity.debtor = event.params.debtor
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.value = event.params.value
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleReservesAudited(event: ReservesAuditedEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new ReservesAudited(transaction.id)
  entity.totalReserves = event.params.totalReserves
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleReservesManaged(event: ReservesManagedEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new ReservesManaged(transaction.id)
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleReservesUpdated(event: ReservesUpdatedEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new ReservesUpdated(transaction.id)
  entity.totalReserves = event.params.totalReserves
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  updateProtocolMetrics(transaction)
  entity.save()
}

export function handleRewardsMinted(event: RewardsMintedEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new RewardsMinted(transaction.id)
  entity.caller = event.params.caller
  entity.recipient = event.params.recipient
  entity.amount = event.params.amount
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}

export function handleWithdrawal(event: WithdrawalEvent): void {
  let transaction = loadOrCreateTransaction(event.transaction, event.block)
  let entity = new Withdrawal(transaction.id)
  entity.token = event.params.token
  entity.amount = event.params.amount
  entity.value = event.params.value
  entity.timestamp = transaction.timestamp
  entity.transaction = transaction.id
  entity.save()
}
