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
        if (typeof pubkeyhashOrWalletParams === 'string' || Array.isArray(pubkeyhashOrWalletParams)) {
            // Use pubkeyhash directly
            if (typeof pubkeyhashOrWalletParams === 'string') {
                // If it's a hex string, treat it as a public key and hash it
                const pubKeyToHash = PublicKey.fromString(pubkeyhashOrWalletParams)
                const hash = pubKeyToHash.toHash() as number[]
                data = hash
            } else {
                // If it's already a byte array, use it as the hash
                data = pubkeyhashOrWalletParams
            }
        } else if (pubkeyhashOrWalletParams) {
            // Use wallet to derive public key
            if (!this.wallet) {
                throw new Error('Wallet is required when using wallet derivation parameters')
            }
            const { protocolID, keyID, counterparty } = pubkeyhashOrWalletParams
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

        // Validate the resulting hash
        if (!data) {
            throw new Error('Failed to generate public key hash')
        }
        if (data.length !== 20) {
            throw new Error('P2PKH hash length must be 20 bytes')
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