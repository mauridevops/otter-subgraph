import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { OtterClam, OtterClamBalance } from '../../generated/schema'

export function loadOrCreateOtterClamBalance(otterClam: OtterClam, timestamp: BigInt): OtterClamBalance {
  let id = timestamp.toString() + otterClam.id
  let balance = OtterClamBalance.load(id)
  if (balance == null) {
    balance = new OtterClamBalance(id)
    balance.otter = otterClam.id
    balance.timestamp = timestamp
    balance.sClamBalance = BigDecimal.fromString('0')
    balance.clamBalance = BigDecimal.fromString('0')
    balance.bondBalance = BigDecimal.fromString('0')
    balance.dollarBalance = BigDecimal.fromString('0')
    balance.stakes = []
    balance.bonds = []
    balance.save()
  }
  return balance as OtterClamBalance
}
