import { RebaseCall } from '../generated/StakedOtterClamERC20V1/StakedOtterClamERC20V1'
import { OtterClamERC20 } from '../generated/StakedOtterClamERC20V1/OtterClamERC20'
import { createDailyStakingReward } from './utils/DailyStakingReward'
import { loadOrCreateTransaction } from './utils/Transactions'
import { Rebase } from '../generated/schema'
import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { CLAM_ERC20_CONTRACT, STAKING_CONTRACT_V1 } from './utils/Constants'
import { toDecimal } from './utils/Decimals'
import { getCLAMUSDRate } from './utils/Price'

export function rebaseFunction(call: RebaseCall): void {
  let transaction = loadOrCreateTransaction(call.transaction, call.block)
  var rebase = Rebase.load(transaction.id)
  log.debug('Rebase event on TX {} with amount {}', [transaction.id, toDecimal(call.inputs.profit_, 9).toString()])

  if (rebase == null && call.inputs.profit_.gt(BigInt.fromI32(0))) {
    let ohm_contract = OtterClamERC20.bind(Address.fromString(CLAM_ERC20_CONTRACT))

    rebase = new Rebase(transaction.id)
    rebase.amount = toDecimal(call.inputs.profit_, 9)
    rebase.stakedClams = toDecimal(ohm_contract.balanceOf(Address.fromString(STAKING_CONTRACT_V1)), 9)
    rebase.contract = STAKING_CONTRACT_V1
    rebase.percentage = rebase.amount.div(rebase.stakedClams)
    rebase.transaction = transaction.id
    rebase.timestamp = transaction.timestamp
    rebase.value = rebase.amount.times(getCLAMUSDRate())
    rebase.save()

    createDailyStakingReward(rebase.timestamp, rebase.amount)
  }
}
