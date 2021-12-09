import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { OtterClamERC20V2 } from '../../generated/OtterTreasury/OtterClamERC20V2'
import { StakedOtterClamERC20V2 } from '../../generated/StakedOtterClamERC20V2/StakedOtterClamERC20V2'
import { OtterStaking } from '../../generated/OtterTreasury/OtterStaking'
import { ClamCirculatingSupply } from '../../generated/OtterTreasury/ClamCirculatingSupply'
import { ERC20 } from '../../generated/OtterTreasury/ERC20'
import { UniswapV2Pair } from '../../generated/OtterTreasury/UniswapV2Pair'

import { ProtocolMetric, Transaction } from '../../generated/schema'
import {
  CIRCULATING_SUPPLY_CONTRACT,
  CIRCULATING_SUPPLY_CONTRACT_BLOCK,
  MAI_ERC20_CONTRACT,
  FRAX_ERC20_CONTRACT,
  CLAM_ERC20_CONTRACT,
  SCLAM_ERC20_CONTRACT,
  MATIC_ERC20_CONTRACT,
  STAKING_CONTRACT,
  TREASURY_ADDRESS,
  UNI_CLAM_MAI_PAIR,
  UNI_CLAM_FRAX_PAIR,
  UNI_CLAM_FRAX_PAIR_BLOCK,
  UNI_CLAM_WMATIC_PAIR,
  UNI_CLAM_WMATIC_PAIR_BLOCK,
} from './Constants'
import { dayFromTimestamp } from './Dates'
import { toDecimal } from './Decimals'
import {
  getCLAMUSDRate,
  getDiscountedPairUSD,
  getPairUSD,
  getWMATICUSDRate,
  getPairWMATIC,
} from './Price'

export function loadOrCreateProtocolMetric(timestamp: BigInt): ProtocolMetric {
  let dayTimestamp = dayFromTimestamp(timestamp)

  let protocolMetric = ProtocolMetric.load(dayTimestamp)
  if (protocolMetric == null) {
    protocolMetric = new ProtocolMetric(dayTimestamp)
    protocolMetric.timestamp = timestamp
    protocolMetric.clamCirculatingSupply = BigDecimal.fromString('0')
    protocolMetric.sClamCirculatingSupply = BigDecimal.fromString('0')
    protocolMetric.totalSupply = BigDecimal.fromString('0')
    protocolMetric.clamPrice = BigDecimal.fromString('0')
    protocolMetric.marketCap = BigDecimal.fromString('0')
    protocolMetric.totalValueLocked = BigDecimal.fromString('0')
    protocolMetric.treasuryRiskFreeValue = BigDecimal.fromString('0')
    protocolMetric.treasuryMarketValue = BigDecimal.fromString('0')
    protocolMetric.nextEpochRebase = BigDecimal.fromString('0')
    protocolMetric.nextDistributedClam = BigDecimal.fromString('0')
    protocolMetric.currentAPY = BigDecimal.fromString('0')
    protocolMetric.treasuryMaiRiskFreeValue = BigDecimal.fromString('0')
    protocolMetric.treasuryMaiMarketValue = BigDecimal.fromString('0')
    protocolMetric.treasuryFraxRiskFreeValue = BigDecimal.fromString('0')
    protocolMetric.treasuryFraxMarketValue = BigDecimal.fromString('0')
    protocolMetric.treasuryWmaticRiskFreeValue = BigDecimal.fromString('0')
    protocolMetric.treasuryWmaticMarketValue = BigDecimal.fromString('0')
    protocolMetric.treasuryClamMaiPOL = BigDecimal.fromString('0')
    protocolMetric.treasuryClamFraxPOL = BigDecimal.fromString('0')
    protocolMetric.treasuryClamWmaticPOL = BigDecimal.fromString('0')

    protocolMetric.save()
  }
  return protocolMetric as ProtocolMetric
}

function getTotalSupply(): BigDecimal {
  let clam_contract = OtterClamERC20V2.bind(
    Address.fromString(CLAM_ERC20_CONTRACT),
  )
  let total_supply = toDecimal(clam_contract.totalSupply(), 9)
  log.debug('Total Supply {}', [total_supply.toString()])
  return total_supply
}

function getCirculatingSupply(
  transaction: Transaction,
  total_supply: BigDecimal,
): BigDecimal {
  let circ_supply = BigDecimal.fromString('0')
  if (
    transaction.blockNumber.gt(
      BigInt.fromString(CIRCULATING_SUPPLY_CONTRACT_BLOCK),
    )
  ) {
    let circulatingSupply_contract = ClamCirculatingSupply.bind(
      Address.fromString(CIRCULATING_SUPPLY_CONTRACT),
    )
    circ_supply = toDecimal(
      circulatingSupply_contract.CLAMCirculatingSupply(),
      9,
    )
  } else {
    circ_supply = total_supply
  }
  log.debug('Circulating Supply {}', [total_supply.toString()])
  return circ_supply
}

function getSClamSupply(transaction: Transaction): BigDecimal {
  let sclam_supply = BigDecimal.fromString('0')

  let sclam_contract = StakedOtterClamERC20V2.bind(
    Address.fromString(SCLAM_ERC20_CONTRACT),
  )
  sclam_supply = toDecimal(sclam_contract.circulatingSupply(), 9)

  log.debug('sCLAM Supply {}', [sclam_supply.toString()])
  return sclam_supply
}

function getMV_RFV(transaction: Transaction): BigDecimal[] {
  let maiERC20 = ERC20.bind(Address.fromString(MAI_ERC20_CONTRACT))
  let fraxERC20 = ERC20.bind(Address.fromString(FRAX_ERC20_CONTRACT))
  let maticERC20 = ERC20.bind(Address.fromString(MATIC_ERC20_CONTRACT))

  let clamMaiPair = UniswapV2Pair.bind(Address.fromString(UNI_CLAM_MAI_PAIR))
  let clamFraxPair = UniswapV2Pair.bind(Address.fromString(UNI_CLAM_FRAX_PAIR))
  let clamWmaticPair = UniswapV2Pair.bind(
    Address.fromString(UNI_CLAM_WMATIC_PAIR),
  )

  let treasury_address = TREASURY_ADDRESS
  let maiBalance = maiERC20.balanceOf(Address.fromString(treasury_address))
  let fraxBalance = fraxERC20.balanceOf(Address.fromString(treasury_address))

  let wmaticBalance = maticERC20.balanceOf(Address.fromString(treasury_address))
  let wmatic_value = toDecimal(wmaticBalance, 18).times(getWMATICUSDRate())

  //CLAM-MAI
  let clamMaiBalance = clamMaiPair.balanceOf(
    Address.fromString(treasury_address),
  )
  let clamMaiTotalLP = toDecimal(clamMaiPair.totalSupply(), 18)
  let clamMaiPOL = toDecimal(clamMaiBalance, 18)
    .div(clamMaiTotalLP)
    .times(BigDecimal.fromString('100'))
  let clamMai_value = getPairUSD(clamMaiBalance, UNI_CLAM_MAI_PAIR)
  let clamMai_rfv = getDiscountedPairUSD(clamMaiBalance, UNI_CLAM_MAI_PAIR)

  //CLAM-FRAX
  let clamFraxBalance = BigInt.fromI32(0)
  let clamFrax_value = BigDecimal.fromString('0')
  let clamFrax_rfv = BigDecimal.fromString('0')
  let clamFraxTotalLP = BigDecimal.fromString('0')
  let clamFraxPOL = BigDecimal.fromString('0')
  if (transaction.blockNumber.gt(BigInt.fromString(UNI_CLAM_FRAX_PAIR_BLOCK))) {
    clamFraxBalance = clamFraxPair.balanceOf(
      Address.fromString(treasury_address),
    )
    clamFrax_value = getPairUSD(clamFraxBalance, UNI_CLAM_FRAX_PAIR)
    clamFrax_rfv = getDiscountedPairUSD(clamFraxBalance, UNI_CLAM_FRAX_PAIR)
    clamFraxTotalLP = toDecimal(clamFraxPair.totalSupply(), 18)
    if (
      clamFraxTotalLP.gt(BigDecimal.fromString('0')) &&
      clamFraxBalance.gt(BigInt.fromI32(0))
    ) {
      clamFraxPOL = toDecimal(clamFraxBalance, 18)
        .div(clamFraxTotalLP)
        .times(BigDecimal.fromString('100'))
    }
  }

  //OHMETH
  let clamWmatic = BigInt.fromI32(0)
  let clamWmatic_value = BigDecimal.fromString('0')
  let clamWmatic_rfv = BigDecimal.fromString('0')
  let clamWmaticTotalLP = BigDecimal.fromString('0')
  let clamWmaticPOL = BigDecimal.fromString('0')
  if (
    transaction.blockNumber.gt(BigInt.fromString(UNI_CLAM_WMATIC_PAIR_BLOCK))
  ) {
    clamWmatic = clamWmaticPair.balanceOf(Address.fromString(treasury_address))
    log.debug('clamMaticBalance {}', [clamWmatic.toString()])

    clamWmatic_value = getPairWMATIC(clamWmatic, UNI_CLAM_WMATIC_PAIR)
    log.debug('clamWmatic_value {}', [clamWmatic_value.toString()])

    clamWmatic_rfv = getDiscountedPairUSD(clamWmatic, UNI_CLAM_WMATIC_PAIR)
    clamWmaticTotalLP = toDecimal(clamWmaticPair.totalSupply(), 18)
    if (
      clamWmaticTotalLP.gt(BigDecimal.fromString('0')) &&
      clamWmatic.gt(BigInt.fromI32(0))
    ) {
      clamWmaticPOL = toDecimal(clamWmatic, 18)
        .div(clamWmaticTotalLP)
        .times(BigDecimal.fromString('100'))
    }
  }

  let stableValue = maiBalance.plus(fraxBalance)
  let stableValueDecimal = toDecimal(stableValue, 18)

  let lpValue = clamMai_value.plus(clamFrax_value).plus(clamWmatic_value)
  let rfvLpValue = clamMai_rfv.plus(clamFrax_rfv).plus(clamWmatic_rfv)

  let mv = stableValueDecimal.plus(lpValue).plus(wmatic_value)
  let rfv = stableValueDecimal.plus(rfvLpValue)

  log.debug('Treasury Market Value {}', [mv.toString()])
  log.debug('Treasury RFV {}', [rfv.toString()])
  log.debug('Treasury MAI value {}', [toDecimal(maiBalance, 18).toString()])
  log.debug('Treasury FRAX value {}', [toDecimal(fraxBalance, 18).toString()])
  log.debug('Treasury WMATIC value {}', [wmatic_value.toString()])
  log.debug('Treasury CLAM-MAI RFV {}', [clamMai_rfv.toString()])
  log.debug('Treasury CLAM-FRAX RFV {}', [clamFrax_rfv.toString()])

  return [
    mv,
    rfv,
    // treasuryMaiRiskFreeValue = MAI RFV * MAI + aMAI
    clamMai_rfv.plus(toDecimal(maiBalance, 18)),
    // treasuryMaiMarketValue = MAI LP * MAI + aMAI
    clamMai_value.plus(toDecimal(maiBalance, 18)),
    // treasuryFraxRiskFreeValue = FRAX RFV * FRAX
    clamFrax_rfv.plus(toDecimal(fraxBalance, 18)),
    // treasuryFraxMarketValue = FRAX LP * FRAX
    clamFrax_value.plus(toDecimal(fraxBalance, 18)),
    clamWmatic_rfv.plus(wmatic_value),
    clamWmatic_value.plus(wmatic_value),
    // POL
    clamMaiPOL,
    clamFraxPOL,
    clamWmaticPOL,
  ]
}

function getNextCLAMRebase(transaction: Transaction): BigDecimal {
  let staking_contract = OtterStaking.bind(Address.fromString(STAKING_CONTRACT))
  let distribution_v1 = toDecimal(staking_contract.epoch().value3, 9)
  log.debug('next_distribution v2 {}', [distribution_v1.toString()])
  let next_distribution = distribution_v1
  log.debug('next_distribution total {}', [next_distribution.toString()])
  return next_distribution
}

function getAPY_Rebase(
  sCLAM: BigDecimal,
  distributedCLAM: BigDecimal,
): BigDecimal[] {
  let nextEpochRebase = distributedCLAM
    .div(sCLAM)
    .times(BigDecimal.fromString('100'))

  let nextEpochRebase_number = Number.parseFloat(nextEpochRebase.toString())
  let currentAPY = Math.pow(nextEpochRebase_number / 100 + 1, 365 * 3 - 1) * 100

  let currentAPYdecimal = BigDecimal.fromString(currentAPY.toString())

  log.debug('next_rebase {}', [nextEpochRebase.toString()])
  log.debug('current_apy total {}', [currentAPYdecimal.toString()])

  return [currentAPYdecimal, nextEpochRebase]
}

function getRunway(
  sCLAM: BigDecimal,
  rfv: BigDecimal,
  rebase: BigDecimal,
): BigDecimal[] {
  let runway2dot5k = BigDecimal.fromString('0')
  let runway5k = BigDecimal.fromString('0')
  let runway7dot5k = BigDecimal.fromString('0')
  let runway10k = BigDecimal.fromString('0')
  let runway20k = BigDecimal.fromString('0')
  let runway50k = BigDecimal.fromString('0')
  let runway70k = BigDecimal.fromString('0')
  let runway100k = BigDecimal.fromString('0')
  let runwayCurrent = BigDecimal.fromString('0')

  if (
    sCLAM.gt(BigDecimal.fromString('0')) &&
    rfv.gt(BigDecimal.fromString('0')) &&
    rebase.gt(BigDecimal.fromString('0'))
  ) {
    let treasury_runway = Number.parseFloat(rfv.div(sCLAM).toString())

    let runway2dot5k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.0029438) / 3
    let runway5k_num = Math.log(treasury_runway) / Math.log(1 + 0.003579) / 3
    let runway7dot5k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.0039507) / 3
    let runway10k_num = Math.log(treasury_runway) / Math.log(1 + 0.00421449) / 3
    let runway20k_num = Math.log(treasury_runway) / Math.log(1 + 0.00485037) / 3
    let runway50k_num = Math.log(treasury_runway) / Math.log(1 + 0.00569158) / 3
    let runway70k_num = Math.log(treasury_runway) / Math.log(1 + 0.00600065) / 3
    let runway100k_num =
      Math.log(treasury_runway) / Math.log(1 + 0.00632839) / 3
    let nextEpochRebase_number = Number.parseFloat(rebase.toString()) / 100
    let runwayCurrent_num =
      Math.log(treasury_runway) / Math.log(1 + nextEpochRebase_number) / 3

    runway2dot5k = BigDecimal.fromString(runway2dot5k_num.toString())
    runway5k = BigDecimal.fromString(runway5k_num.toString())
    runway7dot5k = BigDecimal.fromString(runway7dot5k_num.toString())
    runway10k = BigDecimal.fromString(runway10k_num.toString())
    runway20k = BigDecimal.fromString(runway20k_num.toString())
    runway50k = BigDecimal.fromString(runway50k_num.toString())
    runway70k = BigDecimal.fromString(runway70k_num.toString())
    runway100k = BigDecimal.fromString(runway100k_num.toString())
    runwayCurrent = BigDecimal.fromString(runwayCurrent_num.toString())
  }

  return [
    runway2dot5k,
    runway5k,
    runway7dot5k,
    runway10k,
    runway20k,
    runway50k,
    runway70k,
    runway100k,
    runwayCurrent,
  ]
}

export function updateProtocolMetrics(transaction: Transaction): void {
  let pm = loadOrCreateProtocolMetric(transaction.timestamp)

  //Total Supply
  pm.totalSupply = getTotalSupply()

  //Circ Supply
  pm.clamCirculatingSupply = getCirculatingSupply(transaction, pm.totalSupply)

  //sClam Supply
  pm.sClamCirculatingSupply = getSClamSupply(transaction)

  //CLAM Price
  pm.clamPrice = getCLAMUSDRate()

  //CLAM Market Cap
  pm.marketCap = pm.clamCirculatingSupply.times(pm.clamPrice)

  //Total Value Locked
  pm.totalValueLocked = pm.sClamCirculatingSupply.times(pm.clamPrice)

  //Treasury RFV and MV
  let mv_rfv = getMV_RFV(transaction)
  pm.treasuryMarketValue = mv_rfv[0]
  pm.treasuryRiskFreeValue = mv_rfv[1]
  pm.treasuryMaiRiskFreeValue = mv_rfv[2]
  pm.treasuryMaiMarketValue = mv_rfv[3]
  pm.treasuryFraxRiskFreeValue = mv_rfv[4]
  pm.treasuryFraxMarketValue = mv_rfv[5]
  pm.treasuryWmaticRiskFreeValue = mv_rfv[6]
  pm.treasuryWmaticMarketValue = mv_rfv[7]
  pm.treasuryClamMaiPOL = mv_rfv[8]
  pm.treasuryClamFraxPOL = mv_rfv[9]
  pm.treasuryClamWmaticPOL = mv_rfv[10]

  // Rebase rewards, APY, rebase
  pm.nextDistributedClam = getNextCLAMRebase(transaction)
  let apy_rebase = getAPY_Rebase(
    pm.sClamCirculatingSupply,
    pm.nextDistributedClam,
  )
  pm.currentAPY = apy_rebase[0]
  pm.nextEpochRebase = apy_rebase[1]

  //Runway
  let runways = getRunway(
    pm.sClamCirculatingSupply,
    pm.treasuryRiskFreeValue,
    pm.nextEpochRebase,
  )
  pm.runway2dot5k = runways[0]
  pm.runway5k = runways[1]
  pm.runway7dot5k = runways[2]
  pm.runway10k = runways[3]
  pm.runway20k = runways[4]
  pm.runway50k = runways[5]
  pm.runway70k = runways[6]
  pm.runway100k = runways[7]
  pm.runwayCurrent = runways[8]

  pm.save()
}
