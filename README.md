# BSV Wallet Helper

Wallet-compatible utilities and script templates for Bitcoin SV (BSV) that support BRC-100 wallet interfaces instead of requiring direct private key access.

## Features

- ✅ **BRC-100 Compatible** - Works with BRC-100 wallet interfaces
- ✅ **Hierarchical Key Derivation** - Supports protocolID, keyID, and counterparty parameters
- ✅ **1Sat Ordinals Support** - Create ordinal inscriptions with file data and MAP metadata
- ✅ **Type Safe** - Full TypeScript support with comprehensive types
- ✅ **Secure** - Never exposes private keys to application layer

## Installation

```bash
npm install bsv-wallet-helper
```

## Exported API

### Transaction Builder

#### `TransactionTemplate`
Fluent transaction builder that simplifies creating BSV transactions with a clean, chainable API.

```typescript
import { TransactionTemplate } from 'bsv-wallet-helper';

// Simple P2PKH transaction with metadata
const result = await new TransactionTemplate(wallet, "Payment to Bob")
  .addP2PKHOutput({ publicKey: bobPublicKey, satoshis: 1000, description: "Payment" })
    .addOpReturn(['APP_ID', JSON.stringify({ memo: 'Thanks!' })])
  .build();

console.log(`Transaction created: ${result.txid}`);

// Preview mode - see what will be sent without executing
const preview = await new TransactionTemplate(wallet)
  .addP2PKHOutput({ publicKey: alicePublicKey, satoshis: 5000 })
  .build({ preview: true });

console.log('Transaction preview:', preview);
```

**Features:**
- Fluent API with method chaining
- Support for P2PKH, Ordinal P2PKH, and custom outputs
- **Automatic BRC-29 derivation** - omit addressOrParams to use secure random key derivation
- **Automatic change outputs** with fee calculation
- Per-output OP_RETURN metadata
- Per-output basket and customInstructions fields
- Transaction-level options (randomizeOutputs, trustSelf, etc.)
- Preview mode to inspect before execution
- Input support for spending UTXOs

📖 **[Complete Documentation](./docs/transaction-template.md)**

**Example with automatic change:**
```typescript
// Change is automatically calculated: inputs - outputs - fees
await new TransactionTemplate(wallet, "Payment with change")
  .addP2PKHInput({ sourceTransaction, sourceOutputIndex: 0, walletParams, description: "UTXO" })
  .addP2PKHOutput({ publicKey: recipientPublicKey, satoshis: 5000, description: "Payment" })
  .addChangeOutput({ walletParams, description: "Change" }) // Satoshis calculated automatically!
  .build();
```

**Example with BRC-29 auto-derivation, basket, and customInstructions:**
```typescript
// Omit publicKey/walletParams to use automatic BRC-29 derivation
// Derivation info is automatically added to customInstructions
await new TransactionTemplate(wallet, "Auto-derived transaction")
  .addP2PKHOutput({ satoshis: 1000, description: "Payment" })  // Uses BRC-29 derivation
    .basket("my-basket")  // Set basket for this output
    .customInstructions("app-specific-data")  // Append custom instructions
  .build();

// The output will have customInstructions with both app data and derivation info
```

### Script Templates

#### `WalletP2PKH`
Wallet-compatible Pay-to-Public-Key-Hash template.

```typescript
import { WalletP2PKH, type WalletDerivationParams } from 'bsv-wallet-helper';

// Option 1: Direct public key
const p2pkh = new WalletP2PKH();
const lockingScript = await p2pkh.lock({ publicKey: publicKeyHex });

// Option 2: With BRC-100 wallet
const p2pkh = new WalletP2PKH(wallet);
const lockingScript = await p2pkh.lock({
  walletParams: {
    protocolID: [2, 'p2pkh'],
    keyID: '0',
    counterparty: 'self'
  }
});

// Unlocking (requires wallet)
const unlockingTemplate = p2pkh.unlock({
  protocolID: [2, 'p2pkh'],
  keyID: '0',
  counterparty: 'self'
});
```

#### `WalletOrdP2PKH`
Wallet-compatible template for 1Sat Ordinals with inscription and MAP metadata support.

```typescript
import { WalletOrdP2PKH, type Inscription, type MAP } from 'bsv-wallet-helper';

// Create ordinal with inscription and metadata
const ordP2pkh = new WalletOrdP2PKH(wallet);

const inscription: Inscription = {
  dataB64: Buffer.from('Hello, Ordinals!').toString('base64'),
  contentType: 'text/plain'
};

const metadata: MAP = {
  app: 'my-app',
  type: 'greeting',
  author: 'Satoshi'
};

const lockingScript = await ordP2pkh.lock({
  walletParams: {
    protocolID: [2, 'p2pkh'],
    keyID: '0',
    counterparty: 'self'
  },
  inscription,
  metadata
});
```

**Note:** For wallet compatible multisig scripts see 'https://github.com/bsv-blockchain/ts-templates'.

### Types

#### `WalletDerivationParams`
Parameters for deriving keys from a BRC-100 wallet.

```typescript
type WalletDerivationParams = {
  protocolID: WalletProtocol;  // e.g., [2, 'p2pkh']
  keyID: string;               // e.g., '0'
  counterparty: WalletCounterparty;  // e.g., 'self'
};
```

**Note:** When wallet derivation parameters are omitted, the library uses the BRC-29 derivation scheme by default (using `brc29ProtocolID` from `@bsv/wallet-toolbox-client` and a randomly generated keyID), with `counterparty` defaulting to `'self'`.

#### `Inscription`
1Sat Ordinal inscription data.

```typescript
type Inscription = {
  dataB64: string;      // Base64 encoded file data
  contentType: string;  // MIME type (e.g., 'image/png', 'text/plain')
};
```

#### `MAP`
MAP (Magic Attribute Protocol) metadata for ordinals.

```typescript
type MAP = {
  app: string;          // Application identifier (required)
  type: string;         // Data type identifier (required)
  [key: string]: string;  // Additional custom fields
};
```

### Utilities

Helper functions for wallet creation, transaction signing, script manipulation, validation, and data extraction.

📖 **[Complete Utilities Documentation](./docs/utilities.md)**

Includes:
- **Wallet Creation**: `makeWallet()` for creating BRC-100 wallets
- **Transaction Signing**: `calculatePreimage()` for signature generation
- **Script Utilities**: `addOpReturnData()` for adding metadata
- **Script Validation**: `isP2PKH()`, `isOrdinal()`, `hasOrd()`, `hasOpReturnData()`
- **Script Type Detection**: `getScriptType()` to identify script types
- **Data Extraction**: `extractOpReturnData()`, `extractMapMetadata()`, `extractInscriptionData()`
- **Key Derivation**: `getDerivation()` for BRC-29 key derivation

## ⚠️ Important: Lock and Unlock Key Consistency

**You MUST use matching derivation parameters for lock and unlock operations.**

### ✅ Correct Usage

```typescript
const wallet = await makeWallet('test', storageURL, privateKeyHex);
const p2pkh = new WalletP2PKH(wallet);

const walletParams = {
  protocolID: [2, 'p2pkh'] as WalletProtocol,
  keyID: '0',
  counterparty: 'self' as WalletCounterparty
};

// Lock with wallet derivation
const lockingScript = await p2pkh.lock({ walletParams });

// Unlock with SAME derivation params
const unlockingTemplate = p2pkh.unlock({
  protocolID: walletParams.protocolID,
  keyID: walletParams.keyID,
  counterparty: walletParams.counterparty
});
```

### ❌ Incorrect Usage

```typescript
// Lock with direct public key
const lockingScript = await p2pkh.lock({ publicKey: publicKeyHex });

// Try to unlock with different derivation params
// This WILL FAIL even if from same private key!
const unlockingTemplate = p2pkh.unlock({
  protocolID: [2, 'different-protocol'],  // Different protocol
  keyID: '1',                              // Different keyID
  counterparty: 'counterparty'             // Different counterparty
});
```

**Why?** Each set of derivation parameters produces a different private key from the seed key -> different public key. The unlocking signature must match the exact public key hash used in the locking script.

### Best Practices

1. **Store derivation parameters** alongside the locking script
2. **Use the same parameters** when unlocking
3. **Or use direct public key** for both lock and unlock if not using wallet derivation

```typescript
// Recommended: Store params with your UTXO
type MyUTXO = {
  lockingScript: LockingScript;
  satoshis: number;
  derivationParams: WalletDerivationParams;  // Store these!
};

// Later when spending
const unlockingTemplate = p2pkh.unlock({
  protocolID: utxo.derivationParams.protocolID,
  keyID: utxo.derivationParams.keyID,
  counterparty: utxo.derivationParams.counterparty
});
```

## Examples

For complete working examples, see the test files:

- **WalletP2PKH Examples**: [src/script-templates/__tests__/p2pkh.test.ts](./src/script-templates/__tests__/p2pkh.test.ts#L146)
  - Creating and spending P2PKH transactions
  - Multiple inputs with wallet signing
  - Different signature scopes (SIGHASH_SINGLE)

- **WalletOrdP2PKH Examples**: [src/script-templates/__tests__/ordinal.test.ts](./src/script-templates/__tests__/ordinal.test.ts#L146)
  - Creating ordinals with inscriptions and metadata
  - Spending ordinal outputs
  - Reinscriptions (metadata-only updates)

## Reinscriptions (Metadata-Only Updates)

Update ordinal metadata without re-uploading file data:

```typescript
// Original inscription with file
const original = await ordP2pkh.lock({
  walletParams,
  inscription: { dataB64: largeImage, contentType: 'image/png' },
  metadata: { app: 'gallery', type: 'art', owner: 'alice' }
});

// Later: Update metadata only (saves transaction fees)
const updated = await ordP2pkh.lock({
  walletParams,
  // No inscription field = no file data
  metadata: { app: 'gallery', type: 'art', owner: 'bob', sold: 'true' }
});
```

## Comparison with Official SDK

| Feature | Official SDK P2PKH | This Library (WalletP2PKH) |
|---------|-------------------|----------------------------|
| Private Key Required | ✅ Yes | ❌ No |
| BRC-100 Wallet Support | ❌ No | ✅ Yes |
| Hierarchical Key Derivation | ❌ No | ✅ Yes |
| Hardware Wallet Compatible | ❌ No | ✅ Yes |
| Ordinals Support | ❌ No | ✅ Yes (WalletOrdP2PKH) |

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Disclaimer

This project is a work in progress and may change at any time.
It is provided as-is, without any guarantees. Use at your own risk.