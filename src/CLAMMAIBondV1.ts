import { DepositCall, RedeemCall } from '../generated/CLAMMAIBondV1/CLAMMAIBondV1'
import { Deposit, Redemption } from '../generated/schema'
import { loadOrCreateTransaction } from './utils/Transactions'
import { loadOrCreateOtter, updateOtterClamBalance } from './utils/OtterClam'
import { toDecimal } from './utils/Decimals'
import { CLAM_MAI_LP_BOND_TOKEN, QUICK_CLAM_MAI_PAIR } from './utils/Constants'
import { loadOrCreateToken } from './utils/Tokens'
import { createDailyBondRecord } from './utils/DailyBond'
import { getPairUSD } from './utils/Price'

export function handleDeposit(call: DepositCall): void {
  let otter = loadOrCreateOtter(call.transaction.from)
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  let token = loadOrCreateToken(CLAM_MAI_LP_BOND_TOKEN)

  let amount = toDecimal(call.inputs._amount, 18)
  let deposit = new Deposit(transaction.id)
  deposit.transaction = transaction.id
  deposit.otter = otter.id
  deposit.amount = amount
  deposit.value = getPairUSD(call.inputs._amount, QUICK_CLAM_MAI_PAIR)
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

  let redemption = Redemption.load(transaction.id)
  if (redemption == null) {
    redemption = new Redemption(transaction.id)
  }
  redemption.transaction = transaction.id
  redemption.otter = otter.id
  redemption.token = loadOrCreateToken(CLAM_MAI_LP_BOND_TOKEN).id
  redemption.timestamp = transaction.timestamp
  redemption.save()
  updateOtterClamBalance(otter, transaction)
}
