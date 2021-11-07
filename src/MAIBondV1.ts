import { Address } from '@graphprotocol/graph-ts'

import { DepositCall, RedeemCall } from '../generated/MAIBondV1/MAIBondV1'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from './utils/Transactions'
import { loadOrCreateOtter, updateOtterClamBalance } from './utils/OtterClam'
import { toDecimal } from './utils/Decimals'
import { MAI_BOND_TOKEN } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { loadOrCreateRedemption } from './utils/Redemption'
import { createDailyBondRecord } from './utils/DailyBond'

export function handleDeposit(call: DepositCall): void {
  let otter = loadOrCreateOtter(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let token = loadOrCreateToken(MAI_BOND_TOKEN)

  let amount = toDecimal(call.inputs._amount, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.otter = otter.id
  deposit.amount = amount
  deposit.value = amount
  deposit.maxPremium = toDecimal(call.inputs._maxPrice)
  deposit.token = token.id
  deposit.timestamp = transaction.timestamp
  deposit.save()

  createDailyBondRecord(deposit.timestamp, token, deposit.amount, deposit.value)
  updateOtterClamBalance(otter, transaction)
}

export function handleRedeem(call: RedeemCall): void {
  let otter = loadOrCreateOtter(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)

  let redemption = loadOrCreateRedemption(call.transaction.hash as Address)
  redemption.transaction = transaction.id
  redemption.otter = otter.id
  redemption.token = loadOrCreateToken(MAI_BOND_TOKEN).id
  redemption.timestamp = transaction.timestamp
  redemption.save()
  updateOtterClamBalance(otter, transaction)
}
