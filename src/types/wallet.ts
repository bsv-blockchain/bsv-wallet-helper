import { WalletProtocol, WalletCounterparty } from "@bsv/sdk";

/**
 * Parameters for deriving a public key from a BRC-100 wallet.
 */
export type WalletDerivationParams = {
  protocolID: WalletProtocol;
  keyID: string;
  counterparty: WalletCounterparty;
};
