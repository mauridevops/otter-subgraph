import { UNISWAP_CLAM_MAI_PAIR } from './Constants'
import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { UniswapV2Pair } from '../../generated/OtterTreasury/UniswapV2Pair'
import { toDecimal } from './Decimals'

let BIG_DECIMAL_1E9 = BigDecimal.fromString('1e9')
let BIG_DECIMAL_1E12 = BigDecimal.fromString('1e12')

export function getCLAMUSDRate(): BigDecimal {
  let pair = UniswapV2Pair.bind(Address.fromString(UNISWAP_CLAM_MAI_PAIR))

  let reserves = pair.getReserves()
  let reserve0 = reserves.value1.toBigDecimal()
  let reserve1 = reserves.value0.toBigDecimal()
  log.debug('pair reserve0 {}, reserve1 {}', [
    reserve0.toString(),
    reserve1.toString(),
  ])

  if (reserve0.equals(BigDecimal.zero())) {
    log.debug('getCLAMUSDRate div {}', [reserve0.toString()])
    return BigDecimal.zero()
  }

  let clamRate = reserve1.div(reserve0).div(BIG_DECIMAL_1E9)
  log.debug('CLAM rate {}', [clamRate.toString()])

  return clamRate
}

//(slp_treasury/slp_supply)*(2*sqrt(lp_dai * lp_ohm))
export function getDiscountedPairUSD(
  lp_amount: BigInt,
  pair_address: string,
): BigDecimal {
  let pair = UniswapV2Pair.bind(Address.fromString(pair_address))

  let total_lp = pair.totalSupply()
  let lp_token_1 = toDecimal(pair.getReserves().value1, 9)
  let lp_token_2 = toDecimal(pair.getReserves().value0, 18)
  let kLast = lp_token_1.times(lp_token_2).truncate(0).digits

  let part1 = toDecimal(lp_amount, 18).div(toDecimal(total_lp, 18))
  let two = BigInt.fromI32(2)

  let sqrt = kLast.sqrt()
  let part2 = toDecimal(two.times(sqrt), 0)
  let result = part1.times(part2)
  return result
}

export function getPairUSD(
  lp_amount: BigInt,
  pair_address: string,
): BigDecimal {
  let pair = UniswapV2Pair.bind(Address.fromString(pair_address))
  let total_lp = pair.totalSupply()
  let lp_token_0 = pair.getReserves().value1
  let lp_token_1 = pair.getReserves().value0
  let ownedLP = toDecimal(lp_amount, 18).div(toDecimal(total_lp, 18))
  let ohm_value = toDecimal(lp_token_0, 9).times(getCLAMUSDRate())
  let total_lp_usd = ohm_value.plus(toDecimal(lp_token_1, 18))

  return ownedLP.times(total_lp_usd)
}
