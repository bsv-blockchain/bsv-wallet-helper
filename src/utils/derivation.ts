import { brc29ProtocolID } from '@bsv/wallet-toolbox-client'
import { Random, Utils } from '@bsv/sdk'

export function getDerivation() {
    const derivationPrefix = Utils.toBase64(Random(8))
    const derivationSuffix = Utils.toBase64(Random(8))
    return {
        protocolID: brc29ProtocolID,
        keyID: derivationPrefix + ' ' + derivationSuffix
    }
}