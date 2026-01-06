// src/script-templates/p2pkh.ts
import {
  LockingScript,
  UnlockingScript,
  Hash,
  OP,
  TransactionSignature as TransactionSignature2,
  Signature,
  PublicKey
} from "@bsv/sdk";

// src/utils/createPreimage.ts
import {
  TransactionSignature
} from "@bsv/sdk";
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
  let signatureScope = TransactionSignature.SIGHASH_FORKID;
  if (signOutputs === "all") signatureScope |= TransactionSignature.SIGHASH_ALL;
  if (signOutputs === "none") signatureScope |= TransactionSignature.SIGHASH_NONE;
  if (signOutputs === "single") {
    signatureScope |= TransactionSignature.SIGHASH_SINGLE;
    if (!tx.outputs || inputIndex >= tx.outputs.length) {
      throw new Error(`SIGHASH_SINGLE requires output at index ${inputIndex}, but transaction only has ${tx.outputs?.length || 0} output(s)`);
    }
  }
  if (anyoneCanPay) signatureScope |= TransactionSignature.SIGHASH_ANYONECANPAY;
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
  return { preimage: TransactionSignature.format({
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
  async lock(params) {
    let data;
    if ("pubkeyhash" in params) {
      data = params.pubkeyhash;
    } else if ("publicKey" in params) {
      const pubKeyToHash = PublicKey.fromString(params.publicKey);
      data = pubKeyToHash.toHash();
    } else if ("walletParams" in params) {
      validateWalletDerivationParams(params.walletParams, "walletParams");
      if (!this.wallet) {
        throw new Error("Wallet is required when using walletParams");
      }
      const { protocolID, keyID, counterparty = "self" } = params.walletParams;
      const { publicKey } = await this.wallet.getPublicKey({
        protocolID,
        keyID,
        counterparty
      });
      const pubKeyToHash = PublicKey.fromString(publicKey);
      data = pubKeyToHash.toHash();
    } else {
      throw new Error("One of pubkeyhash, publicKey, or walletParams is required");
    }
    if (!data || data.length !== 20) {
      throw new Error("Failed to generate valid public key hash (must be 20 bytes)");
    }
    return new LockingScript([
      { op: OP.OP_DUP },
      { op: OP.OP_HASH160 },
      { op: data.length, data },
      { op: OP.OP_EQUALVERIFY },
      { op: OP.OP_CHECKSIG }
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
  unlock(params) {
    if (!this.wallet) {
      throw new Error("Wallet is required for unlocking");
    }
    const protocolID = params?.protocolID ?? [2, "p2pkh"];
    const keyID = params?.keyID ?? "0";
    const counterparty = params?.counterparty ?? "self";
    const signOutputs = params?.signOutputs ?? "all";
    const anyoneCanPay = params?.anyoneCanPay ?? false;
    const sourceSatoshis = params?.sourceSatoshis;
    const lockingScript = params?.lockingScript;
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
          hashToDirectlySign: Hash.hash256(preimage),
          protocolID,
          keyID,
          counterparty
        });
        const { publicKey } = await wallet.getPublicKey({
          protocolID,
          keyID,
          counterparty
        });
        const rawSignature = Signature.fromDER(signature, "hex");
        const sig = new TransactionSignature2(
          rawSignature.r,
          rawSignature.s,
          signatureScope
        );
        const sigForScript = sig.toChecksigFormat();
        const pubkeyForScript = PublicKey.fromString(publicKey).encode(true);
        return new UnlockingScript([
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
import {
  LockingScript as LockingScript2,
  Utils
} from "@bsv/sdk";

// src/utils/constants.ts
var ORDINAL_MAP_PREFIX = "1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5";
var DEFAULT_SAT_PER_KB = 100;

// src/script-templates/ordinal.ts
var toHex = (str) => {
  return Utils.toHex(Utils.toArray(str));
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
  async lock(params) {
    if (params.inscription !== void 0) {
      if (typeof params.inscription !== "object" || params.inscription === null) {
        throw new Error("inscription must be an object with dataB64 and contentType properties");
      }
      if (!params.inscription.dataB64 || typeof params.inscription.dataB64 !== "string") {
        throw new Error("inscription.dataB64 is required and must be a base64 string");
      }
      if (!params.inscription.contentType || typeof params.inscription.contentType !== "string") {
        throw new Error("inscription.contentType is required and must be a string (MIME type)");
      }
    }
    if (params.metadata !== void 0) {
      if (typeof params.metadata !== "object" || params.metadata === null) {
        throw new Error("metadata must be an object");
      }
      if (!params.metadata.app || typeof params.metadata.app !== "string") {
        throw new Error("metadata.app is required and must be a string");
      }
      if (!params.metadata.type || typeof params.metadata.type !== "string") {
        throw new Error("metadata.type is required and must be a string");
      }
    }
    let lockingScript;
    if ("pubkeyhash" in params) {
      lockingScript = await this.p2pkh.lock({ pubkeyhash: params.pubkeyhash });
    } else if ("publicKey" in params) {
      lockingScript = await this.p2pkh.lock({ publicKey: params.publicKey });
    } else if ("walletParams" in params) {
      lockingScript = await this.p2pkh.lock({ walletParams: params.walletParams });
    } else {
      throw new Error("One of pubkeyhash, publicKey, or walletParams is required");
    }
    return applyInscription(lockingScript, params.inscription, params.metadata);
  }
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
  unlock(params) {
    return this.p2pkh.unlock(params);
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
  return LockingScript2.fromASM(inscriptionAsm);
};

// src/transaction-template/transaction.ts
import {
  Transaction as Transaction4,
  SatoshisPerKilobyte,
  Beef
} from "@bsv/sdk";

// src/utils/mockWallet.ts
import {
  PrivateKey,
  KeyDeriver
} from "@bsv/sdk";
import { WalletStorageManager, Services, Wallet, StorageClient, WalletSigner } from "@bsv/wallet-toolbox-client";
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
    const keyDeriver = new KeyDeriver(new PrivateKey(privateKey, "hex"));
    const storageManager = new WalletStorageManager(keyDeriver.identityKey);
    const signer = new WalletSigner(chain, keyDeriver, storageManager);
    const services = new Services(chain);
    const wallet = new Wallet(signer, services);
    const client = new StorageClient(wallet, storageURL);
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
import { LockingScript as LockingScript3, Utils as Utils2 } from "@bsv/sdk";
var isHex = (str) => {
  if (str.length === 0) return true;
  if (str.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(str);
};
var toHexField = (field) => {
  if (Array.isArray(field)) {
    return Utils2.toHex(field);
  }
  if (isHex(field)) {
    return field.toLowerCase();
  }
  return Utils2.toHex(Utils2.toArray(field));
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
  return LockingScript3.fromASM(fullAsm);
};

// src/utils/derivation.ts
import { brc29ProtocolID } from "@bsv/wallet-toolbox-client";
import { Random, Utils as Utils3 } from "@bsv/sdk";
function getDerivation() {
  const derivationPrefix = Utils3.toBase64(Random(8));
  const derivationSuffix = Utils3.toBase64(Random(8));
  return {
    protocolID: brc29ProtocolID,
    keyID: derivationPrefix + " " + derivationSuffix
  };
}

// src/utils/scriptValidation.ts
import { Script as Script4, Utils as Utils4 } from "@bsv/sdk";
var SCRIPT_TEMPLATES = {
  p2pkh: {
    // OP_DUP OP_HASH160 [20 bytes] OP_EQUALVERIFY OP_CHECKSIG
    prefix: "76a914",
    suffix: "88ac",
    hashLength: 20
  },
  ordinalEnvelope: {
    // OP_0 OP_IF 'ord' OP_1 'application/bsv-20' OP_0 (BSV-20 standard)
    start: "0063036f726451126170706c69636174696f6e2f6273762d323000"
  },
  opReturn: {
    // OP_RETURN opcode
    opcode: "6a"
  }
};
function validateInput(input, functionName) {
  if (input === null || input === void 0) {
    throw new Error(`${functionName}: Input cannot be null or undefined`);
  }
  const inputType = typeof input;
  if (Array.isArray(input)) {
    throw new Error(`${functionName}: Input cannot be an array. Expected LockingScript, Script, or hex string`);
  }
  if (inputType !== "string" && inputType !== "object") {
    throw new Error(`${functionName}: Input must be a LockingScript, Script, or hex string, got ${inputType}`);
  }
  if (inputType === "object") {
    const scriptObj = input;
    if (typeof scriptObj.toHex !== "function" || typeof scriptObj.toASM !== "function") {
      throw new Error(`${functionName}: Object must be a LockingScript or Script with toHex() and toASM() methods`);
    }
  }
  if (inputType === "string") {
    const str = input;
    if (str.length > 0 && !/^[0-9a-fA-F]*$/.test(str)) {
      throw new Error(`${functionName}: String must be a valid hexadecimal string`);
    }
    if (str.length % 2 !== 0) {
      throw new Error(`${functionName}: Hex string must have even length`);
    }
  }
}
function scriptToHex(script) {
  return script.toHex();
}
function isP2PKH(input) {
  validateInput(input, "isP2PKH");
  try {
    const hex = typeof input === "string" ? input : scriptToHex(input);
    const { prefix, suffix, hashLength } = SCRIPT_TEMPLATES.p2pkh;
    const expectedLength = 4 + 2 + hashLength * 2 + 4;
    if (hex.length !== expectedLength) {
      return false;
    }
    if (!hex.startsWith(prefix)) {
      return false;
    }
    const lengthByte = hex.substring(4, 6);
    if (lengthByte !== "14") {
      return false;
    }
    if (!hex.endsWith(suffix)) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}
function isOrdinal(input) {
  validateInput(input, "isOrdinal");
  try {
    const hex = typeof input === "string" ? input : scriptToHex(input);
    if (!hasOrd(hex)) {
      return false;
    }
    const p2pkhPattern = /76a914[0-9a-fA-F]{40}88ac/;
    const hasP2PKH = p2pkhPattern.test(hex);
    return hasP2PKH;
  } catch (error) {
    return false;
  }
}
function hasOrd(input) {
  validateInput(input, "hasOrd");
  try {
    const hex = typeof input === "string" ? input : scriptToHex(input);
    const { start } = SCRIPT_TEMPLATES.ordinalEnvelope;
    return hex.includes(start);
  } catch (error) {
    return false;
  }
}
function hasOpReturnData(input) {
  validateInput(input, "hasOpReturnData");
  try {
    if (typeof input === "string") {
      try {
        const script = Script4.fromHex(input);
        const asm = script.toASM();
        if (asm.includes("OP_RETURN")) {
          return true;
        }
      } catch {
      }
      if (input.startsWith("6a")) {
        return true;
      }
      const patterns = [
        /88ac6a/,
        // OP_CHECKSIG followed by OP_RETURN
        /686a/,
        // OP_ENDIF followed by OP_RETURN
        /ae6a/
        // OP_CHECKMULTISIG followed by OP_RETURN
      ];
      return patterns.some((pattern) => pattern.test(input));
    } else {
      return input.toASM().includes("OP_RETURN");
    }
  } catch (error) {
    return false;
  }
}
function getScriptType(input) {
  validateInput(input, "getScriptType");
  try {
    if (typeof input === "string" ? isOrdinal(input) : isOrdinal(input)) {
      return "Ordinal";
    }
    if (typeof input === "string" ? isP2PKH(input) : isP2PKH(input)) {
      return "P2PKH";
    }
    if (typeof input === "string" ? hasOpReturnData(input) : hasOpReturnData(input)) {
      const hex = typeof input === "string" ? input : scriptToHex(input);
      if (hex.startsWith("6a")) {
        return "OpReturn";
      }
    }
    return "Custom";
  } catch (error) {
    return "Custom";
  }
}
function extractInscriptionData(input) {
  validateInput(input, "extractInscriptionData");
  const script = typeof input === "string" ? Script4.fromHex(input) : input;
  const chunks = script.chunks;
  if (typeof input === "string" ? !hasOrd(input) : !hasOrd(input)) {
    return null;
  }
  const endifIndex = chunks.findIndex((chunk) => chunk.op === 104);
  if (endifIndex === -1) {
    throw new Error("extractInscriptionData: Malformed ordinal script - missing OP_ENDIF");
  }
  let contentType;
  let dataB64;
  if (endifIndex === 9) {
    const contentTypeChunk = chunks[6];
    if (!contentTypeChunk || !contentTypeChunk.data || contentTypeChunk.data.length === 0) {
      throw new Error("extractInscriptionData: Missing content type data at chunk 6");
    }
    try {
      contentType = Utils4.toUTF8(contentTypeChunk.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`extractInscriptionData: Invalid UTF-8 in content type: ${message}`);
    }
    const dataChunk = chunks[8];
    if (!dataChunk || !dataChunk.data || dataChunk.data.length === 0) {
      throw new Error("extractInscriptionData: Missing inscription data at chunk 8");
    }
    dataB64 = Buffer.from(dataChunk.data).toString("base64");
  } else if (endifIndex === 7) {
    const dataChunk = chunks[6];
    if (!dataChunk || !dataChunk.data || dataChunk.data.length === 0) {
      throw new Error("extractInscriptionData: Missing inscription data at chunk 6");
    }
    contentType = "application/octet-stream";
    dataB64 = Buffer.from(dataChunk.data).toString("base64");
  } else {
    throw new Error(`extractInscriptionData: Unexpected OP_ENDIF position at index ${endifIndex}. Expected 7 (without content type) or 9 (with content type)`);
  }
  return {
    dataB64,
    contentType
  };
}
function extractMapMetadata(input) {
  validateInput(input, "extractMapMetadata");
  if (typeof input === "string" ? !hasOpReturnData(input) : !hasOpReturnData(input)) {
    return null;
  }
  const script = typeof input === "string" ? Script4.fromHex(input) : input;
  const chunks = script.chunks;
  const opReturnIndex = chunks.findIndex((chunk) => chunk.op === 106);
  if (opReturnIndex === -1) {
    return null;
  }
  const prefixChunk = chunks[opReturnIndex + 1];
  if (!prefixChunk || !prefixChunk.data || prefixChunk.data.length === 0) {
    return null;
  }
  let prefix;
  try {
    prefix = Utils4.toUTF8(prefixChunk.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`extractMapMetadata: Invalid UTF-8 in MAP prefix: ${message}`);
  }
  if (prefix !== ORDINAL_MAP_PREFIX) {
    return null;
  }
  const cmdChunk = chunks[opReturnIndex + 2];
  if (!cmdChunk || !cmdChunk.data || cmdChunk.data.length === 0) {
    return null;
  }
  let cmd;
  try {
    cmd = Utils4.toUTF8(cmdChunk.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`extractMapMetadata: Invalid UTF-8 in command: ${message}`);
  }
  if (cmd !== "SET") {
    return null;
  }
  const metadata = {};
  let currentIndex = opReturnIndex + 3;
  while (currentIndex < chunks.length - 1) {
    const keyChunk = chunks[currentIndex];
    const valueChunk = chunks[currentIndex + 1];
    if (!keyChunk?.data || !valueChunk?.data) {
      break;
    }
    try {
      const key = Utils4.toUTF8(keyChunk.data);
      const value = Utils4.toUTF8(valueChunk.data);
      metadata[key] = value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`extractMapMetadata: Invalid UTF-8 in metadata key-value pair: ${message}`);
    }
    currentIndex += 2;
  }
  if (!metadata.app || !metadata.type) {
    return null;
  }
  return metadata;
}
function extractOpReturnData(input) {
  validateInput(input, "extractOpReturnData");
  if (typeof input === "string" ? !hasOpReturnData(input) : !hasOpReturnData(input)) {
    return null;
  }
  const script = typeof input === "string" ? Script4.fromHex(input) : input;
  const chunks = script.chunks;
  const opReturnIndex = chunks.findIndex((chunk) => chunk.op === 106);
  if (opReturnIndex === -1) {
    return null;
  }
  const dataFields = [];
  for (let i = opReturnIndex + 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (chunk.data && chunk.data.length > 0) {
      dataFields.push(Utils4.toBase64(chunk.data));
    }
  }
  return dataFields.length > 0 ? dataFields : null;
}

// src/transaction-template/types/type-guards.ts
function isDerivationParams(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/transaction-template/transaction.ts
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
   * @param params - Object containing input parameters
   * @returns A new InputBuilder for the new input
   */
  addP2PKHInput(params) {
    return this.parent.addP2PKHInput(params);
  }
  /**
   * Adds an ordinalP2PKH input to the transaction.
   *
   * @param params - Object containing input parameters
   * @returns A new InputBuilder for the new input
   */
  addOrdinalP2PKHInput(params) {
    return this.parent.addOrdinalP2PKHInput(params);
  }
  /**
   * Adds a custom input with a pre-built unlocking script template.
   *
   * @param params - Object containing input parameters
   * @returns A new InputBuilder for the new input
   */
  addCustomInput(params) {
    return this.parent.addCustomInput(params);
  }
  /**
   * Adds a P2PKH output to the transaction.
   *
   * @param params - Object with publicKey/walletParams, satoshis, and optional description
   * @returns A new OutputBuilder for the new output
   */
  addP2PKHOutput(params) {
    return this.parent.addP2PKHOutput(params);
  }
  /**
   * Adds a change output that automatically calculates the change amount.
   *
   * @param params - Optional object with publicKey/walletParams and description
   * @returns A new OutputBuilder for the new output
   */
  addChangeOutput(params) {
    return this.parent.addChangeOutput(params);
  }
  /**
   * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
   *
   * @param params - Object with publicKey/walletParams, satoshis, and optional inscription, metadata, description
   * @returns A new OutputBuilder for the new output
   */
  addOrdinalP2PKHOutput(params) {
    return this.parent.addOrdinalP2PKHOutput(params);
  }
  /**
   * Adds a custom output with a pre-built locking script.
   *
   * @param params - Object with lockingScript, satoshis, and optional description
   * @returns A new OutputBuilder for the new output
   */
  addCustomOutput(params) {
    return this.parent.addCustomOutput(params);
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
  /**
   * Preview the transaction without executing it (convenience proxy to TransactionTemplate).
   * Equivalent to calling build({ preview: true }).
   *
   * @returns Promise resolving to the createAction arguments object
   */
  async preview() {
    return this.parent.build({ preview: true });
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
   * @param params - Object with publicKey/walletParams, satoshis, and optional description
   * @returns A new OutputBuilder for the new output
   */
  addP2PKHOutput(params) {
    return this.parent.addP2PKHOutput(params);
  }
  /**
   * Adds a change output that automatically calculates the change amount.
   *
   * @param params - Optional object with publicKey/walletParams and description
   * @returns A new OutputBuilder for the new output
   */
  addChangeOutput(params) {
    return this.parent.addChangeOutput(params);
  }
  /**
   * Adds a P2PKH input to the transaction.
   *
   * @param params - Object containing input parameters
   * @returns A new InputBuilder for the new input
   */
  addP2PKHInput(params) {
    return this.parent.addP2PKHInput(params);
  }
  /**
   * Adds an ordinalP2PKH input to the transaction.
   *
   * @param params - Object containing input parameters
   * @returns A new InputBuilder for the new input
   */
  addOrdinalP2PKHInput(params) {
    return this.parent.addOrdinalP2PKHInput(params);
  }
  /**
   * Adds a custom input with a pre-built unlocking script template.
   *
   * @param params - Object containing input parameters
   * @returns A new InputBuilder for the new input
   */
  addCustomInput(params) {
    return this.parent.addCustomInput(params);
  }
  /**
   * Adds an ordinalP2PKH (1Sat Ordinal + P2PKH) output to the transaction.
   *
   * @param params - Object with publicKey/walletParams, satoshis, and optional inscription, metadata, description
   * @returns A new OutputBuilder for the new output
   */
  addOrdinalP2PKHOutput(params) {
    return this.parent.addOrdinalP2PKHOutput(params);
  }
  /**
   * Adds a custom output with a pre-built locking script.
   *
   * @param params - Object with lockingScript, satoshis, and optional description
   * @returns A new OutputBuilder for the new output
   */
  addCustomOutput(params) {
    return this.parent.addCustomOutput(params);
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
  /**
   * Preview the transaction without executing it (convenience proxy to TransactionTemplate).
   * Equivalent to calling build({ preview: true }).
   *
   * @returns Promise resolving to the createAction arguments object
   */
  async preview() {
    return this.parent.build({ preview: true });
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
  addP2PKHInput(params) {
    if (typeof params.sourceOutputIndex !== "number" || params.sourceOutputIndex < 0) {
      throw new Error("sourceOutputIndex must be a non-negative number");
    }
    if (params.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    const inputConfig = {
      type: "p2pkh",
      sourceTransaction: params.sourceTransaction,
      sourceOutputIndex: params.sourceOutputIndex,
      description: params.description,
      walletParams: params.walletParams,
      signOutputs: params.signOutputs ?? "all",
      anyoneCanPay: params.anyoneCanPay ?? false,
      sourceSatoshis: params.sourceSatoshis,
      lockingScript: params.lockingScript
    };
    this.inputs.push(inputConfig);
    return new InputBuilder(this, inputConfig);
  }
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
  addOrdinalP2PKHInput(params) {
    if (typeof params.sourceOutputIndex !== "number" || params.sourceOutputIndex < 0) {
      throw new Error("sourceOutputIndex must be a non-negative number");
    }
    if (params.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    const inputConfig = {
      type: "ordinalP2PKH",
      sourceTransaction: params.sourceTransaction,
      sourceOutputIndex: params.sourceOutputIndex,
      description: params.description,
      walletParams: params.walletParams,
      signOutputs: params.signOutputs ?? "all",
      anyoneCanPay: params.anyoneCanPay ?? false,
      sourceSatoshis: params.sourceSatoshis,
      lockingScript: params.lockingScript
    };
    this.inputs.push(inputConfig);
    return new InputBuilder(this, inputConfig);
  }
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
  addCustomInput(params) {
    if (!params.unlockingScriptTemplate) {
      throw new Error("unlockingScriptTemplate is required for custom input");
    }
    if (typeof params.sourceOutputIndex !== "number" || params.sourceOutputIndex < 0) {
      throw new Error("sourceOutputIndex must be a non-negative number");
    }
    if (params.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    const inputConfig = {
      type: "custom",
      unlockingScriptTemplate: params.unlockingScriptTemplate,
      sourceTransaction: params.sourceTransaction,
      sourceOutputIndex: params.sourceOutputIndex,
      description: params.description,
      sourceSatoshis: params.sourceSatoshis,
      lockingScript: params.lockingScript
    };
    this.inputs.push(inputConfig);
    return new InputBuilder(this, inputConfig);
  }
  /**
   * Adds a P2PKH output to the transaction.
   *
   * @param params - Object containing output parameters
   * @returns An OutputBuilder for configuring this output
   */
  addP2PKHOutput(params) {
    if (typeof params.satoshis !== "number" || params.satoshis < 0) {
      throw new Error("satoshis must be a non-negative number");
    }
    if (params.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    let addressOrParams;
    if ("publicKey" in params) {
      addressOrParams = params.publicKey;
    } else if ("walletParams" in params) {
      addressOrParams = params.walletParams;
    }
    const outputConfig = {
      type: "p2pkh",
      satoshis: params.satoshis,
      description: params.description,
      addressOrParams
    };
    this.outputs.push(outputConfig);
    return new OutputBuilder(this, outputConfig);
  }
  /**
   * Adds a change output to the transaction.
   *
   * @param params - Optional object containing output parameters
   * @returns An OutputBuilder for configuring this output
   */
  addChangeOutput(params) {
    if (params?.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    let addressOrParams;
    if (params && "publicKey" in params) {
      addressOrParams = params.publicKey;
    } else if (params && "walletParams" in params) {
      addressOrParams = params.walletParams;
    }
    const outputConfig = {
      type: "change",
      description: params?.description || "Change",
      addressOrParams
    };
    this.outputs.push(outputConfig);
    return new OutputBuilder(this, outputConfig);
  }
  /**
   * Adds an ordinalP2PKH output to the transaction.
   *
   * @param params - Object containing output parameters
   * @returns An OutputBuilder for configuring this output
   */
  addOrdinalP2PKHOutput(params) {
    if (typeof params.satoshis !== "number" || params.satoshis < 0) {
      throw new Error("satoshis must be a non-negative number");
    }
    if (params.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    let addressOrParams;
    if ("publicKey" in params) {
      addressOrParams = params.publicKey;
    } else if ("walletParams" in params) {
      addressOrParams = params.walletParams;
    }
    const outputConfig = {
      type: "ordinalP2PKH",
      satoshis: params.satoshis,
      description: params.description,
      addressOrParams,
      inscription: params.inscription,
      metadata: params.metadata
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
   * @param params - Object containing lockingScript, satoshis, and optional description
   * @returns An OutputBuilder for configuring this output
   */
  addCustomOutput(params) {
    if (!params.lockingScript || typeof params.lockingScript.toHex !== "function") {
      throw new Error("lockingScript must be a LockingScript instance");
    }
    if (typeof params.satoshis !== "number" || params.satoshis < 0) {
      throw new Error("satoshis must be a non-negative number");
    }
    if (params.description !== void 0 && typeof params.description !== "string") {
      throw new Error("description must be a string");
    }
    const outputConfig = {
      type: "custom",
      satoshis: params.satoshis,
      description: params.description,
      lockingScript: params.lockingScript
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
          unlockingScriptTemplate = p2pkh.unlock({
            protocolID: walletParams?.protocolID,
            keyID: walletParams?.keyID,
            counterparty: walletParams?.counterparty,
            signOutputs: config.signOutputs,
            anyoneCanPay: config.anyoneCanPay
          });
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
            lockingScript = await p2pkh.lock({ walletParams: addressOrParams });
          } else {
            lockingScript = await p2pkh.lock({ publicKey: addressOrParams });
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
            lockingScript = await ordinal.lock({
              walletParams: addressOrParams,
              inscription: config.inscription,
              metadata: config.metadata
            });
          } else {
            lockingScript = await ordinal.lock({
              publicKey: addressOrParams,
              inscription: config.inscription,
              metadata: config.metadata
            });
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
            lockingScript = await p2pkh.lock({ walletParams: addressOrParams });
          } else {
            lockingScript = await p2pkh.lock({ publicKey: addressOrParams });
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
      const tx = new Transaction4();
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
      await tx.fee(new SatoshisPerKilobyte(DEFAULT_SAT_PER_KB));
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
        const mergedBeef = new Beef();
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
  /**
   * Preview the transaction without executing it.
   * Equivalent to calling build({ preview: true }).
   *
   * @returns Promise resolving to the createAction arguments object
   */
  async preview() {
    return this.build({ preview: true });
  }
};
export {
  InputBuilder,
  OutputBuilder,
  TransactionTemplate,
  OrdP2PKH as WalletOrdP2PKH,
  P2PKH as WalletP2PKH,
  addOpReturnData,
  calculatePreimage,
  extractInscriptionData,
  extractMapMetadata,
  extractOpReturnData,
  getDerivation,
  getScriptType,
  hasOpReturnData,
  hasOrd,
  isOrdinal,
  isP2PKH,
  makeWallet
};
