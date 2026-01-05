import * as _bsv_sdk from '@bsv/sdk';
import { WalletProtocol, WalletCounterparty, ScriptTemplate, WalletInterface, LockingScript, Transaction, UnlockingScript, Script, CreateActionOptions, CreateActionResult, WalletClient } from '@bsv/sdk';

/**
 * Parameters for deriving a public key from a BRC-100 wallet.
 */
type WalletDerivationParams = {
    protocolID: WalletProtocol;
    keyID: string;
    counterparty: WalletCounterparty;
};

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
     * Creates a 1Sat Ordinal + P2PKH locking script from a public key hash.
     *
     * @param params - Object containing pubkeyhash, inscription, and metadata
     * @returns A P2PKH locking script with ordinal inscription
     */
    lock(params: OrdinalLockWithPubkeyhash): Promise<LockingScript>;
    /**
     * Creates a 1Sat Ordinal + P2PKH locking script from a public key string.
     *
     * @param params - Object containing publicKey, inscription, and metadata
     * @returns A P2PKH locking script with ordinal inscription
     */
    lock(params: OrdinalLockWithPublicKey): Promise<LockingScript>;
    /**
     * Creates a 1Sat Ordinal + P2PKH locking script using the instance's BRC-100 wallet to derive the public key.
     *
     * @param params - Object containing walletParams, inscription, and metadata
     * @returns A P2PKH locking script with ordinal inscription
     */
    lock(params: OrdinalLockWithWallet): Promise<LockingScript>;
    /**
     * Creates a function that generates a P2PKH unlocking script using the instance's BRC-100 wallet.
     *
     * @param params - Named parameters object (see P2PKH.unlock for details)
     * @param params.protocolID - Protocol identifier for key derivation (default: [2, "p2pkh"])
     * @param params.keyID - Specific key identifier within the protocol (default: '0')
     * @param params.counterparty - The counterparty for which the key is being used (default: 'self')
     * @param params.signOutputs - The signature scope for outputs: 'all', 'none', or 'single' (default: 'all')
     * @param params.anyoneCanPay - Flag indicating if the signature allows for other inputs to be added later (default: false)
     * @param params.sourceSatoshis - Optional. The amount in satoshis being unlocked. Otherwise input.sourceTransaction is required.
     * @param params.lockingScript - Optional. The locking script being unlocked. Otherwise input.sourceTransaction is required.
     * @returns An object containing the `sign` and `estimateLength` functions
     */
    unlock(params?: OrdinalUnlockParams): {
        sign: (tx: Transaction, inputIndex: number) => Promise<UnlockingScript>;
        estimateLength: () => Promise<108>;
    };
}

/**
 * Parameters for P2PKH lock method with public key hash
 *
 * @property pubkeyhash - 20-byte public key hash array
 */
type P2PKHLockWithPubkeyhash = {
    /** 20-byte public key hash array */
    pubkeyhash: number[];
};
/**
 * Parameters for P2PKH lock method with public key
 *
 * @property publicKey - Public key as hex string
 */
type P2PKHLockWithPublicKey = {
    /** Public key as hex string */
    publicKey: string;
};
/**
 * Parameters for P2PKH lock method with wallet derivation
 *
 * @property walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
 */
type P2PKHLockWithWallet = {
    /** Wallet derivation parameters (protocolID, keyID, counterparty) */
    walletParams: WalletDerivationParams;
};
/**
 * Union type for all P2PKH lock parameter variations.
 * Use one of: pubkeyhash, publicKey, or walletParams.
 */
type P2PKHLockParams = P2PKHLockWithPubkeyhash | P2PKHLockWithPublicKey | P2PKHLockWithWallet;
/**
 * Parameters for P2PKH unlock method
 *
 * @property protocolID - Protocol identifier for key derivation (default: [2, "p2pkh"])
 * @property keyID - Specific key identifier within the protocol (default: '0')
 * @property counterparty - The counterparty for which the key is being used (default: 'self')
 * @property signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
 * @property anyoneCanPay - Allow other inputs to be added later (default: false)
 * @property sourceSatoshis - Optional amount in satoshis being unlocked
 * @property lockingScript - Optional locking script being unlocked
 */
type P2PKHUnlockParams = {
    /** Protocol identifier for key derivation (default: [2, "p2pkh"]) */
    protocolID?: WalletProtocol;
    /** Specific key identifier within the protocol (default: '0') */
    keyID?: string;
    /** The counterparty for which the key is being used (default: 'self') */
    counterparty?: WalletCounterparty;
    /** Signature scope: 'all', 'none', or 'single' (default: 'all') */
    signOutputs?: 'all' | 'none' | 'single';
    /** Allow other inputs to be added later (default: false) */
    anyoneCanPay?: boolean;
    /** Optional amount in satoshis being unlocked (otherwise requires sourceTransaction) */
    sourceSatoshis?: number;
    /** Optional locking script being unlocked (otherwise requires sourceTransaction) */
    lockingScript?: Script;
};
/**
 * Parameters for OrdP2PKH lock method with public key hash
 *
 * @property pubkeyhash - 20-byte public key hash array
 * @property inscription - Optional inscription data (dataB64, contentType)
 * @property metadata - Optional MAP metadata (app, type, and custom properties)
 */
type OrdinalLockWithPubkeyhash = {
    /** 20-byte public key hash array */
    pubkeyhash: number[];
    /** Optional inscription data with base64 file data and content type */
    inscription?: Inscription;
    /** Optional MAP metadata with app, type, and custom properties */
    metadata?: MAP;
};
/**
 * Parameters for OrdP2PKH lock method with public key
 *
 * @property publicKey - Public key as hex string
 * @property inscription - Optional inscription data (dataB64, contentType)
 * @property metadata - Optional MAP metadata (app, type, and custom properties)
 */
type OrdinalLockWithPublicKey = {
    /** Public key as hex string */
    publicKey: string;
    /** Optional inscription data with base64 file data and content type */
    inscription?: Inscription;
    /** Optional MAP metadata with app, type, and custom properties */
    metadata?: MAP;
};
/**
 * Parameters for OrdP2PKH lock method with wallet derivation
 *
 * @property walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
 * @property inscription - Optional inscription data (dataB64, contentType)
 * @property metadata - Optional MAP metadata (app, type, and custom properties)
 */
type OrdinalLockWithWallet = {
    /** Wallet derivation parameters (protocolID, keyID, counterparty) */
    walletParams: WalletDerivationParams;
    /** Optional inscription data with base64 file data and content type */
    inscription?: Inscription;
    /** Optional MAP metadata with app, type, and custom properties */
    metadata?: MAP;
};
/**
 * Union type for all OrdP2PKH lock parameter variations.
 * Use one of: pubkeyhash, publicKey, or walletParams.
 * Optionally include inscription and/or metadata for 1Sat Ordinals.
 */
type OrdinalLockParams = OrdinalLockWithPubkeyhash | OrdinalLockWithPublicKey | OrdinalLockWithWallet;
/**
 * Parameters for OrdP2PKH unlock method (same as {@link P2PKHUnlockParams})
 */
type OrdinalUnlockParams = P2PKHUnlockParams;

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
     * Creates a P2PKH locking script from a public key hash.
     *
     * @param params - Object containing pubkeyhash (20-byte array)
     * @returns A P2PKH locking script locked to the given public key hash
     */
    lock(params: P2PKHLockWithPubkeyhash): Promise<LockingScript>;
    /**
     * Creates a P2PKH locking script from a public key string.
     *
     * @param params - Object containing publicKey (hex string)
     * @returns A P2PKH locking script locked to the given public key
     */
    lock(params: P2PKHLockWithPublicKey): Promise<LockingScript>;
    /**
     * Creates a P2PKH locking script using the instance's BRC-100 wallet to derive the public key.
     *
     * @param params - Object containing walletParams (protocolID, keyID, counterparty)
     * @returns A P2PKH locking script locked to the wallet's public key
     */
    lock(params: P2PKHLockWithWallet): Promise<LockingScript>;
    /**
     * Creates a function that generates a P2PKH unlocking script using the instance's BRC-100 wallet.
     *
     * The returned object contains:
     * 1. `sign` - An async function that, when invoked with a transaction and an input index,
     *    produces an unlocking script suitable for a P2PKH locked output by using the wallet
     *    to create a signature following the BRC-29 pattern.
     * 2. `estimateLength` - A function that returns the estimated length of the unlocking script (108 bytes).
     *
     * @param params - Named parameters object
     * @param params.protocolID - Protocol identifier for key derivation (default: [2, "p2pkh"])
     * @param params.keyID - Specific key identifier within the protocol (default: '0')
     * @param params.counterparty - The counterparty for which the key is being used (default: 'self')
     * @param params.signOutputs - The signature scope for outputs: 'all', 'none', or 'single' (default: 'all')
     * @param params.anyoneCanPay - Flag indicating if the signature allows for other inputs to be added later (default: false)
     * @param params.sourceSatoshis - Optional. The amount in satoshis being unlocked. Otherwise input.sourceTransaction is required.
     * @param params.lockingScript - Optional. The locking script being unlocked. Otherwise input.sourceTransaction is required.
     * @returns An object containing the `sign` and `estimateLength` functions
     */
    unlock(params?: P2PKHUnlockParams): {
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
 * Parameters for adding a P2PKH output with a public key
 *
 * @property publicKey - Public key as hex string to lock the output to
 * @property satoshis - Amount in satoshis for this output
 * @property description - Optional description for tracking purposes
 */
type AddP2PKHOutputWithPublicKey = {
    /** Public key as hex string to lock the output to */
    publicKey: string;
    /** Amount in satoshis for this output */
    satoshis: number;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding a P2PKH output with wallet derivation
 *
 * @property walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
 * @property satoshis - Amount in satoshis for this output
 * @property description - Optional description for tracking purposes
 */
type AddP2PKHOutputWithWallet = {
    /** Wallet derivation parameters (protocolID, keyID, counterparty) */
    walletParams: WalletDerivationParams;
    /** Amount in satoshis for this output */
    satoshis: number;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding a P2PKH output with BRC-29 auto-derivation
 *
 * @property satoshis - Amount in satoshis for this output
 * @property description - Optional description for tracking purposes
 */
type AddP2PKHOutputWithAutoDerivation = {
    /** Amount in satoshis for this output */
    satoshis: number;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Union type for all P2PKH output parameter variations.
 * Use one of: publicKey, walletParams, or auto-derivation (empty params).
 */
type AddP2PKHOutputParams = AddP2PKHOutputWithPublicKey | AddP2PKHOutputWithWallet | AddP2PKHOutputWithAutoDerivation;
/**
 * Parameters for adding a change output with a public key
 *
 * @property publicKey - Public key as hex string to send change to
 * @property description - Optional description for tracking purposes
 */
type AddChangeOutputWithPublicKey = {
    /** Public key as hex string to send change to */
    publicKey: string;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding a change output with wallet derivation
 *
 * @property walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
 * @property description - Optional description for tracking purposes
 */
type AddChangeOutputWithWallet = {
    /** Wallet derivation parameters (protocolID, keyID, counterparty) */
    walletParams: WalletDerivationParams;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding a change output with BRC-29 auto-derivation
 *
 * @property description - Optional description for tracking purposes
 */
type AddChangeOutputWithAutoDerivation = {
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Union type for all change output parameter variations.
 * Use one of: publicKey, walletParams, or auto-derivation (empty params).
 * Amount is calculated automatically from remaining input satoshis.
 */
type AddChangeOutputParams = AddChangeOutputWithPublicKey | AddChangeOutputWithWallet | AddChangeOutputWithAutoDerivation;
/**
 * Parameters for adding an ordinal P2PKH output with a public key
 *
 * @property publicKey - Public key as hex string to lock the output to
 * @property satoshis - Amount in satoshis for this output (typically 1 for ordinals)
 * @property inscription - Optional inscription data (dataB64, contentType)
 * @property metadata - Optional MAP metadata (app, type, and custom properties)
 * @property description - Optional description for tracking purposes
 */
type AddOrdinalP2PKHOutputWithPublicKey = {
    /** Public key as hex string to lock the output to */
    publicKey: string;
    /** Amount in satoshis for this output (typically 1 for ordinals) */
    satoshis: number;
    /** Optional inscription data with base64 file data and content type */
    inscription?: Inscription;
    /** Optional MAP metadata with app, type, and custom properties */
    metadata?: MAP;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding an ordinal P2PKH output with wallet derivation
 *
 * @property walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
 * @property satoshis - Amount in satoshis for this output (typically 1 for ordinals)
 * @property inscription - Optional inscription data (dataB64, contentType)
 * @property metadata - Optional MAP metadata (app, type, and custom properties)
 * @property description - Optional description for tracking purposes
 */
type AddOrdinalP2PKHOutputWithWallet = {
    /** Wallet derivation parameters (protocolID, keyID, counterparty) */
    walletParams: WalletDerivationParams;
    /** Amount in satoshis for this output (typically 1 for ordinals) */
    satoshis: number;
    /** Optional inscription data with base64 file data and content type */
    inscription?: Inscription;
    /** Optional MAP metadata with app, type, and custom properties */
    metadata?: MAP;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding an ordinal P2PKH output with BRC-29 auto-derivation
 *
 * @property satoshis - Amount in satoshis for this output (typically 1 for ordinals)
 * @property inscription - Optional inscription data (dataB64, contentType)
 * @property metadata - Optional MAP metadata (app, type, and custom properties)
 * @property description - Optional description for tracking purposes
 */
type AddOrdinalP2PKHOutputWithAutoDerivation = {
    /** Amount in satoshis for this output (typically 1 for ordinals) */
    satoshis: number;
    /** Optional inscription data with base64 file data and content type */
    inscription?: Inscription;
    /** Optional MAP metadata with app, type, and custom properties */
    metadata?: MAP;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Union type for all ordinal P2PKH output parameter variations.
 * Use one of: publicKey, walletParams, or auto-derivation (empty params).
 * Optionally include inscription and/or metadata for 1Sat Ordinals.
 */
type AddOrdinalP2PKHOutputParams = AddOrdinalP2PKHOutputWithPublicKey | AddOrdinalP2PKHOutputWithWallet | AddOrdinalP2PKHOutputWithAutoDerivation;
/**
 * Parameters for adding a custom output with a specific locking script
 *
 * @property lockingScript - Custom locking script for this output
 * @property satoshis - Amount in satoshis for this output
 * @property description - Optional description for tracking purposes
 */
type AddCustomOutputParams = {
    /** Custom locking script for this output */
    lockingScript: LockingScript;
    /** Amount in satoshis for this output */
    satoshis: number;
    /** Optional description for tracking purposes */
    description?: string;
};
/**
 * Parameters for adding a P2PKH input to unlock a standard P2PKH output
 *
 * @property sourceTransaction - The transaction containing the output to spend
 * @property sourceOutputIndex - Index of the output to spend in the source transaction
 * @property walletParams - Optional wallet derivation parameters (protocolID, keyID, counterparty). If omitted, uses default P2PKH derivation.
 * @property description - Optional description for tracking purposes
 * @property signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
 * @property anyoneCanPay - Allow other inputs to be added later (default: false)
 * @property sourceSatoshis - Optional amount in satoshis being unlocked (otherwise requires sourceTransaction)
 * @property lockingScript - Optional locking script being unlocked (otherwise requires sourceTransaction)
 */
type AddP2PKHInputParams = {
    /** The transaction containing the output to spend */
    sourceTransaction: Transaction;
    /** Index of the output to spend in the source transaction */
    sourceOutputIndex: number;
    /** Optional wallet derivation parameters (protocolID, keyID, counterparty). If omitted, uses default P2PKH derivation. */
    walletParams?: WalletDerivationParams;
    /** Optional description for tracking purposes */
    description?: string;
    /** Signature scope: 'all', 'none', or 'single' (default: 'all') */
    signOutputs?: 'all' | 'none' | 'single';
    /** Allow other inputs to be added later (default: false) */
    anyoneCanPay?: boolean;
    /** Optional amount in satoshis being unlocked (otherwise requires sourceTransaction) */
    sourceSatoshis?: number;
    /** Optional locking script being unlocked (otherwise requires sourceTransaction) */
    lockingScript?: Script;
};
/**
 * Parameters for adding an ordinal P2PKH input to unlock a 1Sat Ordinal output
 *
 * @property sourceTransaction - The transaction containing the ordinal output to spend
 * @property sourceOutputIndex - Index of the ordinal output to spend in the source transaction
 * @property walletParams - Optional wallet derivation parameters (protocolID, keyID, counterparty). If omitted, uses default P2PKH derivation.
 * @property description - Optional description for tracking purposes
 * @property signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
 * @property anyoneCanPay - Allow other inputs to be added later (default: false)
 * @property sourceSatoshis - Optional amount in satoshis being unlocked (otherwise requires sourceTransaction)
 * @property lockingScript - Optional locking script being unlocked (otherwise requires sourceTransaction)
 */
type AddOrdinalP2PKHInputParams = {
    /** The transaction containing the ordinal output to spend */
    sourceTransaction: Transaction;
    /** Index of the ordinal output to spend in the source transaction */
    sourceOutputIndex: number;
    /** Optional wallet derivation parameters (protocolID, keyID, counterparty). If omitted, uses default P2PKH derivation. */
    walletParams?: WalletDerivationParams;
    /** Optional description for tracking purposes */
    description?: string;
    /** Signature scope: 'all', 'none', or 'single' (default: 'all') */
    signOutputs?: 'all' | 'none' | 'single';
    /** Allow other inputs to be added later (default: false) */
    anyoneCanPay?: boolean;
    /** Optional amount in satoshis being unlocked (otherwise requires sourceTransaction) */
    sourceSatoshis?: number;
    /** Optional locking script being unlocked (otherwise requires sourceTransaction) */
    lockingScript?: Script;
};
/**
 * Parameters for adding a custom input with a specific unlocking script template
 *
 * @property unlockingScriptTemplate - Custom unlocking script template (must implement ScriptTemplate interface)
 * @property sourceTransaction - The transaction containing the output to spend
 * @property sourceOutputIndex - Index of the output to spend in the source transaction
 * @property description - Optional description for tracking purposes
 * @property sourceSatoshis - Optional amount in satoshis being unlocked (otherwise requires sourceTransaction)
 * @property lockingScript - Optional locking script being unlocked (otherwise requires sourceTransaction)
 */
type AddCustomInputParams = {
    /** Custom unlocking script template (must implement ScriptTemplate interface) */
    unlockingScriptTemplate: any;
    /** The transaction containing the output to spend */
    sourceTransaction: Transaction;
    /** Index of the output to spend in the source transaction */
    sourceOutputIndex: number;
    /** Optional description for tracking purposes */
    description?: string;
    /** Optional amount in satoshis being unlocked (otherwise requires sourceTransaction) */
    sourceSatoshis?: number;
    /** Optional locking script being unlocked (otherwise requires sourceTransaction) */
    lockingScript?: Script;
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
     * @param params - Object containing input parameters
     * @returns A new InputBuilder for the new input
     */
    addP2PKHInput(params: AddP2PKHInputParams): InputBuilder;
    /**
     * Adds an ordinalP2PKH input to the transaction.
     *
     * @param params - Object containing input parameters
     * @returns A new InputBuilder for the new input
     */
    addOrdinalP2PKHInput(params: AddOrdinalP2PKHInputParams): InputBuilder;
    /**
     * Adds a custom input with a pre-built unlocking script template.
     *
     * @param params - Object containing input parameters
     * @returns A new InputBuilder for the new input
     */
    addCustomInput(params: AddCustomInputParams): InputBuilder;
    /**
     * Adds a P2PKH output to the transaction.
     *
     * @param params - Object with publicKey/walletParams, satoshis, and optional description
     * @returns A new OutputBuilder for the new output
     */
    addP2PKHOutput(params: AddP2PKHOutputParams): OutputBuilder;
    /**
     * Adds a change output that automatically calculates the change amount.
     *
     * @param params - Optional object with publicKey/walletParams and description
     * @returns A new OutputBuilder for the new output
     */
    addChangeOutput(params?: AddChangeOutputParams): OutputBuilder;
    /**
     * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
     *
     * @param params - Object with publicKey/walletParams, satoshis, and optional inscription, metadata, description
     * @returns A new OutputBuilder for the new output
     */
    addOrdinalP2PKHOutput(params: AddOrdinalP2PKHOutputParams): OutputBuilder;
    /**
     * Adds a custom output with a pre-built locking script.
     *
     * @param params - Object with lockingScript, satoshis, and optional description
     * @returns A new OutputBuilder for the new output
     */
    addCustomOutput(params: AddCustomOutputParams): OutputBuilder;
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
    /**
     * Preview the transaction without executing it (convenience proxy to TransactionTemplate).
     * Equivalent to calling build({ preview: true }).
     *
     * @returns Promise resolving to the createAction arguments object
     */
    preview(): Promise<any>;
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
     * @param params - Object with publicKey/walletParams, satoshis, and optional description
     * @returns A new OutputBuilder for the new output
     */
    addP2PKHOutput(params: AddP2PKHOutputParams): OutputBuilder;
    /**
     * Adds a change output that automatically calculates the change amount.
     *
     * @param params - Optional object with publicKey/walletParams and description
     * @returns A new OutputBuilder for the new output
     */
    addChangeOutput(params?: AddChangeOutputParams): OutputBuilder;
    /**
     * Adds a P2PKH input to the transaction.
     *
     * @param params - Object containing input parameters
     * @returns A new InputBuilder for the new input
     */
    addP2PKHInput(params: AddP2PKHInputParams): InputBuilder;
    /**
     * Adds an ordinalP2PKH input to the transaction.
     *
     * @param params - Object containing input parameters
     * @returns A new InputBuilder for the new input
     */
    addOrdinalP2PKHInput(params: AddOrdinalP2PKHInputParams): InputBuilder;
    /**
     * Adds a custom input with a pre-built unlocking script template.
     *
     * @param params - Object containing input parameters
     * @returns A new InputBuilder for the new input
     */
    addCustomInput(params: AddCustomInputParams): InputBuilder;
    /**
     * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
     *
     * @param params - Object with publicKey/walletParams, satoshis, and optional inscription, metadata, description
     * @returns A new OutputBuilder for the new output
     */
    addOrdinalP2PKHOutput(params: AddOrdinalP2PKHOutputParams): OutputBuilder;
    /**
     * Adds a custom output with a pre-built locking script.
     *
     * @param params - Object with lockingScript, satoshis, and optional description
     * @returns A new OutputBuilder for the new output
     */
    addCustomOutput(params: AddCustomOutputParams): OutputBuilder;
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
    /**
     * Preview the transaction without executing it (convenience proxy to TransactionTemplate).
     * Equivalent to calling build({ preview: true }).
     *
     * @returns Promise resolving to the createAction arguments object
     */
    preview(): Promise<any>;
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
     * @param params - Object containing input parameters
     * @param params.sourceTransaction - The source transaction containing the output to spend
     * @param params.sourceOutputIndex - The index of the output in the source transaction
     * @param params.walletParams - Optional wallet derivation parameters
     * @param params.description - Optional description for this input
     * @param params.signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param params.anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param params.sourceSatoshis - Optional amount in satoshis
     * @param params.lockingScript - Optional locking script
     * @returns An InputBuilder for the new input
     */
    addP2PKHInput(params: AddP2PKHInputParams): InputBuilder;
    /**
     * Adds an ordinalP2PKH input to the transaction.
     *
     * @param params - Object containing input parameters
     * @param params.sourceTransaction - The source transaction containing the output to spend
     * @param params.sourceOutputIndex - The index of the output in the source transaction
     * @param params.walletParams - Optional wallet derivation parameters
     * @param params.description - Optional description for this input
     * @param params.signOutputs - Signature scope: 'all', 'none', or 'single' (default: 'all')
     * @param params.anyoneCanPay - Allow other inputs to be added later (default: false)
     * @param params.sourceSatoshis - Optional amount in satoshis
     * @param params.lockingScript - Optional locking script
     * @returns An InputBuilder for the new input
     */
    addOrdinalP2PKHInput(params: AddOrdinalP2PKHInputParams): InputBuilder;
    /**
     * Adds a custom input with a pre-built unlocking script template.
     *
     * @param params - Object containing input parameters
     * @param params.unlockingScriptTemplate - The unlocking script template for this input
     * @param params.sourceTransaction - The source transaction containing the output to spend
     * @param params.sourceOutputIndex - The index of the output in the source transaction
     * @param params.description - Optional description for this input
     * @param params.sourceSatoshis - Optional amount in satoshis
     * @param params.lockingScript - Optional locking script
     * @returns An InputBuilder for the new input
     */
    addCustomInput(params: AddCustomInputParams): InputBuilder;
    /**
     * Adds a P2PKH output to the transaction.
     *
     * @param params - Object containing output parameters
     * @returns An OutputBuilder for configuring this output
     */
    addP2PKHOutput(params: AddP2PKHOutputParams): OutputBuilder;
    /**
     * Adds a change output to the transaction.
     *
     * @param params - Optional object containing output parameters
     * @returns An OutputBuilder for configuring this output
     */
    addChangeOutput(params?: AddChangeOutputParams): OutputBuilder;
    /**
     * Adds an ordinalP2PKH output to the transaction.
     *
     * @param params - Object containing output parameters
     * @returns An OutputBuilder for configuring this output
     */
    addOrdinalP2PKHOutput(params: AddOrdinalP2PKHOutputParams): OutputBuilder;
    /**
     * Adds a custom output with a pre-built locking script.
     *
     * This is useful for advanced use cases where you need to use a locking script
     * that isn't directly supported by the builder methods.
     *
     * @param params - Object containing lockingScript, satoshis, and optional description
     * @returns An OutputBuilder for configuring this output
     */
    addCustomOutput(params: AddCustomOutputParams): OutputBuilder;
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
    /**
     * Preview the transaction without executing it.
     * Equivalent to calling build({ preview: true }).
     *
     * @returns Promise resolving to the createAction arguments object
     */
    preview(): Promise<any>;
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

export { type AddChangeOutputParams, type AddChangeOutputWithAutoDerivation, type AddChangeOutputWithPublicKey, type AddChangeOutputWithWallet, type AddCustomInputParams, type AddCustomOutputParams, type AddOrdinalP2PKHInputParams, type AddOrdinalP2PKHOutputParams, type AddOrdinalP2PKHOutputWithAutoDerivation, type AddOrdinalP2PKHOutputWithPublicKey, type AddOrdinalP2PKHOutputWithWallet, type AddP2PKHInputParams, type AddP2PKHOutputParams, type AddP2PKHOutputWithAutoDerivation, type AddP2PKHOutputWithPublicKey, type AddP2PKHOutputWithWallet, type BuildParams, InputBuilder, type Inscription, type MAP, type OrdinalLockParams, type OrdinalLockWithPubkeyhash, type OrdinalLockWithPublicKey, type OrdinalLockWithWallet, type OrdinalUnlockParams, OutputBuilder, type P2PKHLockParams, type P2PKHLockWithPubkeyhash, type P2PKHLockWithPublicKey, type P2PKHLockWithWallet, type P2PKHUnlockParams, TransactionTemplate, type WalletDerivationParams, OrdP2PKH as WalletOrdP2PKH, P2PKH as WalletP2PKH, addOpReturnData, calculatePreimage, getDerivation, makeWallet };
