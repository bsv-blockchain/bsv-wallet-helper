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
  WalletOrdP2PKH: () => OrdP2PKH,
  WalletP2PKH: () => P2PKH,
  addOpReturnData: () => addOpReturnData,
  calculatePreimage: () => calculatePreimage,
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
    if (typeof pubkeyhashOrWalletParams === "string" || Array.isArray(pubkeyhashOrWalletParams)) {
      if (typeof pubkeyhashOrWalletParams === "string") {
        const pubKeyToHash = import_sdk2.PublicKey.fromString(pubkeyhashOrWalletParams);
        const hash = pubKeyToHash.toHash();
        data = hash;
      } else {
        data = pubkeyhashOrWalletParams;
      }
    } else if (pubkeyhashOrWalletParams) {
      if (!this.wallet) {
        throw new Error("Wallet is required when using wallet derivation parameters");
      }
      const { protocolID, keyID, counterparty } = pubkeyhashOrWalletParams;
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
    if (!data) {
      throw new Error("Failed to generate public key hash");
    }
    if (data.length !== 20) {
      throw new Error("P2PKH hash length must be 20 bytes");
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
  unlock(protocolID = [2, "p2pkh"], keyID = "0", counterparty = "self", signOutputs = "all", anyoneCanPay = false, sourceSatoshis, lockingScript) {
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
  if (!fields || fields.length === 0) {
    throw new Error("At least one data field is required for OP_RETURN");
  }
  const hexFields = fields.map(toHexField);
  const baseAsm = script.toASM();
  const dataFieldsAsm = hexFields.join(" ");
  const fullAsm = `${baseAsm} OP_RETURN ${dataFieldsAsm}`;
  return import_sdk5.LockingScript.fromASM(fullAsm);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WalletOrdP2PKH,
  WalletP2PKH,
  addOpReturnData,
  calculatePreimage,
  makeWallet
});
