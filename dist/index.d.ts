import * as _bsv_sdk from '@bsv/sdk';
import { WalletProtocol, WalletCounterparty, ScriptTemplate, WalletInterface, LockingScript, Script, Transaction, UnlockingScript, CreateActionOptions, CreateActionResult, WalletClient } from '@bsv/sdk';

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
 * Parameters for the build() method
 */
interface BuildParams {
    /** If true, returns the createAction arguments without executing the transaction */
    preview?: boolean;
}
/**
 * Configuration for a transaction input
 */
type InputConfig = {
    type: 'p2pkh';
    sourceTransaction: Transaction;
    sourceOutputIndex: number;
    description?: string;
    walletParams?: WalletDerivationParams;
    signOutputs?: 'all' | 'none' | 'single';
    anyoneCanPay?: boolean;
    sourceSatoshis?: number;
    lockingScript?: Script;
} | {
    type: 'ordinalP2PKH';
    sourceTransaction: Transaction;
    sourceOutputIndex: number;
    description?: string;
    walletParams?: WalletDerivationParams;
    signOutputs?: 'all' | 'none' | 'single';
    anyoneCanPay?: boolean;
    sourceSatoshis?: number;
    lockingScript?: Script;
} | {
    type: 'custom';
    sourceTransaction: Transaction;
    sourceOutputIndex: number;
    description?: string;
    unlockingScriptTemplate: any;
    sourceSatoshis?: number;
    lockingScript?: Script;
};
/**
 * Configuration for a transaction output
 */
type OutputConfig = {
    type: 'p2pkh';
    satoshis: number;
    description?: string;
    addressOrParams?: string | WalletDerivationParams;
    opReturnFields?: (string | number[])[];
    basket?: string;
    customInstructions?: string;
} | {
    type: 'ordinalP2PKH';
    satoshis: number;
    description?: string;
    addressOrParams?: string | WalletDerivationParams;
    inscription?: Inscription;
    metadata?: MAP;
    opReturnFields?: (string | number[])[];
    basket?: string;
    customInstructions?: string;
} | {
    type: 'custom';
    satoshis: number;
    description?: string;
    lockingScript: LockingScript;
    opReturnFields?: (string | number[])[];
    basket?: string;
    customInstructions?: string;
} | {
    type: 'change';
    satoshis?: number;
    description?: string;
    addressOrParams?: string | WalletDerivationParams;
    opReturnFields?: (string | number[])[];
    basket?: string;
    customInstructions?: string;
};
/**
 * Builder class for configuring individual transaction inputs.
 *
 * This class allows you to chain methods to add more inputs/outputs or
 * access transaction-level methods like build().
 */
declare class InputBuilder {
    private parent;
    private inputConfig;
    constructor(parent: TransactionTemplate, inputConfig: InputConfig);
    /**
     * Sets the description for THIS input only.
     *
     * @param desc - Description for this specific input
     * @returns This InputBuilder for further input configuration
     */
    inputDescription(desc: string): this;
    /**
     * Adds a P2PKH input to the transaction.
     *
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param walletParams - Optional wallet derivation parameters
     * @param description - Optional description for this input
     * @param signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional amount in satoshis
     * @param lockingScript - Optional locking script
     * @returns A new InputBuilder for the new input
     */
    addP2PKHInput(sourceTransaction: Transaction, sourceOutputIndex: number, walletParams?: WalletDerivationParams, description?: string, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds an ordinalP2PKH input to the transaction.
     *
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param walletParams - Optional wallet derivation parameters
     * @param description - Optional description for this input
     * @param signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional amount in satoshis
     * @param lockingScript - Optional locking script
     * @returns A new InputBuilder for the new input
     */
    addOrdinalP2PKHInput(sourceTransaction: Transaction, sourceOutputIndex: number, walletParams?: WalletDerivationParams, description?: string, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds a custom input with a pre-built unlocking script template.
     *
     * @param unlockingScriptTemplate - The unlocking script template for this input
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param description - Optional description for this input
     * @param sourceSatoshis - Optional amount in satoshis
     * @param lockingScript - Optional locking script
     * @returns A new InputBuilder for the new input
     */
    addCustomInput(unlockingScriptTemplate: any, sourceTransaction: Transaction, sourceOutputIndex: number, description?: string, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds a P2PKH output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addP2PKHOutput(addressOrParams: string | WalletDerivationParams, satoshis: number, description?: string): OutputBuilder;
    /**
     * Adds a change output that automatically calculates the change amount.
     *
     * @param addressOrParams - Public key hex or wallet derivation parameters
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addChangeOutput(addressOrParams: string | WalletDerivationParams, description?: string): OutputBuilder;
    /**
     * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters
     * @param satoshis - Amount in satoshis for this output (typically 1 for ordinals)
     * @param inscription - Optional inscription data (dataB64, contentType)
     * @param metadata - Optional MAP metadata (app, type, and custom properties)
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addOrdinalP2PKHOutput(addressOrParams: string | WalletDerivationParams, satoshis: number, inscription?: Inscription, metadata?: MAP, description?: string): OutputBuilder;
    /**
     * Adds a custom output with a pre-built locking script.
     *
     * @param lockingScript - The locking script for this output
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addCustomOutput(lockingScript: LockingScript, satoshis: number, description?: string): OutputBuilder;
    /**
     * Sets transaction-level options (convenience proxy to TransactionTemplate).
     *
     * @param opts - Transaction options (randomizeOutputs, etc.)
     * @returns The parent TransactionTemplate for transaction-level chaining
     */
    options(opts: CreateActionOptions): TransactionTemplate;
    /**
     * Builds the transaction using wallet.createAction() (convenience proxy to TransactionTemplate).
     *
     * @param params - Build parameters (optional)
     * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
     */
    build(params?: BuildParams): Promise<CreateActionResult | any>;
}
/**
 * Builder class for configuring individual transaction outputs.
 *
 * This class allows you to chain methods to configure a specific output,
 * such as adding OP_RETURN data. It also allows adding more outputs or
 * accessing transaction-level methods like build().
 */
declare class OutputBuilder {
    private parent;
    private outputConfig;
    constructor(parent: TransactionTemplate, outputConfig: OutputConfig);
    /**
     * Adds OP_RETURN data to THIS output only.
     *
     * @param fields - Array of data fields. Each field can be a UTF-8 string, hex string, or byte array
     * @returns This OutputBuilder for further output configuration
     */
    addOpReturn(fields: (string | number[])[]): this;
    /**
     * Sets the basket for THIS output only.
     *
     * @param value - Basket name/identifier
     * @returns This OutputBuilder for further output configuration
     */
    basket(value: string): this;
    /**
     * Sets custom instructions for THIS output only.
     *
     * @param value - Custom instructions (typically JSON string)
     * @returns This OutputBuilder for further output configuration
     */
    customInstructions(value: string): this;
    /**
     * Adds a P2PKH output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addP2PKHOutput(addressOrParams: string | WalletDerivationParams | undefined, satoshis: number, description?: string): OutputBuilder;
    /**
     * Adds a change output that automatically calculates the change amount.
     *
     * @param addressOrParams - Public key hex or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addChangeOutput(addressOrParams?: string | WalletDerivationParams, description?: string): OutputBuilder;
    /**
     * Adds a P2PKH input to the transaction.
     *
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param walletParams - Optional wallet derivation parameters (defaults to BRC-29 derivation scheme with counterparty 'self')
     * @param description - Optional description for this input
     * @param signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional amount in satoshis (otherwise requires sourceTransaction)
     * @param lockingScript - Optional locking script (otherwise requires sourceTransaction)
     * @returns A new InputBuilder for the new input
     */
    addP2PKHInput(sourceTransaction: Transaction, sourceOutputIndex: number, walletParams?: WalletDerivationParams, description?: string, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds an ordinalP2PKH input to the transaction.
     *
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param walletParams - Optional wallet derivation parameters (defaults to BRC-29 derivation scheme with counterparty 'self')
     * @param description - Optional description for this input
     * @param signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional amount in satoshis (otherwise requires sourceTransaction)
     * @param lockingScript - Optional locking script (otherwise requires sourceTransaction)
     * @returns A new InputBuilder for the new input
     */
    addOrdinalP2PKHInput(sourceTransaction: Transaction, sourceOutputIndex: number, walletParams?: WalletDerivationParams, description?: string, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds a custom input with a pre-built unlocking script template.
     *
     * @param unlockingScriptTemplate - The unlocking script template for this input
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param description - Optional description for this input
     * @param sourceSatoshis - Optional amount in satoshis
     * @param lockingScript - Optional locking script
     * @returns A new InputBuilder for the new input
     */
    addCustomInput(unlockingScriptTemplate: any, sourceTransaction: Transaction, sourceOutputIndex: number, description?: string, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters
     * @param satoshis - Amount in satoshis for this output (typically 1 for ordinals)
     * @param inscription - Optional inscription data (dataB64, contentType)
     * @param metadata - Optional MAP metadata (app, type, and custom properties)
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addOrdinalP2PKHOutput(addressOrParams: string | WalletDerivationParams, satoshis: number, inscription?: Inscription, metadata?: MAP, description?: string): OutputBuilder;
    /**
     * Adds a custom output with a pre-built locking script.
     *
     * @param lockingScript - The locking script for this output
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addCustomOutput(lockingScript: LockingScript, satoshis: number, description?: string): OutputBuilder;
    /**
     * Sets the description for THIS output only.
     *
     * @param desc - Description for this specific output
     * @returns This OutputBuilder for further output configuration
     */
    outputDescription(desc: string): this;
    /**
     * Sets transaction-level options (convenience proxy to TransactionTemplate).
     *
     * @param opts - Transaction options (randomizeOutputs, etc.)
     * @returns The parent TransactionTemplate for transaction-level chaining
     */
    options(opts: CreateActionOptions): TransactionTemplate;
    /**
     * Builds the transaction using wallet.createAction() (convenience proxy to TransactionTemplate).
     *
     * @param params - Build parameters (optional)
     * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
     */
    build(params?: BuildParams): Promise<CreateActionResult | any>;
}
/**
 * TransactionTemplate - Builder class for creating BSV transactions with fluent API.
 *
 * This class provides a chainable interface for building transactions with multiple
 * outputs, metadata, and wallet integration. It simplifies the process of creating
 * transactions by abstracting away the low-level details of locking scripts and
 * wallet interactions.
 */
declare class TransactionTemplate {
    private wallet;
    private _transactionDescription?;
    private inputs;
    private outputs;
    private transactionOptions;
    /**
     * Creates a new TransactionTemplate builder.
     *
     * @param wallet - BRC-100 compatible wallet interface for signing and key derivation
     * @param description - Optional description for the entire transaction
     */
    constructor(wallet: WalletInterface, description?: string);
    /**
     * Sets the transaction-level description.
     *
     * @param desc - Description for the entire transaction
     * @returns This TransactionTemplate for further chaining
     */
    transactionDescription(desc: string): this;
    /**
     * Sets transaction-level options.
     *
     * @param opts - Transaction options (randomizeOutputs, trustSelf, signAndProcess, etc.)
     * @returns This TransactionTemplate for further chaining
     */
    options(opts: CreateActionOptions): this;
    /**
     * Adds a P2PKH input to the transaction.
     *
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param walletParams - Optional wallet derivation parameters (defaults to BRC-29 derivation scheme with counterparty 'self')
     * @param description - Optional description for this input
     * @param signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional amount in satoshis (otherwise requires sourceTransaction)
     * @param lockingScript - Optional locking script (otherwise requires sourceTransaction)
     * @returns An InputBuilder for the new input
     */
    addP2PKHInput(sourceTransaction: Transaction, sourceOutputIndex: number, walletParams?: WalletDerivationParams, description?: string, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds an ordinalP2PKH input to the transaction.
     *
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param walletParams - Optional wallet derivation parameters (defaults to BRC-29 derivation scheme with counterparty 'self')
     * @param description - Optional description for this input
     * @param signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param sourceSatoshis - Optional amount in satoshis (otherwise requires sourceTransaction)
     * @param lockingScript - Optional locking script (otherwise requires sourceTransaction)
     * @returns An InputBuilder for the new input
     */
    addOrdinalP2PKHInput(sourceTransaction: Transaction, sourceOutputIndex: number, walletParams?: WalletDerivationParams, description?: string, signOutputs?: 'all' | 'none' | 'single', anyoneCanPay?: boolean, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds a custom input with a pre-built unlocking script template.
     *
     * @param unlockingScriptTemplate - The unlocking script template for this input
     * @param sourceTransaction - The source transaction containing the output to spend
     * @param sourceOutputIndex - The index of the output in the source transaction
     * @param description - Optional description for this input
     * @param sourceSatoshis - Optional amount in satoshis
     * @param lockingScript - Optional locking script
     * @returns An InputBuilder for the new input
     */
    addCustomInput(unlockingScriptTemplate: any, sourceTransaction: Transaction, sourceOutputIndex: number, description?: string, sourceSatoshis?: number, lockingScript?: Script): InputBuilder;
    /**
     * Adds a P2PKH (Pay To Public Key Hash) output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns An OutputBuilder for configuring this output (e.g., adding OP_RETURN)
     */
    addP2PKHOutput(addressOrParams: string | WalletDerivationParams | undefined, satoshis: number, description?: string): OutputBuilder;
    /**
     * Adds a change output that automatically calculates the change amount during transaction signing.
     *
     * The satoshi amount is calculated as: inputs - outputs - fees
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param description - Optional description for this output (default: "Change")
     * @returns An OutputBuilder for configuring this output (e.g., adding OP_RETURN)
     */
    addChangeOutput(addressOrParams?: string | WalletDerivationParams, description?: string): OutputBuilder;
    /**
     * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param satoshis - Amount in satoshis for this output (typically 1 for ordinals)
     * @param inscription - Optional inscription data with base64 file data and content type
     * @param metadata - Optional MAP metadata with app, type, and custom properties
     * @param description - Optional description for this output
     * @returns An OutputBuilder for configuring this output (e.g., adding OP_RETURN)
     */
    addOrdinalP2PKHOutput(addressOrParams: string | WalletDerivationParams | undefined, satoshis: number, inscription?: Inscription, metadata?: MAP, description?: string): OutputBuilder;
    /**
     * Adds a custom output with a pre-built locking script.
     *
     * This is useful for advanced use cases where you need to use a locking script
     * that isn't directly supported by the builder methods.
     *
     * @param lockingScript - The locking script for this output
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns An OutputBuilder for configuring this output
     */
    addCustomOutput(lockingScript: LockingScript, satoshis: number, description?: string): OutputBuilder;
    /**
     * Builds the transaction using wallet.createAction().
     *
     * This method creates locking scripts for all outputs, applies OP_RETURN metadata
     * where specified, calls wallet.createAction() with all outputs and options, and
     * returns the transaction ID and transaction object.
     *
     * @param params - Build parameters (optional). Use { preview: true } to return the createAction arguments without executing
     * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
     * @throws Error if no outputs are configured or if locking script creation fails
     */
    build(params?: BuildParams): Promise<CreateActionResult | any>;
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

declare function getDerivation(): {
    protocolID: _bsv_sdk.WalletProtocol;
    keyID: string;
};

export { type BuildParams, InputBuilder, type Inscription, type MAP, OutputBuilder, TransactionTemplate, type WalletDerivationParams, OrdP2PKH as WalletOrdP2PKH, P2PKH as WalletP2PKH, addOpReturnData, calculatePreimage, getDerivation, makeWallet };
