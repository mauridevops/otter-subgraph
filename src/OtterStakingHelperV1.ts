import { Address } from '@graphprotocol/graph-ts'
import { Stake, Unstake } from '../generated/schema'

import { StakeCall } from '../generated/OtterStakingHelperV1/OtterStakingHelperV1'
import { toDecimal } from './utils/Decimals'
import { loadOrCreateOtter, updateOtterClamBalance } from './utils/OtterClam'
import { loadOrCreateTransaction } from './utils/Transactions'

export function handleStake(call: StakeCall): void {
  let otter = loadOrCreateOtter(call.from as Address)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let value = toDecimal(call.inputs._amount, 9)

  let stake = new Stake(transaction.id)
  stake.transaction = transaction.id
  stake.otter = otter.id
  stake.amount = value
  stake.timestamp = transaction.timestamp
  stake.save()

  updateOtterClamBalance(otter, transaction)
}
