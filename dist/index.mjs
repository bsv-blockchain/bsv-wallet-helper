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
        const pubKeyToHash = PublicKey.fromString(pubkeyhashOrWalletParams);
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
      const pubKeyToHash = PublicKey.fromString(publicKey);
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
      const pubKeyToHash = PublicKey.fromString(publicKey);
      data = pubKeyToHash.toHash();
    }
    if (!data) {
      throw new Error("Failed to generate public key hash");
    }
    if (data.length !== 20) {
      throw new Error("P2PKH hash length must be 20 bytes");
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
  return LockingScript2.fromASM(inscriptionAsm);
};

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
  if (!fields || fields.length === 0) {
    throw new Error("At least one data field is required for OP_RETURN");
  }
  const hexFields = fields.map(toHexField);
  const baseAsm = script.toASM();
  const dataFieldsAsm = hexFields.join(" ");
  const fullAsm = `${baseAsm} OP_RETURN ${dataFieldsAsm}`;
  return LockingScript3.fromASM(fullAsm);
};
export {
  OrdP2PKH as WalletOrdP2PKH,
  P2PKH as WalletP2PKH,
  addOpReturnData,
  calculatePreimage,
  makeWallet
};
