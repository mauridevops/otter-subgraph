import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts'
import { OtterClam, Transaction } from '../../generated/schema'
import { OtterClamERC20 } from '../../generated/MAIBondV1/OtterClamERC20'
import { StakedOtterClamERC20V1 } from '../../generated/MaiBondV1/StakedOtterClamERC20V1'
import { MAIBondV1 } from '../../generated/MaiBondV1/MaiBondV1'
import { CLAMMAIBondV1 } from '../../generated/MaiBondV1/CLAMMAIBondV1'

import {
  MAI_BOND_CONTRACT_V1,
  CLAM_MAI_LP_BOND_CONTRACT1,
  CLAM_MAI_LP_BOND_CONTRACT1_BLOCK,
  CLAM_ERC20_CONTRACT,
  SCLAM_ERC20_CONTRACT,
} from './Constants'
import { loadOrCreateOtterClamBalance } from './OtterClamBalances'
import { toDecimal } from './Decimals'
import { getCLAMUSDRate } from './Price'
import { loadOrCreateContractInfo } from './ContractInfo'
import { getHolderAux } from './Aux'

export function loadOrCreateOtter(address: Address): OtterClam {
  let otter = OtterClam.load(address.toHex())
  if (otter == null) {
    let holders = getHolderAux()
    holders.value = holders.value.plus(BigInt.fromI32(1))
    holders.save()

    otter = new OtterClam(address.toHex())
    otter.active = true
    otter.save()
  }
  return otter as OtterClam
}

export function updateOtterClamBalance(otter: OtterClam, transaction: Transaction): void {
  let balance = loadOrCreateOtterClamBalance(otter, transaction.timestamp)

  let clam_contract = OtterClamERC20.bind(Address.fromString(CLAM_ERC20_CONTRACT))
  let sClam_contract = StakedOtterClamERC20V1.bind(Address.fromString(SCLAM_ERC20_CONTRACT))
  balance.clamBalance = toDecimal(clam_contract.balanceOf(Address.fromString(otter.id)), 9)
  let sClamV1Balance = toDecimal(sClam_contract.balanceOf(Address.fromString(otter.id)), 9)
  balance.sClamBalance = sClamV1Balance

  let stakes = balance.stakes

  let cInfoSClamBalance_v1 = loadOrCreateContractInfo(otter.id + transaction.timestamp.toString() + 'sOtterClamERC20')
  cInfoSClamBalance_v1.name = 'sCLAM'
  cInfoSClamBalance_v1.contract = SCLAM_ERC20_CONTRACT
  cInfoSClamBalance_v1.amount = sClamV1Balance
  cInfoSClamBalance_v1.save()
  stakes.push(cInfoSClamBalance_v1.id)

  balance.stakes = stakes

  if (
    otter.active &&
    balance.clamBalance.lt(BigDecimal.fromString('0.01')) &&
    balance.sClamBalance.lt(BigDecimal.fromString('0.01'))
  ) {
    let holders = getHolderAux()
    holders.value = holders.value.minus(BigInt.fromI32(1))
    holders.save()
    otter.active = false
  } else if (
    otter.active == false &&
    (balance.clamBalance.gt(BigDecimal.fromString('0.01')) || balance.sClamBalance.gt(BigDecimal.fromString('0.01')))
  ) {
    let holders = getHolderAux()
    holders.value = holders.value.plus(BigInt.fromI32(1))
    holders.save()
    otter.active = true
  }

  // CLAM-MAI
  let bonds = balance.bonds
  let bondOHMMai_contract = CLAMMAIBondV1.bind(Address.fromString(CLAM_MAI_LP_BOND_CONTRACT1))
  let pending = bondOHMMai_contract.bondInfo(Address.fromString(otter.id))
  if (pending.value1.gt(BigInt.fromString('0'))) {
    let pending_bond = toDecimal(pending.value1, 9)
    balance.bondBalance = balance.bondBalance.plus(pending_bond)

    let bondInfo = loadOrCreateContractInfo(otter.id + transaction.timestamp.toString() + 'CLAMMAIBondV1')
    bondInfo.name = 'CLAM-MAI'
    bondInfo.contract = CLAM_MAI_LP_BOND_CONTRACT1
    bondInfo.amount = pending_bond
    bondInfo.save()
    bonds.push(bondInfo.id)

    log.debug('OtterClam {} pending CLAMMAIBondV1 {} on tx {}', [
      otter.id,
      toDecimal(pending.value1, 9).toString(),
      transaction.id,
    ])
  }

  // MAI
  let bondMai_contract = MAIBondV1.bind(Address.fromString(MAI_BOND_CONTRACT_V1))
  let pendingMai = bondMai_contract.bondInfo(Address.fromString(otter.id))
  if (pendingMai.value1.gt(BigInt.fromString('0'))) {
    let pending_bond = toDecimal(pendingMai.value1, 9)
    balance.bondBalance = balance.bondBalance.plus(pending_bond)

    let bondInfo = loadOrCreateContractInfo(otter.id + transaction.timestamp.toString() + 'DAIBondV3')
    bondInfo.name = 'MAI'
    bondInfo.contract = MAI_BOND_CONTRACT_V1
    bondInfo.amount = pending_bond
    bondInfo.save()
    bonds.push(bondInfo.id)

    log.debug('OtterClam {} pending MAIBond V1 {} on tx {}', [
      otter.id,
      toDecimal(pendingMai.value1, 9).toString(),
      transaction.id,
    ])
  }
  // Price
  let usdRate = getCLAMUSDRate()
  balance.dollarBalance = balance.clamBalance
    .times(usdRate)
    .plus(balance.sClamBalance.times(usdRate))
    .plus(balance.bondBalance.times(usdRate))
  balance.save()

  otter.lastBalance = balance.id
  otter.save()
}
