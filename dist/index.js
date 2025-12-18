"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  InputBuilder: () => InputBuilder,
  OutputBuilder: () => OutputBuilder,
  TransactionTemplate: () => TransactionTemplate,
  WalletOrdP2PKH: () => OrdP2PKH,
  WalletP2PKH: () => P2PKH,
  addOpReturnData: () => addOpReturnData,
  calculatePreimage: () => calculatePreimage,
  getDerivation: () => getDerivation,
  makeWallet: () => makeWallet
});
module.exports = __toCommonJS(index_exports);

// src/script-templates/p2pkh.ts
var import_sdk2 = require("@bsv/sdk");

// src/utils/createPreimage.ts
var import_sdk = require("@bsv/sdk");
function calculatePreimage(tx, inputIndex, signOutputs, anyoneCanPay, sourceSatoshis, lockingScript) {
  if (!tx) {
    throw new Error("Transaction is required");
  }
  if (!tx.inputs || tx.inputs.length === 0) {
    throw new Error("Transaction must have at least one input");
  }
  if (inputIndex < 0 || inputIndex >= tx.inputs.length) {
    throw new Error(`Invalid inputIndex ${inputIndex}. Transaction has ${tx.inputs.length} input(s)`);
  }
  if (!["all", "none", "single"].includes(signOutputs)) {
    throw new Error(`Invalid signOutputs "${signOutputs}". Must be "all", "none", or "single"`);
  }
  let signatureScope = import_sdk.TransactionSignature.SIGHASH_FORKID;
  if (signOutputs === "all") signatureScope |= import_sdk.TransactionSignature.SIGHASH_ALL;
  if (signOutputs === "none") signatureScope |= import_sdk.TransactionSignature.SIGHASH_NONE;
  if (signOutputs === "single") {
    signatureScope |= import_sdk.TransactionSignature.SIGHASH_SINGLE;
    if (!tx.outputs || inputIndex >= tx.outputs.length) {
      throw new Error(`SIGHASH_SINGLE requires output at index ${inputIndex}, but transaction only has ${tx.outputs?.length || 0} output(s)`);
    }
  }
  if (anyoneCanPay) signatureScope |= import_sdk.TransactionSignature.SIGHASH_ANYONECANPAY;
  const input = tx.inputs[inputIndex];
  const otherInputs = anyoneCanPay ? [] : tx.inputs.filter((_, i) => i !== inputIndex);
  const sourceTXID = input.sourceTXID || input.sourceTransaction?.id("hex");
  if (!sourceTXID) {
    throw new Error(`Input ${inputIndex}: sourceTXID or sourceTransaction is required for signing`);
  }
  sourceSatoshis || (sourceSatoshis = input.sourceTransaction?.outputs[input.sourceOutputIndex].satoshis);
  if (!sourceSatoshis) {
    throw new Error(`Input ${inputIndex}: sourceSatoshis or input sourceTransaction is required for signing`);
  }
  lockingScript || (lockingScript = input.sourceTransaction?.outputs[input.sourceOutputIndex].lockingScript);
  if (!lockingScript) {
    throw new Error(`Input ${inputIndex}: lockingScript or input sourceTransaction is required for signing`);
  }
  return { preimage: import_sdk.TransactionSignature.format({
    sourceTXID,
    sourceOutputIndex: input.sourceOutputIndex,
    sourceSatoshis,
    transactionVersion: tx.version,
    otherInputs,
    inputIndex,
    outputs: tx.outputs,
    inputSequence: input.sequence || 4294967295,
    subscript: lockingScript,
    lockTime: tx.lockTime,
    scope: signatureScope
  }), signatureScope };
}

// src/script-templates/p2pkh.ts
function validateWalletDerivationParams(params, paramName = "parameters") {
  if (!params || typeof params !== "object") {
    throw new Error(`Invalid ${paramName}: must be an object with protocolID and keyID`);
  }
  if (!params.protocolID) {
    throw new Error(`Invalid ${paramName}: protocolID is required`);
  }
  if (!Array.isArray(params.protocolID) || params.protocolID.length !== 2) {
    throw new Error(`Invalid ${paramName}: protocolID must be an array of [number, string]`);
  }
  if (typeof params.protocolID[0] !== "number" || typeof params.protocolID[1] !== "string") {
    throw new Error(`Invalid ${paramName}: protocolID must be [number, string]`);
  }
  if (params.keyID === void 0 || params.keyID === null) {
    throw new Error(`Invalid ${paramName}: keyID is required`);
  }
  if (typeof params.keyID !== "string") {
    throw new Error(`Invalid ${paramName}: keyID must be a string`);
  }
  if (params.counterparty !== void 0 && typeof params.counterparty !== "string") {
    throw new Error(`Invalid ${paramName}: counterparty must be a string (or omit for default "self")`);
  }
}
var P2PKH = class {
  /**
   * Creates a new P2PKH instance.
   *
   * @param wallet - Optional BRC-100 compatible wallet interface
   */
  constructor(wallet) {
    this.wallet = wallet;
  }
  async lock(pubkeyhashOrWalletParams) {
    let data;
    if (!pubkeyhashOrWalletParams && !this.wallet) {
      throw new Error("pubkeyhash or wallet is required");
    }
    if (typeof pubkeyhashOrWalletParams === "string") {
      const pubKeyToHash = import_sdk2.PublicKey.fromString(pubkeyhashOrWalletParams);
      const hash = pubKeyToHash.toHash();
      data = hash;
    } else if (Array.isArray(pubkeyhashOrWalletParams)) {
      data = pubkeyhashOrWalletParams;
    } else if (pubkeyhashOrWalletParams) {
      validateWalletDerivationParams(pubkeyhashOrWalletParams, "wallet derivation parameters");
      if (!this.wallet) {
        throw new Error("Wallet is required when using wallet derivation parameters");
      }
      const { protocolID, keyID, counterparty = "self" } = pubkeyhashOrWalletParams;
      const { publicKey } = await this.wallet.getPublicKey({
        protocolID,
        keyID,
        counterparty
      });
      const pubKeyToHash = import_sdk2.PublicKey.fromString(publicKey);
      data = pubKeyToHash.toHash();
    } else {
      if (!this.wallet) {
        throw new Error("pubkeyhash or wallet is required");
      }
      const { publicKey } = await this.wallet.getPublicKey({
        protocolID: [2, "p2pkh"],
        keyID: "0",
        counterparty: "self"
      });
      const pubKeyToHash = import_sdk2.PublicKey.fromString(publicKey);
      data = pubKeyToHash.toHash();
    }
    if (!data || data.length !== 20) {
      throw new Error("Failed to generate valid public key hash (must be 20 bytes)");
    }
    return new import_sdk2.LockingScript([
      { op: import_sdk2.OP.OP_DUP },
      { op: import_sdk2.OP.OP_HASH160 },
      { op: data.length, data },
      { op: import_sdk2.OP.OP_EQUALVERIFY },
      { op: import_sdk2.OP.OP_CHECKSIG }
    ]);
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
  unlock(protocolID = [2, "p2pkh"], keyID = "0", counterparty = "self", signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
    if (!this.wallet) {
      throw new Error("Wallet is required for unlocking");
    }
    if (!Array.isArray(protocolID) || protocolID.length !== 2) {
      throw new Error("protocolID must be an array of [number, string]");
    }
    if (typeof keyID !== "string") {
      throw new Error("keyID must be a string");
    }
    if (counterparty !== void 0 && typeof counterparty !== "string") {
      throw new Error('counterparty must be a string (or omit for default "self")');
    }
    if (!["all", "none", "single"].includes(signOutputs)) {
      throw new Error('signOutputs must be "all", "none", or "single"');
    }
    if (typeof anyoneCanPay !== "boolean") {
      throw new Error("anyoneCanPay must be a boolean");
    }
    const wallet = this.wallet;
    return {
      sign: async (tx, inputIndex) => {
        const { preimage, signatureScope } = calculatePreimage(tx, inputIndex, signOutputs, anyoneCanPay, sourceSatoshis, lockingScript);
        const { signature } = await wallet.createSignature({
          hashToDirectlySign: import_sdk2.Hash.hash256(preimage),
          protocolID,
          keyID,
          counterparty
        });
        const { publicKey } = await wallet.getPublicKey({
          protocolID,
          keyID,
          counterparty
        });
        const rawSignature = import_sdk2.Signature.fromDER(signature, "hex");
        const sig = new import_sdk2.TransactionSignature(
          rawSignature.r,
          rawSignature.s,
          signatureScope
        );
        const sigForScript = sig.toChecksigFormat();
        const pubkeyForScript = import_sdk2.PublicKey.fromString(publicKey).encode(true);
        return new import_sdk2.UnlockingScript([
          { op: sigForScript.length, data: sigForScript },
          { op: pubkeyForScript.length, data: pubkeyForScript }
        ]);
      },
      estimateLength: async () => {
        return 108;
      }
    };
  }
};

// src/script-templates/ordinal.ts
var import_sdk3 = require("@bsv/sdk");

// src/utils/constants.ts
var ORDINAL_MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";
var DEFAULT_SAT_PER_KB = 100;

// src/script-templates/ordinal.ts
var toHex = (str) => {
  return import_sdk3.Utils.toHex(import_sdk3.Utils.toArray(str));
};
var OrdP2PKH = class {
  /**
   * Creates a new OrdP2PKH instance.
   *
   * @param wallet - Optional BRC-100 compatible wallet interface
   */
  constructor(wallet) {
    this.p2pkh = new P2PKH(wallet);
  }
  async lock(pubkeyhashOrWalletParams, inscription, metaData) {
    if (inscription !== void 0) {
      if (typeof inscription !== "object" || inscription === null) {
        throw new Error("inscription must be an object with dataB64 and contentType properties");
      }
      if (!inscription.dataB64 || typeof inscription.dataB64 !== "string") {
        throw new Error("inscription.dataB64 is required and must be a base64 string");
      }
      if (!inscription.contentType || typeof inscription.contentType !== "string") {
        throw new Error("inscription.contentType is required and must be a string (MIME type)");
      }
    }
    if (metaData !== void 0) {
      if (typeof metaData !== "object" || metaData === null) {
        throw new Error("metaData must be an object");
      }
      if (!metaData.app || typeof metaData.app !== "string") {
        throw new Error("metaData.app is required and must be a string");
      }
      if (!metaData.type || typeof metaData.type !== "string") {
        throw new Error("metaData.type is required and must be a string");
      }
    }
    let lockingScript;
    if (typeof pubkeyhashOrWalletParams === "string" || Array.isArray(pubkeyhashOrWalletParams)) {
      lockingScript = await this.p2pkh.lock(pubkeyhashOrWalletParams);
    } else {
      lockingScript = await this.p2pkh.lock(pubkeyhashOrWalletParams);
    }
    return applyInscription(lockingScript, inscription, metaData);
  }
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
  unlock(protocolID, keyID, counterparty = "self", signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
    return this.p2pkh.unlock(
      protocolID,
      keyID,
      counterparty,
      signOutputs,
      anyoneCanPay,
      sourceSatoshis,
      lockingScript
    );
  }
};
var applyInscription = (lockingScript, inscription, metaData, withSeparator = false) => {
  let ordAsm = "";
  if (inscription?.dataB64 !== void 0 && inscription?.contentType !== void 0) {
    const ordHex = toHex("ord");
    const fsBuffer = Buffer.from(inscription.dataB64, "base64");
    const fileHex = fsBuffer.toString("hex").trim();
    if (!fileHex) {
      throw new Error("Invalid file data");
    }
    const fileMediaType = toHex(inscription.contentType);
    if (!fileMediaType) {
      throw new Error("Invalid media type");
    }
    ordAsm = `OP_0 OP_IF ${ordHex} OP_1 ${fileMediaType} OP_0 ${fileHex} OP_ENDIF`;
  }
  let inscriptionAsm = `${ordAsm ? `${ordAsm} ${withSeparator ? "OP_CODESEPARATOR " : ""}` : ""}${lockingScript.toASM()}`;
  if (metaData && (!metaData.app || !metaData.type)) {
    throw new Error("MAP.app and MAP.type are required fields");
  }
  if (metaData?.app && metaData?.type) {
    const mapPrefixHex = toHex(ORDINAL_MAP_PREFIX);
    const mapCmdValue = toHex("SET");
    inscriptionAsm = `${inscriptionAsm ? `${inscriptionAsm} ` : ""}OP_RETURN ${mapPrefixHex} ${mapCmdValue}`;
    for (const [key, value] of Object.entries(metaData)) {
      if (key !== "cmd") {
        inscriptionAsm = `${inscriptionAsm} ${toHex(key)} ${toHex(
          value
        )}`;
      }
    }
  }
  return import_sdk3.LockingScript.fromASM(inscriptionAsm);
};

// src/transaction-template/transaction.ts
var import_sdk7 = require("@bsv/sdk");

// src/utils/mockWallet.ts
var import_sdk4 = require("@bsv/sdk");
var import_wallet_toolbox_client = require("@bsv/wallet-toolbox-client");
async function makeWallet(chain, storageURL, privateKey) {
  if (!chain) {
    throw new Error('chain parameter is required (must be "test" or "main")');
  }
  if (chain !== "test" && chain !== "main") {
    throw new Error(`Invalid chain "${chain}". Must be "test" or "main"`);
  }
  if (!storageURL) {
    throw new Error("storageURL parameter is required");
  }
  if (!privateKey) {
    throw new Error("privateKey parameter is required");
  }
  try {
    const keyDeriver = new import_sdk4.KeyDeriver(new import_sdk4.PrivateKey(privateKey, "hex"));
    const storageManager = new import_wallet_toolbox_client.WalletStorageManager(keyDeriver.identityKey);
    const signer = new import_wallet_toolbox_client.WalletSigner(chain, keyDeriver, storageManager);
    const services = new import_wallet_toolbox_client.Services(chain);
    const wallet = new import_wallet_toolbox_client.Wallet(signer, services);
    const client = new import_wallet_toolbox_client.StorageClient(wallet, storageURL);
    await client.makeAvailable();
    await storageManager.addWalletStorageProvider(client);
    return wallet;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
    throw new Error("Failed to create wallet: Unknown error");
  }
}

// src/utils/opreturn.ts
var import_sdk5 = require("@bsv/sdk");
var isHex = (str) => {
  if (str.length === 0) return true;
  if (str.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(str);
};
var toHexField = (field) => {
  if (Array.isArray(field)) {
    return import_sdk5.Utils.toHex(field);
  }
  if (isHex(field)) {
    return field.toLowerCase();
  }
  return import_sdk5.Utils.toHex(import_sdk5.Utils.toArray(field));
};
var addOpReturnData = (script, fields) => {
  if (!script || typeof script.toASM !== "function") {
    throw new Error("Invalid script parameter: must be a LockingScript instance");
  }
  const scriptAsm = script.toASM();
  if (scriptAsm.includes("OP_RETURN")) {
    throw new Error("Script already contains OP_RETURN. Cannot add multiple OP_RETURN statements to the same script.");
  }
  if (!Array.isArray(fields)) {
    throw new Error("Invalid fields parameter: must be an array of strings or number arrays");
  }
  if (fields.length === 0) {
    throw new Error("At least one data field is required for OP_RETURN");
  }
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const isString = typeof field === "string";
    if (!isString) {
      if (!Array.isArray(field)) {
        throw new Error(
          `Invalid field at index ${i}: must be a string or number array, got ${typeof field}`
        );
      }
      const sampleSize = Math.min(field.length, 100);
      for (let j = 0; j < sampleSize; j++) {
        const idx = Math.floor(j / sampleSize * field.length);
        if (typeof field[idx] !== "number") {
          throw new Error(
            `Invalid field at index ${i}: array contains non-number at position ${idx}`
          );
        }
      }
    }
  }
  const hexFields = fields.map(toHexField);
  const baseAsm = script.toASM();
  const dataFieldsAsm = hexFields.join(" ");
  const fullAsm = `${baseAsm} OP_RETURN ${dataFieldsAsm}`;
  return import_sdk5.LockingScript.fromASM(fullAsm);
};

// src/utils/derivation.ts
var import_wallet_toolbox_client2 = require("@bsv/wallet-toolbox-client");
var import_sdk6 = require("@bsv/sdk");
function getDerivation() {
  const derivationPrefix = import_sdk6.Utils.toBase64((0, import_sdk6.Random)(8));
  const derivationSuffix = import_sdk6.Utils.toBase64((0, import_sdk6.Random)(8));
  return {
    protocolID: import_wallet_toolbox_client2.brc29ProtocolID,
    keyID: derivationPrefix + " " + derivationSuffix
  };
}

// src/transaction-template/transaction.ts
function isDerivationParams(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var InputBuilder = class {
  constructor(parent, inputConfig) {
    this.parent = parent;
    this.inputConfig = inputConfig;
  }
  /**
   * Sets the description for THIS input only.
   *
   * @param desc - Description for this specific input
   * @returns This InputBuilder for further input configuration
   */
  inputDescription(desc) {
    if (typeof desc !== "string") {
      throw new Error("Input description must be a string");
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
  addP2PKHInput(sourceTransaction, sourceOutputIndex, walletParams, description, signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
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
  addOrdinalP2PKHInput(sourceTransaction, sourceOutputIndex, walletParams, description, signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
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
  addCustomInput(unlockingScriptTemplate, sourceTransaction, sourceOutputIndex, description, sourceSatoshis, lockingScript) {
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
  addP2PKHOutput(addressOrParams, satoshis, description) {
    return this.parent.addP2PKHOutput(addressOrParams, satoshis, description);
  }
  /**
   * Adds a change output that automatically calculates the change amount.
   *
   * @param addressOrParams - Public key hex or wallet derivation parameters
   * @param description - Optional description for this output
   * @returns A new OutputBuilder for the new output
   */
  addChangeOutput(addressOrParams, description) {
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
  addOrdinalP2PKHOutput(addressOrParams, satoshis, inscription, metadata, description) {
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
  addCustomOutput(lockingScript, satoshis, description) {
    return this.parent.addCustomOutput(lockingScript, satoshis, description);
  }
  /**
   * Sets transaction-level options (convenience proxy to TransactionTemplate).
   *
   * @param opts - Transaction options (randomizeOutputs, etc.)
   * @returns The parent TransactionTemplate for transaction-level chaining
   */
  options(opts) {
    return this.parent.options(opts);
  }
  /**
   * Builds the transaction using wallet.createAction() (convenience proxy to TransactionTemplate).
   *
   * @param params - Build parameters (optional)
   * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
   */
  async build(params) {
    return this.parent.build(params);
  }
};
var OutputBuilder = class {
  constructor(parent, outputConfig) {
    this.parent = parent;
    this.outputConfig = outputConfig;
  }
  /**
   * Adds OP_RETURN data to THIS output only.
   *
   * @param fields - Array of data fields. Each field can be a UTF-8 string, hex string, or byte array
   * @returns This OutputBuilder for further output configuration
   */
  addOpReturn(fields) {
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new Error("addOpReturn requires a non-empty array of fields");
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
  basket(value) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("basket requires a non-empty string");
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
  customInstructions(value) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("customInstructions requires a non-empty string");
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
  addP2PKHOutput(addressOrParams, satoshis, description) {
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
  addChangeOutput(addressOrParams, description) {
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
  addP2PKHInput(sourceTransaction, sourceOutputIndex, walletParams, description, signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
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
  addOrdinalP2PKHInput(sourceTransaction, sourceOutputIndex, walletParams, description, signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
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
  addCustomInput(unlockingScriptTemplate, sourceTransaction, sourceOutputIndex, description, sourceSatoshis, lockingScript) {
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
  addOrdinalP2PKHOutput(addressOrParams, satoshis, inscription, metadata, description) {
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
  addCustomOutput(lockingScript, satoshis, description) {
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
  outputDescription(desc) {
    if (typeof desc !== "string") {
      throw new Error("Output description must be a string");
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
  options(opts) {
    return this.parent.options(opts);
  }
  /**
   * Builds the transaction using wallet.createAction() (convenience proxy to TransactionTemplate).
   *
   * @param params - Build parameters (optional)
   * @returns Promise resolving to txid and tx from wallet.createAction(), or preview object if params.preview=true
   */
  async build(params) {
    return this.parent.build(params);
  }
};
var TransactionTemplate = class {
  /**
   * Creates a new TransactionTemplate builder.
   *
   * @param wallet - BRC-100 compatible wallet interface for signing and key derivation
   * @param description - Optional description for the entire transaction
   */
  constructor(wallet, description) {
    this.inputs = [];
    this.outputs = [];
    this.transactionOptions = {};
    if (!wallet) {
      throw new Error("Wallet is required for TransactionTemplate");
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
  transactionDescription(desc) {
    if (typeof desc !== "string") {
      throw new Error("Description must be a string");
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
  options(opts) {
    if (!opts || typeof opts !== "object") {
      throw new Error("Options must be an object");
    }
    if (opts.signAndProcess !== void 0 && typeof opts.signAndProcess !== "boolean") {
      throw new Error("signAndProcess must be a boolean");
    }
    if (opts.acceptDelayedBroadcast !== void 0 && typeof opts.acceptDelayedBroadcast !== "boolean") {
      throw new Error("acceptDelayedBroadcast must be a boolean");
    }
    if (opts.returnTXIDOnly !== void 0 && typeof opts.returnTXIDOnly !== "boolean") {
      throw new Error("returnTXIDOnly must be a boolean");
    }
    if (opts.noSend !== void 0 && typeof opts.noSend !== "boolean") {
      throw new Error("noSend must be a boolean");
    }
    if (opts.randomizeOutputs !== void 0 && typeof opts.randomizeOutputs !== "boolean") {
      throw new Error("randomizeOutputs must be a boolean");
    }
    if (opts.trustSelf !== void 0) {
      const validTrustSelfValues = ["known", "all"];
      if (typeof opts.trustSelf !== "string" || !validTrustSelfValues.includes(opts.trustSelf)) {
        throw new Error('trustSelf must be either "known" or "all"');
      }
    }
    if (opts.knownTxids !== void 0) {
      if (!Array.isArray(opts.knownTxids)) {
        throw new Error("knownTxids must be an array");
      }
      for (let i = 0; i < opts.knownTxids.length; i++) {
        if (typeof opts.knownTxids[i] !== "string") {
          throw new Error(`knownTxids[${i}] must be a string (hex txid)`);
        }
      }
    }
    if (opts.noSendChange !== void 0) {
      if (!Array.isArray(opts.noSendChange)) {
        throw new Error("noSendChange must be an array");
      }
      for (let i = 0; i < opts.noSendChange.length; i++) {
        if (typeof opts.noSendChange[i] !== "string") {
          throw new Error(`noSendChange[${i}] must be a string (outpoint format)`);
        }
      }
    }
    if (opts.sendWith !== void 0) {
      if (!Array.isArray(opts.sendWith)) {
        throw new Error("sendWith must be an array");
      }
      for (let i = 0; i < opts.sendWith.length; i++) {
        if (typeof opts.sendWith[i] !== "string") {
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
  addP2PKHInput(sourceTransaction, sourceOutputIndex, walletParams, description, signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
    if (typeof sourceOutputIndex !== "number" || sourceOutputIndex < 0) {
      throw new Error("sourceOutputIndex must be a non-negative number");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const inputConfig = {
      type: "p2pkh",
      sourceTransaction,
      sourceOutputIndex,
      description,
      walletParams,
      signOutputs,
      anyoneCanPay,
      sourceSatoshis,
      lockingScript
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
  addOrdinalP2PKHInput(sourceTransaction, sourceOutputIndex, walletParams, description, signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
    if (typeof sourceOutputIndex !== "number" || sourceOutputIndex < 0) {
      throw new Error("sourceOutputIndex must be a non-negative number");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const inputConfig = {
      type: "ordinalP2PKH",
      sourceTransaction,
      sourceOutputIndex,
      description,
      walletParams,
      signOutputs,
      anyoneCanPay,
      sourceSatoshis,
      lockingScript
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
  addCustomInput(unlockingScriptTemplate, sourceTransaction, sourceOutputIndex, description, sourceSatoshis, lockingScript) {
    if (!unlockingScriptTemplate) {
      throw new Error("unlockingScriptTemplate is required for custom input");
    }
    if (typeof sourceOutputIndex !== "number" || sourceOutputIndex < 0) {
      throw new Error("sourceOutputIndex must be a non-negative number");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const inputConfig = {
      type: "custom",
      unlockingScriptTemplate,
      sourceTransaction,
      sourceOutputIndex,
      description,
      sourceSatoshis,
      lockingScript
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
  addP2PKHOutput(addressOrParams, satoshis, description) {
    if (typeof satoshis !== "number" || satoshis < 0) {
      throw new Error("satoshis must be a non-negative number");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const outputConfig = {
      type: "p2pkh",
      satoshis,
      description,
      addressOrParams
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
  addChangeOutput(addressOrParams, description) {
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const outputConfig = {
      type: "change",
      description: description || "Change",
      addressOrParams
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
  addOrdinalP2PKHOutput(addressOrParams, satoshis, inscription, metadata, description) {
    if (typeof satoshis !== "number" || satoshis < 0) {
      throw new Error("satoshis must be a non-negative number");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const outputConfig = {
      type: "ordinalP2PKH",
      satoshis,
      description,
      addressOrParams,
      inscription,
      metadata
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
  addCustomOutput(lockingScript, satoshis, description) {
    if (!lockingScript || typeof lockingScript.toHex !== "function") {
      throw new Error("lockingScript must be a LockingScript instance");
    }
    if (typeof satoshis !== "number" || satoshis < 0) {
      throw new Error("satoshis must be a non-negative number");
    }
    if (description !== void 0 && typeof description !== "string") {
      throw new Error("description must be a string");
    }
    const outputConfig = {
      type: "custom",
      satoshis,
      description,
      lockingScript
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
  async build(params) {
    if (this.outputs.length === 0) {
      throw new Error("At least one output is required to build a transaction");
    }
    const hasChangeOutputs = this.outputs.some((output) => output.type === "change");
    if (hasChangeOutputs && this.inputs.length === 0) {
      throw new Error("Change outputs require at least one input");
    }
    const derivationInfo = [];
    const actionInputsConfig = [];
    const signingInputs = [];
    for (let i = 0; i < this.inputs.length; i++) {
      const config = this.inputs[i];
      let unlockingScriptTemplate;
      switch (config.type) {
        case "p2pkh":
        case "ordinalP2PKH": {
          const p2pkh = new P2PKH(this.wallet);
          const walletParams = config.walletParams;
          unlockingScriptTemplate = p2pkh.unlock(
            walletParams?.protocolID,
            walletParams?.keyID,
            walletParams?.counterparty,
            config.signOutputs,
            config.anyoneCanPay
          );
          break;
        }
        case "custom": {
          unlockingScriptTemplate = config.unlockingScriptTemplate;
          break;
        }
        default: {
          throw new Error(`Unsupported input type: ${config.type}`);
        }
      }
      const txid = config.sourceTransaction.id("hex");
      const inputConfig = {
        outpoint: `${txid}.${config.sourceOutputIndex}`,
        inputDescription: config.description || "Transaction input"
      };
      const inputForSigning = {
        sourceTransaction: config.sourceTransaction,
        sourceOutputIndex: config.sourceOutputIndex,
        unlockingScriptTemplate
      };
      signingInputs.push(inputForSigning);
      actionInputsConfig.push(inputConfig);
    }
    const actionOutputs = [];
    const signingOutputs = [];
    for (let i = 0; i < this.outputs.length; i++) {
      const config = this.outputs[i];
      let lockingScript;
      switch (config.type) {
        case "p2pkh": {
          const p2pkh = new P2PKH(this.wallet);
          let addressOrParams = config.addressOrParams;
          if (!addressOrParams) {
            const derivation = getDerivation();
            addressOrParams = {
              protocolID: derivation.protocolID,
              keyID: derivation.keyID,
              counterparty: "self"
            };
            const [derivationPrefix, derivationSuffix] = derivation.keyID.split(" ");
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
        case "ordinalP2PKH": {
          const ordinal = new OrdP2PKH(this.wallet);
          let addressOrParams = config.addressOrParams;
          if (!addressOrParams) {
            const derivation = getDerivation();
            addressOrParams = {
              protocolID: derivation.protocolID,
              keyID: derivation.keyID,
              counterparty: "self"
            };
            const [derivationPrefix, derivationSuffix] = derivation.keyID.split(" ");
            derivationInfo.push({
              outputIndex: i,
              derivationPrefix,
              derivationSuffix
            });
          }
          if (isDerivationParams(addressOrParams)) {
            lockingScript = await ordinal.lock(addressOrParams, config.inscription, config.metadata);
          } else {
            lockingScript = await ordinal.lock(addressOrParams, config.inscription, config.metadata);
          }
          break;
        }
        case "custom": {
          lockingScript = config.lockingScript;
          break;
        }
        case "change": {
          const p2pkh = new P2PKH(this.wallet);
          let addressOrParams = config.addressOrParams;
          if (!addressOrParams) {
            const derivation = getDerivation();
            addressOrParams = {
              protocolID: derivation.protocolID,
              keyID: derivation.keyID,
              counterparty: "self"
            };
            const [derivationPrefix, derivationSuffix] = derivation.keyID.split(" ");
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
          throw new Error(`Unsupported output type: ${config.type}`);
        }
      }
      if (config.opReturnFields && config.opReturnFields.length > 0) {
        lockingScript = addOpReturnData(lockingScript, config.opReturnFields);
      }
      const derivationForOutput = derivationInfo.find((d) => d.outputIndex === i);
      let finalCustomInstructions;
      if (derivationForOutput) {
        const derivationInstructions = JSON.stringify({
          derivationPrefix: derivationForOutput.derivationPrefix,
          derivationSuffix: derivationForOutput.derivationSuffix
        });
        if (config.customInstructions) {
          finalCustomInstructions = config.customInstructions + derivationInstructions;
        } else {
          finalCustomInstructions = derivationInstructions;
        }
      } else if (config.customInstructions) {
        finalCustomInstructions = config.customInstructions;
      }
      if (config.type === "change") {
        const outputForSigning = {
          lockingScript,
          change: true
          // Mark as change output for auto-calculation
        };
        signingOutputs.push(outputForSigning);
        const output = {
          lockingScript: lockingScript.toHex(),
          satoshis: 0,
          // Placeholder - will be updated after signing
          outputDescription: config.description || "Change"
        };
        if (finalCustomInstructions) {
          output.customInstructions = finalCustomInstructions;
        }
        if (config.basket) {
          output.basket = config.basket;
        }
        actionOutputs.push(output);
      } else {
        const output = {
          lockingScript: lockingScript.toHex(),
          satoshis: config.satoshis,
          // Non-change outputs must have satoshis
          outputDescription: config.description || "Transaction output"
        };
        if (finalCustomInstructions) {
          output.customInstructions = finalCustomInstructions;
        }
        if (config.basket) {
          output.basket = config.basket;
        }
        const outputForSigning = {
          lockingScript,
          satoshis: config.satoshis
        };
        signingOutputs.push(outputForSigning);
        actionOutputs.push(output);
      }
    }
    const createActionOptions = {
      ...this.transactionOptions
    };
    const actionInputs = [];
    let inputBEEF;
    if (signingInputs.length > 0) {
      const tx = new import_sdk7.Transaction();
      signingInputs.forEach((input) => {
        tx.addInput(input);
      });
      signingOutputs.forEach((output) => {
        if (output.change) {
          tx.addOutput({
            lockingScript: output.lockingScript,
            change: true
          });
        } else {
          tx.addOutput({
            satoshis: output.satoshis,
            lockingScript: output.lockingScript
          });
        }
      });
      await tx.fee(new import_sdk7.SatoshisPerKilobyte(DEFAULT_SAT_PER_KB));
      await tx.sign();
      for (let i = 0; i < actionInputsConfig.length; i++) {
        const config = actionInputsConfig[i];
        const signedInput = tx.inputs[i];
        if (!signedInput.unlockingScript) {
          throw new Error(`Failed to generate unlocking script for input ${i}`);
        }
        actionInputs.push({
          outpoint: config.outpoint,
          inputDescription: config.inputDescription,
          unlockingScript: signedInput.unlockingScript.toHex()
        });
      }
      for (let i = 0; i < this.outputs.length; i++) {
        const config = this.outputs[i];
        if (config.type === "change") {
          const signedOutput = tx.outputs[i];
          if (!signedOutput) {
            throw new Error(`Change output at index ${i} not found in signed transaction`);
          }
          if (signedOutput.satoshis === void 0) {
            throw new Error(`Change output at index ${i} has no satoshis after fee calculation`);
          }
          actionOutputs[i].satoshis = signedOutput.satoshis;
        }
      }
      if (signingInputs.length === 1) {
        inputBEEF = signingInputs[0].sourceTransaction.toBEEF();
      } else {
        const mergedBeef = new import_sdk7.Beef();
        signingInputs.forEach((input) => {
          const beef = input.sourceTransaction.toBEEF();
          mergedBeef.mergeBeef(beef);
        });
        inputBEEF = mergedBeef.toBinary();
      }
    }
    const createActionArgs = {
      description: this._transactionDescription || "Transaction",
      ...inputBEEF && { inputBEEF },
      ...actionInputs.length > 0 && { inputs: actionInputs },
      outputs: actionOutputs,
      options: createActionOptions
    };
    if (params?.preview) {
      return createActionArgs;
    }
    const result = await this.wallet.createAction(createActionArgs);
    return {
      txid: result.txid,
      tx: result.tx
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InputBuilder,
  OutputBuilder,
  TransactionTemplate,
  WalletOrdP2PKH,
  WalletP2PKH,
  addOpReturnData,
  calculatePreimage,
  getDerivation,
  makeWallet
});
