import { WalletProtocol, WalletCounterparty, ScriptTemplate, WalletInterface, LockingScript, Script, Transaction, UnlockingScript, WalletClient } from '@bsv/sdk';

/**
 * Parameters for deriving a public key from a BRC-100 wallet.
 */
type WalletDerivationParams = {
    protocolID: WalletProtocol;
    keyID: string;
    counterparty: WalletCounterparty;
};

/**
 * P2PKH (Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create Pay To Public Key Hash locking and unlocking scripts
 * using a BRC-100 compatible wallet interface instead of direct private key access.
 */
declare class P2PKH implements ScriptTemplate {
    wallet?: WalletInterface;
    /**
     * Creates a new P2PKH instance.
     *
     * @param wallet - Optional BRC-100 compatible wallet interface
     */
    constructor(wallet?: WalletInterface);
    /**
     * Creates a P2PKH locking script from a public key or public key hash.
     *
     * @param pubkeyhash - Either a hex string of the public key or a number array of the public key hash (20 bytes)
     * @returns A P2PKH locking script locked to the given public key hash
     */
    lock(pubkeyhash: string | number[]): Promise<LockingScript>;
    /**
     * Creates a P2PKH locking script using the instance's BRC-100 wallet to derive the public key.
     *
     * @param walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
     * @returns A P2PKH locking script locked to the wallet's public key
     */
    lock(walletParams: WalletDerivationParams): Promise<LockingScript>;
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
    unlock(protocolID?: WalletProtocol, keyID?: string, counterparty?: WalletCounterparty, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): {
        sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
        estimateLength: () => Promise<108>;
    };
}

type Inscription = {
    dataB64: string;
    contentType: string;
};
type MAP = {
    app: string;
    type: string;
    [prop: string]: string;
};
/**
 * OrdP2PKH (1Sat Ordinal + Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create Pay To Public Key Hash locking scripts with 1Sat Ordinal
 * inscriptions and MAP metadata using a BRC-100 compatible wallet interface.
 */
declare class OrdP2PKH implements ScriptTemplate {
    private p2pkh;
    /**
     * Creates a new OrdP2PKH instance.
     *
     * @param wallet - Optional BRC-100 compatible wallet interface
     */
    constructor(wallet?: WalletInterface);
    /**
     * Creates a 1Sat Ordinal + P2PKH locking script from a public key or public key hash.
     *
     * @param pubkeyhash - Either a hex string of the public key or a number array of the public key hash (20 bytes)
     * @param inscription - Optional inscription data (base64 file data and content type)
     * @param metaData - Optional MAP metadata (requires app and type fields)
     * @returns A P2PKH locking script with ordinal inscription
     */
    lock(pubkeyhash: string | number[], inscription?: Inscription, metaData?: MAP): Promise<LockingScript>;
    /**
     * Creates a 1Sat Ordinal + P2PKH locking script using the instance's BRC-100 wallet to derive the public key.
     *
     * @param walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
     * @param inscription - Optional inscription data (base64 file data and content type)
     * @param metaData - Optional MAP metadata (requires app and type fields)
     * @returns A P2PKH locking script with ordinal inscription
     */
    lock(walletParams: WalletDerivationParams, inscription?: Inscription, metaData?: MAP): Promise<LockingScript>;
    /**
     * Creates a function that generates a P2PKH unlocking script using the instance's BRC-100 wallet.
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
    unlock(protocolID?: WalletProtocol, keyID?: string, counterparty?: WalletCounterparty, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): {
        sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
        estimateLength: () => Promise<108>;
    };
}

/**
 * Wallet creation utilities for BSV blockchain
 * Based on BSV wallet-toolbox-client
 */

/**
 * Creates a test wallet for blockchain testing
 *
 * @param chain - Blockchain network ('test' or 'main')
 * @param storageURL - Storage provider URL
 * @param privateKey - Private key as hex string
 * @returns WalletClient instance (cast from WalletInterface)
 * @throws Error if parameters are invalid or wallet creation fails
 */
declare function makeWallet(chain: 'test' | 'main', storageURL: string, privateKey: string): Promise<WalletClient>;

declare function calculatePreimage(tx: Transaction, inputIndex: number, signOutputs: "all" | "none" | "single", anyoneCanPay: boolean, sourceSatoshis?: number, lockingScript?: Script): {
    preimage: number[];
    signatureScope: number;
};

/**
 * Appends OP_RETURN data fields to a locking script for adding metadata.
 *
 * @param script - The base locking script to append OP_RETURN data to
 * @param fields - Array of data fields. Each field can be:
 *                 - UTF-8 string (auto-converted to hex)
 *                 - Hex string (detected and preserved)
 *                 - Byte array (converted to hex)
 * @returns A new locking script with the OP_RETURN data appended
 * @throws Error if no fields are provided
 *
 * @see README.md for usage examples
 * @see __tests__/opreturn.test.ts for additional examples
 */
declare const addOpReturnData: (script: LockingScript, fields: (string | number[])[]) => LockingScript;

export { type Inscription, type MAP, type WalletDerivationParams, OrdP2PKH as WalletOrdP2PKH, P2PKH as WalletP2PKH, addOpReturnData, calculatePreimage, makeWallet };
