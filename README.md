# BSV Wallet Script Templates

Wallet-compatible script templates for Bitcoin SV (BSV) that support BRC-100 wallet interfaces instead of requiring direct private key access.

## Features

- ✅ **BRC-100 Compatible** - Works with BRC-100 wallet interfaces
- ✅ **Hierarchical Key Derivation** - Supports protocolID, keyID, and counterparty parameters
- ✅ **1Sat Ordinals Support** - Create ordinal inscriptions with file data and MAP metadata
- ✅ **Type Safe** - Full TypeScript support with comprehensive types
- ✅ **Secure** - Never exposes private keys to application layer

## Installation

```bash
npm install your-package-name
```

## Exported API

### Script Templates

#### `WalletP2PKH`
Wallet-compatible Pay-to-Public-Key-Hash template.

```typescript
import { WalletP2PKH, type WalletDerivationParams } from 'your-package-name';

// Option 1: Direct public key/hash
const p2pkh = new WalletP2PKH();
const lockingScript = await p2pkh.lock(publicKeyHex);

// Option 2: With BRC-100 wallet
const p2pkh = new WalletP2PKH(wallet);
const lockingScript = await p2pkh.lock({
  protocolID: [2, 'p2pkh'],
  keyID: '0',
  counterparty: 'self'
});

// Unlocking (requires wallet)
const unlockingTemplate = p2pkh.unlock(
  protocolID: [2, 'p2pkh'],
  keyID: '0',
  counterparty: 'self'
);
```

#### `WalletOrdP2PKH`
Wallet-compatible template for 1Sat Ordinals with inscription and MAP metadata support.

```typescript
import { WalletOrdP2PKH, type Inscription, type MAP } from 'your-package-name';

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

const lockingScript = await ordP2pkh.lock(
  { 
    protocolID: [2, 'p2pkh'], 
    keyID: '0', 
    counterparty: 'self' 
  },
  inscription,
  metadata
);
```

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

#### `makeWallet(chain, storageURL, privateKey)`
Creates a BRC-100 compatible wallet for testing or backend use.

```typescript
import { makeWallet } from 'your-package-name';

const wallet = await makeWallet(
  'test',                    // Chain: 'test' or 'main'
  'https://storage-url.com', // Storage provider URL
  privateKeyHex              // Private key as hex string
);
```

**Parameters:**
- `chain`: `'test' | 'main'` - Blockchain network
- `storageURL`: `string` - Storage provider URL
- `privateKey`: `string` - Private key as hex string

**Throws:** `Error` if parameters are invalid or wallet creation fails

#### `calculatePreimage(tx, inputIndex, signOutputs, anyoneCanPay, sourceSatoshis?, lockingScript?)`
Calculates the transaction preimage for signing.

```typescript
import { calculatePreimage } from 'your-package-name';

const { preimage, signatureScope } = calculatePreimage(
  transaction,
  0,          // Input index
  'all',      // Sign outputs: 'all' | 'none' | 'single'
  false,      // anyoneCanPay flag
  1000,       // Optional: source satoshis
  script      // Optional: locking script
);
```

**Parameters:**
- `tx`: `Transaction` - Transaction to sign
- `inputIndex`: `number` - Index of input being signed
- `signOutputs`: `'all' | 'none' | 'single'` - Signature scope
- `anyoneCanPay`: `boolean` - SIGHASH_ANYONECANPAY flag
- `sourceSatoshis?`: `number` - Optional satoshi amount (or use input.sourceTransaction)
- `lockingScript?`: `Script` - Optional locking script (or use input.sourceTransaction)

**Returns:** `{ preimage: number[], signatureScope: number }`

**Throws:** `Error` if parameters are invalid or required data is missing

## ⚠️ Important: Lock and Unlock Key Consistency

**You MUST use matching derivation parameters for lock and unlock operations.**

### ✅ Correct Usage

```typescript
const wallet = await makeWallet('test', storageURL, privateKeyHex);
const p2pkh = new WalletP2PKH(wallet);

const params = {
  protocolID: [2, 'p2pkh'] as WalletProtocol,
  keyID: '0',
  counterparty: 'self' as WalletCounterparty
};

// Lock with wallet derivation
const lockingScript = await p2pkh.lock(params);

// Unlock with SAME derivation params
const unlockingTemplate = p2pkh.unlock(
  protocolID: params.protocolID,
  keyID: params.keyID,
  counterparty: params.counterparty
);
```

### ❌ Incorrect Usage

```typescript
// Lock with direct public key
const lockingScript = await p2pkh.lock(publicKeyHex);

// Try to unlock with different derivation params
// This WILL FAIL even if from same private key!
const unlockingTemplate = p2pkh.unlock(
  [2, 'different-protocol'],  // Different protocol
  '1',                         // Different keyID
  'counterparty'               // Different counterparty
);
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
const unlockingTemplate = p2pkh.unlock(
  protocolID: utxo.derivationParams.protocolID,
  keyID: utxo.derivationParams.keyID,
  counterparty: utxo.derivationParams.counterparty
);
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
const original = await ordP2pkh.lock(
  params,
  { dataB64: largeImage, contentType: 'image/png' },
  { app: 'gallery', type: 'art', owner: 'alice' }
);

// Later: Update metadata only (saves transaction fees)
const updated = await ordP2pkh.lock(
  params,
  undefined,  // No file data
  { app: 'gallery', type: 'art', owner: 'bob', sold: 'true' }
);
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
