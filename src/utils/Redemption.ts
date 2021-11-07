import { Address } from '@graphprotocol/graph-ts'
import { Redemption } from '../../generated/schema'

export function loadOrCreateRedemption(address: Address): Redemption {
  let redemption = Redemption.load(address.toHex())
  if (redemption == null) {
    redemption = new Redemption(address.toHex())
    redemption.save()
  }
  return redemption as Redemption
}
