import { LockingScript } from "@bsv/sdk";
import { WalletDerivationParams } from "../../types/wallet";
import { Inscription, MAP } from "../../script-templates/ordinal";

/**
 * Configuration for a transaction output
 */
export type OutputConfig =
    | {
        type: 'p2pkh';
        satoshis: number;
        description?: string;
        addressOrParams?: string | WalletDerivationParams; // Optional - uses BRC-29 derivation if not provided
        opReturnFields?: (string | number[])[];
        basket?: string;
        customInstructions?: string;
    }
    | {
        type: 'ordinalP2PKH';
        satoshis: number;
        description?: string;
        addressOrParams?: string | WalletDerivationParams; // Optional - uses BRC-29 derivation if not provided
        inscription?: Inscription;
        metadata?: MAP;
        opReturnFields?: (string | number[])[];
        basket?: string;
        customInstructions?: string;
    }
    | {
        type: 'custom';
        satoshis: number;
        description?: string;
        lockingScript: LockingScript;
        opReturnFields?: (string | number[])[];
        basket?: string;
        customInstructions?: string;
    }
    | {
        type: 'change';
        satoshis?: number; // Calculated during signing, optional for config
        description?: string;
        addressOrParams?: string | WalletDerivationParams; // Optional - uses BRC-29 derivation if not provided
        opReturnFields?: (string | number[])[];
        basket?: string;
        customInstructions?: string;
    };
