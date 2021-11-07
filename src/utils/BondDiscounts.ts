import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { CLAMMAIBondV1 } from '../../generated/CLAMMAIBondV1/CLAMMAIBondV1'
import { MAIBondV1 } from '../../generated/MAIBondV1/MAIBondV1'

import { BondDiscount, Transaction } from '../../generated/schema'
import { CLAM_MAI_LP_BOND_CONTRACT1, MAI_BOND_CONTRACT_V1 } from './Constants'
import { hourFromTimestamp } from './Dates'
import { toDecimal } from './Decimals'
import { getCLAMUSDRate } from './Price'

export function loadOrCreateBondDiscount(timestamp: BigInt): BondDiscount {
  let hourTimestamp = hourFromTimestamp(timestamp)

  let bondDiscount = BondDiscount.load(hourTimestamp)
  if (bondDiscount == null) {
    bondDiscount = new BondDiscount(hourTimestamp)
    bondDiscount.timestamp = timestamp
    bondDiscount.mai_discount = BigDecimal.fromString('0')
    bondDiscount.clammai_discount = BigDecimal.fromString('0')
    bondDiscount.save()
  }
  return bondDiscount as BondDiscount
}

export function updateBondDiscounts(transaction: Transaction): void {
  let bd = loadOrCreateBondDiscount(transaction.timestamp)
  let clamRate = getCLAMUSDRate()

  let bond = CLAMMAIBondV1.bind(Address.fromString(CLAM_MAI_LP_BOND_CONTRACT1))
  let price_call = bond.try_bondPriceInUSD()
  if (price_call.reverted === false && price_call.value.gt(BigInt.fromI32(0))) {
    bd.clammai_discount = clamRate.div(toDecimal(price_call.value, 18))
    bd.clammai_discount = bd.clammai_discount.minus(BigDecimal.fromString('1'))
    bd.clammai_discount = bd.clammai_discount.times(BigDecimal.fromString('100'))
    log.debug('CLAM-MAI Discount CLAM price {}  Bond Price {}  Discount {}', [
      clamRate.toString(),
      price_call.value.toString(),
      bd.clammai_discount.toString(),
    ])
  }

  //DAI
  let maiBond = MAIBondV1.bind(Address.fromString(MAI_BOND_CONTRACT_V1))
  price_call = maiBond.try_bondPriceInUSD()
  if (price_call.reverted === false && price_call.value.gt(BigInt.fromI32(0))) {
    bd.mai_discount = clamRate.div(toDecimal(price_call.value, 18))
    bd.mai_discount = bd.mai_discount.minus(BigDecimal.fromString('1'))
    bd.mai_discount = bd.mai_discount.times(BigDecimal.fromString('100'))
    log.debug('MAI Discount CLAM price {}  Bond Price {}  Discount {}', [
      clamRate.toString(),
      price_call.value.toString(),
      bd.mai_discount.toString(),
    ])
  }

  bd.save()
}
