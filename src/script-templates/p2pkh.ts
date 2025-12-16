import {
    LockingScript,
    ScriptTemplate,
    Transaction,
    UnlockingScript,
    Hash,
    OP,
    WalletInterface,
    Script,
    TransactionSignature,
    Signature,
    PublicKey,
    WalletProtocol,
    WalletCounterparty,
} from "@bsv/sdk";
import { calculatePreimage } from "../utils/createPreimage";
import { WalletDerivationParams } from "../types/wallet";

/**
 * Validates wallet derivation parameters at runtime
 */
function validateWalletDerivationParams(params: any, paramName: string = 'parameters'): void {
    if (!params || typeof params !== 'object') {
        throw new Error(`Invalid ${paramName}: must be an object with protocolID and keyID`);
    }
    if (!params.protocolID) {
        throw new Error(`Invalid ${paramName}: protocolID is required`);
    }
    if (!Array.isArray(params.protocolID) || params.protocolID.length !== 2) {
        throw new Error(`Invalid ${paramName}: protocolID must be an array of [number, string]`);
    }
    if (typeof params.protocolID[0] !== 'number' || typeof params.protocolID[1] !== 'string') {
        throw new Error(`Invalid ${paramName}: protocolID must be [number, string]`);
    }
    if (params.keyID === undefined || params.keyID === null) {
        throw new Error(`Invalid ${paramName}: keyID is required`);
    }
    if (typeof params.keyID !== 'string') {
        throw new Error(`Invalid ${paramName}: keyID must be a string`);
    }
    // counterparty is optional, defaults to 'self'
    if (params.counterparty !== undefined && typeof params.counterparty !== 'string') {
        throw new Error(`Invalid ${paramName}: counterparty must be a string (or omit for default "self")`);
    }
}

/**
 * P2PKH (Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create Pay To Public Key Hash locking and unlocking scripts
 * using a BRC-100 compatible wallet interface instead of direct private key access.
 */
export default class P2PKH implements ScriptTemplate {
    wallet?: WalletInterface

    /**
     * Creates a new P2PKH instance.
     *
     * @param wallet - Optional BRC-100 compatible wallet interface
     */
    constructor(wallet?: WalletInterface) {
        this.wallet = wallet
    }

    /**
     * Creates a P2PKH locking script from a public key or public key hash.
     *
     * @param pubkeyhash - Either a hex string of the public key or a number array of the public key hash (20 bytes)
     * @returns A P2PKH locking script locked to the given public key hash
     */
    lock(pubkeyhash: string | number[]): Promise<LockingScript>
    /**
     * Creates a P2PKH locking script using the instance's BRC-100 wallet to derive the public key.
     *
     * @param walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
     * @returns A P2PKH locking script locked to the wallet's public key
     */
    lock(walletParams: WalletDerivationParams): Promise<LockingScript>
    async lock(
        pubkeyhashOrWalletParams: string | number[] | WalletDerivationParams
    ): Promise<LockingScript> {
        let data: number[] | undefined

        // Validate that at least one input method is provided
        if (!pubkeyhashOrWalletParams && !this.wallet) {
            throw new Error('pubkeyhash or wallet is required')
        }

        // Check if using direct pubkeyhash or wallet derivation
        if (typeof pubkeyhashOrWalletParams === 'string') {
            // Use public key string directly
            const pubKeyToHash = PublicKey.fromString(pubkeyhashOrWalletParams)
            const hash = pubKeyToHash.toHash() as number[]
            data = hash
        } else if (Array.isArray(pubkeyhashOrWalletParams)) {
            // Use byte array as hash directly
            data = pubkeyhashOrWalletParams
        } else if (pubkeyhashOrWalletParams) {
            // Use wallet to derive public key - validate params
            validateWalletDerivationParams(pubkeyhashOrWalletParams, 'wallet derivation parameters')

            if (!this.wallet) {
                throw new Error('Wallet is required when using wallet derivation parameters')
            }
            const { protocolID, keyID, counterparty = 'self' } = pubkeyhashOrWalletParams
            const { publicKey } = await this.wallet.getPublicKey({
                protocolID,
                keyID,
                counterparty
            })
            const pubKeyToHash = PublicKey.fromString(publicKey)
            data = pubKeyToHash.toHash() as number[]
        } else {
            // No params provided, try to use wallet with defaults
            if (!this.wallet) {
                throw new Error('pubkeyhash or wallet is required')
            }
            const { publicKey } = await this.wallet.getPublicKey({
                protocolID: [2, "p2pkh"],
                keyID: '0',
                counterparty: 'self'
            })
            const pubKeyToHash = PublicKey.fromString(publicKey)
            data = pubKeyToHash.toHash() as number[]
        }

        // Final validation
        if (!data || data.length !== 20) {
            throw new Error('Failed to generate valid public key hash (must be 20 bytes)')
        }

        // Build the standard P2PKH locking script
        return new LockingScript([
            { op: OP.OP_DUP },
            { op: OP.OP_HASH160 },
            { op: data.length, data },
            { op: OP.OP_EQUALVERIFY },
            { op: OP.OP_CHECKSIG }
        ])
    }

    /**
     * Creates a function that generates a P2PKH unlocking script using the instance's BRC-100 wallet.
     *
     * The returned object contains:
     * 1. `sign` - An async function that, when invoked with a transaction and an input index,
     *    produces an unlocking script suitable for a P2PKH locked output by using the wallet
     *    to create a signature following the BRC-29 pattern.
     * 2. `estimateLength` - A function that returns the estimated length of the unlocking script (108 bytes).
     *
     * @param protocolID - Protocol identifier for key derivation (default: [2, "p2pkh"])
     * @param keyID - Specific key identifier within the protocol (default: '0')
     * @param counterparty - The counterparty for which the key is being used (default: 'self')
     * @param signOutputs - The signature scope for outputs: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Flag indicating if the signature allows for other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional. The amount in satoshis being unlocked. Otherwise input.sourceTransaction is required.
     * @param lockingScript - Optional. The locking script being unlocked. Otherwise input.sourceTransaction is required.
     * @returns An object containing the `sign` and `estimateLength` functions
     */
    unlock(
        protocolID: WalletProtocol = [2, "p2pkh"],
        keyID: string = '0',
        counterparty: WalletCounterparty = 'self',
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): {
        sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>
        estimateLength: () => Promise<108>
    } {
        if (!this.wallet) {
            throw new Error('Wallet is required for unlocking')
        }

        // Validate parameters
        if (!Array.isArray(protocolID) || protocolID.length !== 2) {
            throw new Error('protocolID must be an array of [number, string]')
        }
        if (typeof keyID !== 'string') {
            throw new Error('keyID must be a string')
        }
        if (counterparty !== undefined && typeof counterparty !== 'string') {
            throw new Error('counterparty must be a string (or omit for default "self")')
        }
        if (!['all', 'none', 'single'].includes(signOutputs)) {
            throw new Error('signOutputs must be "all", "none", or "single"')
        }
        if (typeof anyoneCanPay !== 'boolean') {
            throw new Error('anyoneCanPay must be a boolean')
        }

        const wallet = this.wallet

        return {
            sign: async (tx: Transaction, inputIndex: number) => {
                // Calculate the transaction preimage according to Bitcoin's signature algorithm
                const { preimage, signatureScope } = calculatePreimage(tx, inputIndex, signOutputs, anyoneCanPay, sourceSatoshis, lockingScript);

                // Use the BRC-29 wallet pattern to create a signature over the double-SHA256 hash of the preimage
                const { signature } = await wallet.createSignature({
                    hashToDirectlySign: Hash.hash256(preimage),
                    protocolID,
                    keyID,
                    counterparty
                })

                // Retrieve the public key from the wallet for the same key used to sign
                const { publicKey } = await wallet.getPublicKey({
                    protocolID,
                    keyID,
                    counterparty
                })

                // Convert the DER-encoded signature to a TransactionSignature with the proper signature scope
                const rawSignature = Signature.fromDER(signature, 'hex')
                const sig = new TransactionSignature(
                    rawSignature.r,
                    rawSignature.s,
                    signatureScope
                );

                // Format the signature and public key for the unlocking script
                const sigForScript = sig.toChecksigFormat()
                const pubkeyForScript = PublicKey.fromString(publicKey).encode(true) as number[]

                // Build the P2PKH unlocking script: <signature> <publicKey>
                return new UnlockingScript([
                    { op: sigForScript.length, data: sigForScript },
                    { op: pubkeyForScript.length, data: pubkeyForScript }
                ])
            },
            estimateLength: async () => {
                // public key (1+33) + signature (1+73)
                // Note: We add 1 to each element's length because of the associated OP_PUSH
                return 108
            }
        }
    }
}