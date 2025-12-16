import {
	LockingScript,
    Utils,
	Script,
	WalletInterface,
	ScriptTemplate,
	Transaction,
	UnlockingScript,
	WalletProtocol,
	WalletCounterparty,
} from "@bsv/sdk";
import P2PKH from "./p2pkh";
import { ORDINAL_MAP_PREFIX } from "../utils/constants";
import { WalletDerivationParams } from "../types/wallet";

export type Inscription = {
  dataB64: string;
  contentType: string;
};

export type MAP = {
  app: string;
  type: string;
  [prop: string]: string;
};

const toHex = (str: string) => {
	return Utils.toHex(Utils.toArray(str));
};

/**
 * OrdP2PKH (1Sat Ordinal + Pay To Public Key Hash) class implementing ScriptTemplate.
 *
 * This class provides methods to create Pay To Public Key Hash locking scripts with 1Sat Ordinal
 * inscriptions and MAP metadata using a BRC-100 compatible wallet interface.
 */
export default class OrdP2PKH implements ScriptTemplate {
	private p2pkh: P2PKH;

	/**
	 * Creates a new OrdP2PKH instance.
	 *
	 * @param wallet - Optional BRC-100 compatible wallet interface
	 */
	constructor(wallet?: WalletInterface) {
		this.p2pkh = new P2PKH(wallet);
	}

	/**
	 * Creates a 1Sat Ordinal + P2PKH locking script from a public key or public key hash.
	 *
	 * @param pubkeyhash - Either a hex string of the public key or a number array of the public key hash (20 bytes)
	 * @param inscription - Optional inscription data (base64 file data and content type)
	 * @param metaData - Optional MAP metadata (requires app and type fields)
	 * @returns A P2PKH locking script with ordinal inscription
	 */
	lock(
		pubkeyhash: string | number[],
		inscription?: Inscription,
		metaData?: MAP
	): Promise<LockingScript>
	/**
	 * Creates a 1Sat Ordinal + P2PKH locking script using the instance's BRC-100 wallet to derive the public key.
	 *
	 * @param walletParams - Wallet derivation parameters (protocolID, keyID, counterparty)
	 * @param inscription - Optional inscription data (base64 file data and content type)
	 * @param metaData - Optional MAP metadata (requires app and type fields)
	 * @returns A P2PKH locking script with ordinal inscription
	 */
	lock(
		walletParams: WalletDerivationParams,
		inscription?: Inscription,
		metaData?: MAP
	): Promise<LockingScript>
	async lock(
		pubkeyhashOrWalletParams: string | number[] | WalletDerivationParams,
		inscription?: Inscription,
		metaData?: MAP
	): Promise<LockingScript> {
		// Validate inscription structure if provided
		if (inscription !== undefined) {
			if (typeof inscription !== 'object' || inscription === null) {
				throw new Error('inscription must be an object with dataB64 and contentType properties');
			}
			if (!inscription.dataB64 || typeof inscription.dataB64 !== 'string') {
				throw new Error('inscription.dataB64 is required and must be a base64 string');
			}
			if (!inscription.contentType || typeof inscription.contentType !== 'string') {
				throw new Error('inscription.contentType is required and must be a string (MIME type)');
			}
		}

		// Validate MAP metadata structure if provided
		if (metaData !== undefined) {
			if (typeof metaData !== 'object' || metaData === null) {
				throw new Error('metaData must be an object');
			}
			if (!metaData.app || typeof metaData.app !== 'string') {
				throw new Error('metaData.app is required and must be a string');
			}
			if (!metaData.type || typeof metaData.type !== 'string') {
				throw new Error('metaData.type is required and must be a string');
			}
		}

		let lockingScript: LockingScript;

		// Check if using direct pubkeyhash or wallet derivation
		if (typeof pubkeyhashOrWalletParams === 'string' || Array.isArray(pubkeyhashOrWalletParams)) {
			// Use pubkeyhash directly
			lockingScript = await this.p2pkh.lock(pubkeyhashOrWalletParams);
		} else {
			// Use wallet to derive public key
			lockingScript = await this.p2pkh.lock(pubkeyhashOrWalletParams);
		}

		// Apply ordinal inscription and MAP metadata
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
}

/**
 * Applies ordinal inscription and MAP metadata to a P2PKH locking script.
 *
 * @param lockingScript - Base P2PKH locking script
 * @param inscription - Optional file data to inscribe (can be omitted for metadata-only updates)
 * @param metaData - Optional MAP metadata (requires both app and type fields if provided)
 * @param withSeparator - If true, adds OP_CODESEPARATOR between ordinal and P2PKH script
 * @returns Locking script with ordinal inscription and MAP metadata
 */
export const applyInscription = (
	lockingScript: LockingScript,
	inscription?: Inscription,
	metaData?: MAP,
	withSeparator = false
): LockingScript => {
	let ordAsm = "";

	// Create ordinal envelope if inscription data is provided
	if (inscription?.dataB64 !== undefined && inscription?.contentType !== undefined) {
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

	// Combine ordinal envelope with P2PKH locking script
	let inscriptionAsm = `${ordAsm ? `${ordAsm} ${withSeparator ? 'OP_CODESEPARATOR ' : ''}` : ""}${lockingScript.toASM()}`;

	// Validate and append MAP metadata if provided
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
					value as string,
				)}`;
			}
		}
	}

	return LockingScript.fromASM(inscriptionAsm);
}