import {
    WalletInterface,
    LockingScript,
    Transaction,
    CreateActionOutput,
    CreateActionInput,
    CreateActionOptions,
    CreateActionResult,
    WalletProtocol,
    WalletCounterparty,
    Script,
    SatoshisPerKilobyte,
    Beef
} from "@bsv/sdk";
import P2PKH from "../script-templates/p2pkh";
import OrdP2PKH, { Inscription, MAP } from "../script-templates/ordinal";
import { WalletDerivationParams } from "../types/wallet";
import { getDerivation } from "../utils";
import { addOpReturnData } from "../utils/opreturn";
import { DEFAULT_SAT_PER_KB } from "../utils/constants";
import { BuildParams, InputConfig, OutputConfig, isDerivationParams } from "./types";

/**
 * Builder class for configuring individual transaction inputs.
 *
 * This class allows you to chain methods to add more inputs/outputs or
 * access transaction-level methods like build().
 */
export class InputBuilder {
    constructor(
        private parent: TransactionTemplate,
        private inputConfig: InputConfig
    ) { }

    /**
     * Sets the description for THIS input only.
     *
     * @param desc - Description for this specific input
     * @returns This InputBuilder for further input configuration
     */
    inputDescription(desc: string): this {
        if (typeof desc !== 'string') {
            throw new Error('Input description must be a string');
        }
        this.inputConfig.description = desc;
        return this;
    }

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
    addP2PKHInput(
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        walletParams?: WalletDerivationParams,
        description?: string,
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        return this.parent.addP2PKHInput(
            sourceTransaction,
            sourceOutputIndex,
            walletParams,
            description,
            signOutputs,
            anyoneCanPay,
            sourceSatoshis,
            lockingScript
        );
    }

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
    addOrdinalP2PKHInput(
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        walletParams?: WalletDerivationParams,
        description?: string,
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        return this.parent.addOrdinalP2PKHInput(
            sourceTransaction,
            sourceOutputIndex,
            walletParams,
            description,
            signOutputs,
            anyoneCanPay,
            sourceSatoshis,
            lockingScript
        );
    }

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
    addCustomInput(
        unlockingScriptTemplate: any,
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        description?: string,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        return this.parent.addCustomInput(
            unlockingScriptTemplate,
            sourceTransaction,
            sourceOutputIndex,
            description,
            sourceSatoshis,
            lockingScript
        );
    }

    /**
     * Adds a P2PKH output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addP2PKHOutput(
        addressOrParams: string | WalletDerivationParams,
        satoshis: number,
        description?: string
    ): OutputBuilder {
        return this.parent.addP2PKHOutput(addressOrParams, satoshis, description);
    }

    /**
     * Adds a change output that automatically calculates the change amount.
     *
     * @param addressOrParams - Public key hex or wallet derivation parameters
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addChangeOutput(
        addressOrParams: string | WalletDerivationParams,
        description?: string
    ): OutputBuilder {
        return this.parent.addChangeOutput(addressOrParams, description);
    }

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
    addOrdinalP2PKHOutput(
        addressOrParams: string | WalletDerivationParams,
        satoshis: number,
        inscription?: Inscription,
        metadata?: MAP,
        description?: string
    ): OutputBuilder {
        return this.parent.addOrdinalP2PKHOutput(addressOrParams, satoshis, inscription, metadata, description);
    }

    /**
     * Adds a custom output with a pre-built locking script.
     *
     * @param lockingScript - The locking script for this output
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addCustomOutput(
        lockingScript: LockingScript,
        satoshis: number,
        description?: string
    ): OutputBuilder {
        return this.parent.addCustomOutput(lockingScript, satoshis, description);
    }

    /**
     * Sets transaction-level options (convenience proxy to TransactionTemplate).
     *
     * @param opts - Transaction options (randomizeOutputs, etc.)
     * @returns The parent TransactionTemplate for transaction-level chaining
     */
    options(opts: CreateActionOptions): TransactionTemplate {
        return this.parent.options(opts);
    }

    /**
     * Builds the transaction using wallet.createAction() (convenience proxy to TransactionTemplate).
     *
     * @param params - Build parameters (optional)
     * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
     */
    async build(params?: BuildParams): Promise<CreateActionResult | any> {
        return this.parent.build(params);
    }
}

/**
 * Builder class for configuring individual transaction outputs.
 *
 * This class allows you to chain methods to configure a specific output,
 * such as adding OP_RETURN data. It also allows adding more outputs or
 * accessing transaction-level methods like build().
 */
export class OutputBuilder {
    constructor(
        private parent: TransactionTemplate,
        private outputConfig: OutputConfig
    ) { }

    /**
     * Adds OP_RETURN data to THIS output only.
     *
     * @param fields - Array of data fields. Each field can be a UTF-8 string, hex string, or byte array
     * @returns This OutputBuilder for further output configuration
     */
    addOpReturn(fields: (string | number[])[]): this {
        if (!Array.isArray(fields) || fields.length === 0) {
            throw new Error('addOpReturn requires a non-empty array of fields');
        }
        this.outputConfig.opReturnFields = fields;
        return this;
    }

    /**
     * Sets the basket for THIS output only.
     *
     * @param value - Basket name/identifier
     * @returns This OutputBuilder for further output configuration
     */
    basket(value: string): this {
        if (typeof value !== 'string' || value.length === 0) {
            throw new Error('basket requires a non-empty string');
        }
        this.outputConfig.basket = value;
        return this;
    }

    /**
     * Sets custom instructions for THIS output only.
     *
     * @param value - Custom instructions (typically JSON string)
     * @returns This OutputBuilder for further output configuration
     */
    customInstructions(value: string): this {
        if (typeof value !== 'string' || value.length === 0) {
            throw new Error('customInstructions requires a non-empty string');
        }
        this.outputConfig.customInstructions = value;
        return this;
    }

    /**
     * Adds a P2PKH output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addP2PKHOutput(
        addressOrParams: string | WalletDerivationParams | undefined,
        satoshis: number,
        description?: string
    ): OutputBuilder {
        return this.parent.addP2PKHOutput(
            addressOrParams,
            satoshis,
            description
        );
    }

    /**
     * Adds a change output that automatically calculates the change amount.
     *
     * @param addressOrParams - Public key hex or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addChangeOutput(
        addressOrParams?: string | WalletDerivationParams,
        description?: string
    ): OutputBuilder {
        return this.parent.addChangeOutput(addressOrParams, description);
    }

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
    addP2PKHInput(
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        walletParams?: WalletDerivationParams,
        description?: string,
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        return this.parent.addP2PKHInput(
            sourceTransaction,
            sourceOutputIndex,
            walletParams,
            description,
            signOutputs,
            anyoneCanPay,
            sourceSatoshis,
            lockingScript
        );
    }

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
    addOrdinalP2PKHInput(
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        walletParams?: WalletDerivationParams,
        description?: string,
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        return this.parent.addOrdinalP2PKHInput(
            sourceTransaction,
            sourceOutputIndex,
            walletParams,
            description,
            signOutputs,
            anyoneCanPay,
            sourceSatoshis,
            lockingScript
        );
    }

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
    addCustomInput(
        unlockingScriptTemplate: any,
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        description?: string,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        return this.parent.addCustomInput(
            unlockingScriptTemplate,
            sourceTransaction,
            sourceOutputIndex,
            description,
            sourceSatoshis,
            lockingScript
        );
    }

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
    addOrdinalP2PKHOutput(
        addressOrParams: string | WalletDerivationParams,
        satoshis: number,
        inscription?: Inscription,
        metadata?: MAP,
        description?: string
    ): OutputBuilder {
        return this.parent.addOrdinalP2PKHOutput(
            addressOrParams,
            satoshis,
            inscription,
            metadata,
            description
        );
    }

    /**
     * Adds a custom output with a pre-built locking script.
     *
     * @param lockingScript - The locking script for this output
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns A new OutputBuilder for the new output
     */
    addCustomOutput(
        lockingScript: LockingScript,
        satoshis: number,
        description?: string
    ): OutputBuilder {
        return this.parent.addCustomOutput(
            lockingScript,
            satoshis,
            description
        );
    }

    /**
     * Sets the description for THIS output only.
     *
     * @param desc - Description for this specific output
     * @returns This OutputBuilder for further output configuration
     */
    outputDescription(desc: string): this {
        if (typeof desc !== 'string') {
            throw new Error('Output description must be a string');
        }
        this.outputConfig.description = desc;
        return this;
    }

    /**
     * Sets transaction-level options (convenience proxy to TransactionTemplate).
     *
     * @param opts - Transaction options (randomizeOutputs, etc.)
     * @returns The parent TransactionTemplate for transaction-level chaining
     */
    options(opts: CreateActionOptions): TransactionTemplate {
        return this.parent.options(opts);
    }

    /**
     * Builds the transaction using wallet.createAction() (convenience proxy to TransactionTemplate).
     *
     * @param params - Build parameters (optional)
     * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
     */
    async build(params?: BuildParams): Promise<CreateActionResult | any> {
        return this.parent.build(params);
    }
}

/**
 * TransactionTemplate - Builder class for creating BSV transactions with fluent API.
 *
 * This class provides a chainable interface for building transactions with multiple
 * outputs, metadata, and wallet integration. It simplifies the process of creating
 * transactions by abstracting away the low-level details of locking scripts and
 * wallet interactions.
 */
export class TransactionTemplate {
    private wallet: WalletInterface;
    private _transactionDescription?: string;
    private inputs: InputConfig[] = [];
    private outputs: OutputConfig[] = [];
    private transactionOptions: CreateActionOptions = {};

    /**
     * Creates a new TransactionTemplate builder.
     *
     * @param wallet - BRC-100 compatible wallet interface for signing and key derivation
     * @param description - Optional description for the entire transaction
     */
    constructor(wallet: WalletInterface, description?: string) {
        if (!wallet) {
            throw new Error('Wallet is required for TransactionTemplate');
        }
        this.wallet = wallet;
        this._transactionDescription = description;
    }

    /**
     * Sets the transaction-level description.
     *
     * @param desc - Description for the entire transaction
     * @returns This TransactionTemplate for further chaining
     */
    transactionDescription(desc: string): this {
        if (typeof desc !== 'string') {
            throw new Error('Description must be a string');
        }
        this._transactionDescription = desc;
        return this;
    }

    /**
     * Sets transaction-level options.
     *
     * @param opts - Transaction options (randomizeOutputs, trustSelf, signAndProcess, etc.)
     * @returns This TransactionTemplate for further chaining
     */
    options(opts: CreateActionOptions): this {
        if (!opts || typeof opts !== 'object') {
            throw new Error('Options must be an object');
        }

        // Validate boolean options
        if (opts.signAndProcess !== undefined && typeof opts.signAndProcess !== 'boolean') {
            throw new Error('signAndProcess must be a boolean');
        }
        if (opts.acceptDelayedBroadcast !== undefined && typeof opts.acceptDelayedBroadcast !== 'boolean') {
            throw new Error('acceptDelayedBroadcast must be a boolean');
        }
        if (opts.returnTXIDOnly !== undefined && typeof opts.returnTXIDOnly !== 'boolean') {
            throw new Error('returnTXIDOnly must be a boolean');
        }
        if (opts.noSend !== undefined && typeof opts.noSend !== 'boolean') {
            throw new Error('noSend must be a boolean');
        }
        if (opts.randomizeOutputs !== undefined && typeof opts.randomizeOutputs !== 'boolean') {
            throw new Error('randomizeOutputs must be a boolean');
        }

        // Validate trustSelf
        if (opts.trustSelf !== undefined) {
            const validTrustSelfValues = ['known', 'all'];
            if (typeof opts.trustSelf !== 'string' || !validTrustSelfValues.includes(opts.trustSelf)) {
                throw new Error('trustSelf must be either "known" or "all"');
            }
        }

        // Validate array options
        if (opts.knownTxids !== undefined) {
            if (!Array.isArray(opts.knownTxids)) {
                throw new Error('knownTxids must be an array');
            }
            for (let i = 0; i < opts.knownTxids.length; i++) {
                if (typeof opts.knownTxids[i] !== 'string') {
                    throw new Error(`knownTxids[${i}] must be a string (hex txid)`);
                }
            }
        }

        if (opts.noSendChange !== undefined) {
            if (!Array.isArray(opts.noSendChange)) {
                throw new Error('noSendChange must be an array');
            }
            for (let i = 0; i < opts.noSendChange.length; i++) {
                if (typeof opts.noSendChange[i] !== 'string') {
                    throw new Error(`noSendChange[${i}] must be a string (outpoint format)`);
                }
            }
        }

        if (opts.sendWith !== undefined) {
            if (!Array.isArray(opts.sendWith)) {
                throw new Error('sendWith must be an array');
            }
            for (let i = 0; i < opts.sendWith.length; i++) {
                if (typeof opts.sendWith[i] !== 'string') {
                    throw new Error(`sendWith[${i}] must be a string (hex txid)`);
                }
            }
        }

        this.transactionOptions = { ...this.transactionOptions, ...opts };
        return this;
    }

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
    addP2PKHInput(
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        walletParams?: WalletDerivationParams,
        description?: string,
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        // Validate parameters
        if (typeof sourceOutputIndex !== 'number' || sourceOutputIndex < 0) {
            throw new Error('sourceOutputIndex must be a non-negative number');
        }
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const inputConfig: InputConfig = {
            type: 'p2pkh',
            sourceTransaction,
            sourceOutputIndex,
            description,
            walletParams,
            signOutputs,
            anyoneCanPay,
            sourceSatoshis,
            lockingScript,
        };

        this.inputs.push(inputConfig);
        return new InputBuilder(this, inputConfig);
    }

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
    addOrdinalP2PKHInput(
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        walletParams?: WalletDerivationParams,
        description?: string,
        signOutputs: 'all' | 'none' | 'single' = 'all',
        anyoneCanPay: boolean = false,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        // Validate parameters
        if (typeof sourceOutputIndex !== 'number' || sourceOutputIndex < 0) {
            throw new Error('sourceOutputIndex must be a non-negative number');
        }
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const inputConfig: InputConfig = {
            type: 'ordinalP2PKH',
            sourceTransaction,
            sourceOutputIndex,
            description,
            walletParams,
            signOutputs,
            anyoneCanPay,
            sourceSatoshis,
            lockingScript,
        };

        this.inputs.push(inputConfig);
        return new InputBuilder(this, inputConfig);
    }

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
    addCustomInput(
        unlockingScriptTemplate: any,
        sourceTransaction: Transaction,
        sourceOutputIndex: number,
        description?: string,
        sourceSatoshis?: number,
        lockingScript?: Script
    ): InputBuilder {
        // Validate parameters
        if (!unlockingScriptTemplate) {
            throw new Error('unlockingScriptTemplate is required for custom input');
        }
        if (typeof sourceOutputIndex !== 'number' || sourceOutputIndex < 0) {
            throw new Error('sourceOutputIndex must be a non-negative number');
        }
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const inputConfig: InputConfig = {
            type: 'custom',
            unlockingScriptTemplate,
            sourceTransaction,
            sourceOutputIndex,
            description,
            sourceSatoshis,
            lockingScript,
        };

        this.inputs.push(inputConfig);
        return new InputBuilder(this, inputConfig);
    }

    /**
     * Adds a P2PKH (Pay To Public Key Hash) output to the transaction.
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param satoshis - Amount in satoshis for this output
     * @param description - Optional description for this output
     * @returns An OutputBuilder for configuring this output (e.g., adding OP_RETURN)
     */
    addP2PKHOutput(
        addressOrParams: string | WalletDerivationParams | undefined,
        satoshis: number,
        description?: string
    ): OutputBuilder {
        // Validate parameters (addressOrParams is now optional - will use BRC-29 derivation if not provided)
        if (typeof satoshis !== 'number' || satoshis < 0) {
            throw new Error('satoshis must be a non-negative number');
        }
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const outputConfig: OutputConfig = {
            type: 'p2pkh',
            satoshis,
            description,
            addressOrParams,
        };

        this.outputs.push(outputConfig);
        return new OutputBuilder(this, outputConfig);
    }

    /**
     * Adds a change output that automatically calculates the change amount during transaction signing.
     *
     * The satoshi amount is calculated as: inputs - outputs - fees
     *
     * @param addressOrParams - Public key hex string or wallet derivation parameters. If omitted, uses BRC-29 derivation scheme.
     * @param description - Optional description for this output (default: "Change")
     * @returns An OutputBuilder for configuring this output (e.g., adding OP_RETURN)
     */
    addChangeOutput(
        addressOrParams?: string | WalletDerivationParams,
        description?: string
    ): OutputBuilder {
        // Validate parameters (addressOrParams is now optional - will use BRC-29 derivation if not provided)
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const outputConfig: OutputConfig = {
            type: 'change',
            description: description || "Change",
            addressOrParams,
        };

        this.outputs.push(outputConfig);
        return new OutputBuilder(this, outputConfig);
    }

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
    addOrdinalP2PKHOutput(
        addressOrParams: string | WalletDerivationParams | undefined,
        satoshis: number,
        inscription?: Inscription,
        metadata?: MAP,
        description?: string
    ): OutputBuilder {
        // Validate parameters (addressOrParams is now optional - will use BRC-29 derivation if not provided)
        if (typeof satoshis !== 'number' || satoshis < 0) {
            throw new Error('satoshis must be a non-negative number');
        }
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const outputConfig: OutputConfig = {
            type: 'ordinalP2PKH',
            satoshis,
            description,
            addressOrParams,
            inscription,
            metadata,
        };

        this.outputs.push(outputConfig);
        return new OutputBuilder(this, outputConfig);
    }

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
    addCustomOutput(
        lockingScript: LockingScript,
        satoshis: number,
        description?: string
    ): OutputBuilder {
        // Validate parameters
        if (!lockingScript || typeof lockingScript.toHex !== 'function') {
            throw new Error('lockingScript must be a LockingScript instance');
        }
        if (typeof satoshis !== 'number' || satoshis < 0) {
            throw new Error('satoshis must be a non-negative number');
        }
        if (description !== undefined && typeof description !== 'string') {
            throw new Error('description must be a string');
        }

        const outputConfig: OutputConfig = {
            type: 'custom',
            satoshis,
            description,
            lockingScript,
        };

        this.outputs.push(outputConfig);
        return new OutputBuilder(this, outputConfig);
    }

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
    async build(params?: BuildParams): Promise<CreateActionResult | any> {
        // Validate that we have outputs
        if (this.outputs.length === 0) {
            throw new Error('At least one output is required to build a transaction');
        }

        // Validate that change outputs require inputs
        const hasChangeOutputs = this.outputs.some(output => output.type === 'change');
        if (hasChangeOutputs && this.inputs.length === 0) {
            throw new Error('Change outputs require at least one input');
        }

        // Track derivation info for customInstructions
        const derivationInfo: Array<{ outputIndex: number; derivationPrefix: string; derivationSuffix: string }> = [];

        // Build the inputs array for wallet.createAction()
        const actionInputsConfig = [];

        // Build inputs for the prebuilt transaction for signing
        const signingInputs = [];

        // Process each input
        for (let i = 0; i < this.inputs.length; i++) {
            const config = this.inputs[i];

            let unlockingScriptTemplate;

            // Process based on input type
            switch (config.type) {
                case 'p2pkh':
                case 'ordinalP2PKH': {
                    // Both p2pkh and ordinalP2PKH inputs use the same P2PKH unlocking script
                    const p2pkh = new P2PKH(this.wallet);

                    // Create unlocking script template
                    const walletParams = config.walletParams;

                    // Get the unlockingScript template
                    unlockingScriptTemplate = p2pkh.unlock(
                        walletParams?.protocolID,
                        walletParams?.keyID,
                        walletParams?.counterparty,
                        config.signOutputs,
                        config.anyoneCanPay
                    );
                    break;
                }
                case 'custom': {
                    // Use the provided unlocking script template directly
                    unlockingScriptTemplate = config.unlockingScriptTemplate;
                    break;
                }
                default: {
                    throw new Error(`Unsupported input type: ${(config as any).type}`);
                }
            }

            // Get txid from source
            const txid = config.sourceTransaction.id("hex")

            // Build action input
            const inputConfig = {
                outpoint: `${txid}.${config.sourceOutputIndex}`,
                inputDescription: config.description || "Transaction input",
            }

            // Build the input object
            const inputForSigning = {
                sourceTransaction: config.sourceTransaction,
                sourceOutputIndex: config.sourceOutputIndex,
                unlockingScriptTemplate: unlockingScriptTemplate,
            }

            signingInputs.push(inputForSigning);
            actionInputsConfig.push(inputConfig);
        }

        // Build the outputs array for wallet.createAction()
        const actionOutputs: CreateActionOutput[] = [];

        // Prebuilt outputs for signing
        const signingOutputs = [];

        // Process each output
        for (let i = 0; i < this.outputs.length; i++) {
            const config = this.outputs[i];
            let lockingScript: LockingScript;

            // Create the base locking script based on output type
            switch (config.type) {
                case 'p2pkh': {
                    const p2pkh = new P2PKH(this.wallet);
                    let addressOrParams = config.addressOrParams;

                    // If no addressOrParams provided, use BRC-29 derivation
                    if (!addressOrParams) {
                        const derivation = getDerivation();
                        addressOrParams = {
                            protocolID: derivation.protocolID,
                            keyID: derivation.keyID,
                            counterparty: 'self'
                        };

                        // Track derivation for customInstructions
                        const [derivationPrefix, derivationSuffix] = derivation.keyID.split(' ');
                        derivationInfo.push({
                            outputIndex: i,
                            derivationPrefix,
                            derivationSuffix
                        });
                    }

                    // Determine which overload to call
                    if (isDerivationParams(addressOrParams)) {
                        // Use wallet param overload
                        lockingScript = await p2pkh.lock(addressOrParams);
                    } else {
                        // Use pubkeyhash overload
                        lockingScript = await p2pkh.lock(addressOrParams);
                    }
                    break;
                }
                case 'ordinalP2PKH': {
                    const ordinal = new OrdP2PKH(this.wallet);
                    let addressOrParams = config.addressOrParams;

                    // If no addressOrParams provided, use BRC-29 derivation
                    if (!addressOrParams) {
                        const derivation = getDerivation();
                        addressOrParams = {
                            protocolID: derivation.protocolID,
                            keyID: derivation.keyID,
                            counterparty: 'self'
                        };

                        // Track derivation for customInstructions
                        const [derivationPrefix, derivationSuffix] = derivation.keyID.split(' ');
                        derivationInfo.push({
                            outputIndex: i,
                            derivationPrefix,
                            derivationSuffix
                        });
                    }

                    // Determine which overload to call
                    if (isDerivationParams(addressOrParams)) {
                        // Use wallet param overload
                        lockingScript = await ordinal.lock(addressOrParams, config.inscription, config.metadata);
                    } else {
                        // Use pubkeyhash overload
                        lockingScript = await ordinal.lock(addressOrParams, config.inscription, config.metadata);
                    }
                    break;
                }
                case 'custom': {
                    // Use lockingscript directly for custom outputs
                    lockingScript = config.lockingScript;
                    break;
                }
                case 'change': {
                    // Change output - create locking script like P2PKH
                    const p2pkh = new P2PKH(this.wallet);
                    let addressOrParams = config.addressOrParams;

                    // If no addressOrParams provided, use BRC-29 derivation
                    if (!addressOrParams) {
                        const derivation = getDerivation();
                        addressOrParams = {
                            protocolID: derivation.protocolID,
                            keyID: derivation.keyID,
                            counterparty: 'self'
                        };

                        // Track derivation for customInstructions
                        const [derivationPrefix, derivationSuffix] = derivation.keyID.split(' ');
                        derivationInfo.push({
                            outputIndex: i,
                            derivationPrefix,
                            derivationSuffix
                        });
                    }

                    if (isDerivationParams(addressOrParams)) {
                        lockingScript = await p2pkh.lock(addressOrParams);
                    } else {
                        lockingScript = await p2pkh.lock(addressOrParams);
                    }
                    break;
                }
                default: {
                    throw new Error(`Unsupported output type: ${(config as any).type}`);
                }
            }

            // Apply OP_RETURN data if specified for this output
            if (config.opReturnFields && config.opReturnFields.length > 0) {
                lockingScript = addOpReturnData(lockingScript, config.opReturnFields);
            }

            // Build customInstructions: combine user-provided and auto-generated derivation instructions
            const derivationForOutput = derivationInfo.find(d => d.outputIndex === i);
            let finalCustomInstructions: string | undefined;

            if (derivationForOutput) {
                // We have auto-generated derivation instructions
                const derivationInstructions = JSON.stringify({
                    derivationPrefix: derivationForOutput.derivationPrefix,
                    derivationSuffix: derivationForOutput.derivationSuffix
                });

                if (config.customInstructions) {
                    // Concatenate user's custom instructions with derivation instructions
                    finalCustomInstructions = config.customInstructions + derivationInstructions;
                } else {
                    // Only derivation instructions
                    finalCustomInstructions = derivationInstructions;
                }
            } else if (config.customInstructions) {
                // Only user-provided custom instructions
                finalCustomInstructions = config.customInstructions;
            }

            // Handle change outputs specially - mark for auto-calculation during signing
            if (config.type === 'change') {
                // Build the output object for signing with change flag
                const outputForSigning: any = {
                    lockingScript: lockingScript,
                    change: true  // Mark as change output for auto-calculation
                }

                signingOutputs.push(outputForSigning);

                // Add placeholder to actionOutputs - satoshis will be updated after signing
                const output: CreateActionOutput = {
                    lockingScript: lockingScript.toHex(),
                    satoshis: 0,  // Placeholder - will be updated after signing
                    outputDescription: config.description || "Change",
                };
                // Apply combined customInstructions (user + derivation)
                if (finalCustomInstructions) {
                    output.customInstructions = finalCustomInstructions;
                }
                // Apply basket if set
                if (config.basket) {
                    output.basket = config.basket;
                }
                actionOutputs.push(output);
            } else {
                // Regular output - add to both signing and action outputs
                const output: CreateActionOutput = {
                    lockingScript: lockingScript.toHex(),
                    satoshis: config.satoshis!,  // Non-change outputs must have satoshis
                    outputDescription: config.description || "Transaction output",
                };
                // Apply final customInstructions (user + derivation)
                if (finalCustomInstructions) {
                    output.customInstructions = finalCustomInstructions;
                }
                // Apply basket if set
                if (config.basket) {
                    output.basket = config.basket;
                }

                // Build the output object for signing
                const outputForSigning = {
                    lockingScript: lockingScript,
                    satoshis: config.satoshis!,
                }

                signingOutputs.push(outputForSigning);
                actionOutputs.push(output);
            }
        }

        // Build options for createAction
        const createActionOptions: CreateActionOptions = {
            ...this.transactionOptions
        };

        // Build the inputs array for wallet.createAction()
        const actionInputs: CreateActionInput[] = [];
        let inputBEEF: number[] | undefined;

        // Only build and sign transaction if there are inputs
        if (signingInputs.length > 0) {
            // Build the signable transaction
            const tx = new Transaction();
            signingInputs.forEach((input) => {
                tx.addInput(input)
            });
            signingOutputs.forEach((output) => {
                if (output.change) {
                    // Change output - don't specify satoshis, will be calculated
                    tx.addOutput({
                        lockingScript: output.lockingScript,
                        change: true
                    })
                } else {
                    // Regular output with specified satoshis
                    tx.addOutput({
                        satoshis: output.satoshis,
                        lockingScript: output.lockingScript,
                    })
                }
            });

            // Calculate fee and sign
            await tx.fee(new SatoshisPerKilobyte(DEFAULT_SAT_PER_KB));
            await tx.sign()

            // Combine the config with the signed unlocking scripts
            for (let i = 0; i < actionInputsConfig.length; i++) {
                const config = actionInputsConfig[i];
                const signedInput = tx.inputs[i];

                if (!signedInput.unlockingScript) {
                    throw new Error(`Failed to generate unlocking script for input ${i}`);
                }

                actionInputs.push({
                    outpoint: config.outpoint,
                    inputDescription: config.inputDescription,
                    unlockingScript: signedInput.unlockingScript.toHex(),
                });
            }

            // Update change output satoshis from signed transaction
            for (let i = 0; i < this.outputs.length; i++) {
                const config = this.outputs[i];

                if (config.type === 'change') {
                    // Find the corresponding output in the signed transaction
                    const signedOutput = tx.outputs[i];

                    if (!signedOutput) {
                        throw new Error(`Change output at index ${i} not found in signed transaction`);
                    }

                    // Validate that satoshis were calculated
                    if (signedOutput.satoshis === undefined) {
                        throw new Error(`Change output at index ${i} has no satoshis after fee calculation`);
                    }

                    // Update the placeholder satoshis with calculated value
                    actionOutputs[i].satoshis = signedOutput.satoshis;
                }
            }

            // Get all the inputBEEFs needed for createAction and merge them
            // For a single input, just use its BEEF directly
            if (signingInputs.length === 1) {
                inputBEEF = signingInputs[0].sourceTransaction.toBEEF();
            } else {
                // For multiple inputs, merge the BEEFs
                const mergedBeef = new Beef();
                signingInputs.forEach((input) => {
                    const beef = input.sourceTransaction.toBEEF();
                    mergedBeef.mergeBeef(beef);
                })
                inputBEEF = mergedBeef.toBinary();
            }
        }

        // Build the createAction arguments object
        const createActionArgs = {
            description: this._transactionDescription || 'Transaction',
            ...(inputBEEF && { inputBEEF }),
            ...(actionInputs.length > 0 && { inputs: actionInputs }),
            outputs: actionOutputs,
            options: createActionOptions,
        };

        // If preview mode, return the arguments object without calling createAction
        if (params?.preview) {
            return createActionArgs;
        }

        // Call wallet.createAction()
        const result = await this.wallet.createAction(createActionArgs);

        return {
            txid: result.txid,
            tx: result.tx,
        };
    }
}
