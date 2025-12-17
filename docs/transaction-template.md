# TransactionTemplate - Complete Documentation

A fluent transaction builder for creating BSV transactions with a clean, chainable API that works seamlessly with BRC-100 wallets.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Advanced Usage](#advanced-usage)

## Overview

`TransactionTemplate` provides a builder pattern for constructing BSV transactions without needing to directly handle private keys or low-level transaction details. It handles:

- Output creation (P2PKH, Ordinal P2PKH, custom scripts, **automatic change**)
- Input management (spending UTXOs)
- Automatic fee calculation and change distribution
- OP_RETURN metadata per output
- Transaction-level options
- Preview mode for inspection

### Why Use TransactionTemplate?

**Before (Manual Transaction Building with Inputs):**
```typescript
// Complex, error-prone, hard to read - especially with inputs!
const p2pkh = new P2PKH(wallet);

// 1. Build unlocking script template
const walletParams = {
  protocolID: [2, 'p2pkh'],
  keyID: '0',
  counterparty: 'self'
};
const unlockingTemplate = p2pkh.unlock(
  walletParams.protocolID,
  walletParams.keyID,
  walletParams.counterparty
);

// 2. Build outputs
const outputLockingScript = await p2pkh.lock(recipientPublicKey);
const scriptWithMetadata = addOpReturnData(outputLockingScript, ['data']);

// 3. Build temporary transaction for signing
const tx = new Transaction();
tx.addInput({
  sourceTransaction: sourceTransaction,
  sourceOutputIndex: 0,
  unlockingScriptTemplate: unlockingTemplate
});
tx.addOutput({
  lockingScript: scriptWithMetadata,
  satoshis: 1000
});

// 4. Sign the transaction
await tx.fee(new SatoshisPerKilobyte(50));
await tx.sign();

// 5. Extract signed unlocking scripts
const signedUnlockingScript = tx.inputs[0].unlockingScript.toHex();

// 6. Build BEEF
const inputBEEF = sourceTransaction.toBEEF();

// 7. Finally call createAction with all the pieces
const result = await wallet.createAction({
  description: "My transaction",
  inputBEEF: inputBEEF,
  inputs: [{
    outpoint: `${sourceTransaction.id('hex')}.0`,
    unlockingScript: signedUnlockingScript,
    inputDescription: "Input"
  }],
  outputs: [{
    lockingScript: scriptWithMetadata.toHex(),
    satoshis: 1000,
    outputDescription: "Output"
  }],
  options: { randomizeOutputs: false }
});
```

**After (TransactionTemplate):**
```typescript
// Clean, fluent, self-documenting - handles all the complexity!
const result = await new TransactionTemplate(wallet, "My transaction")
  .addP2PKHInput(
    sourceTransaction,
    0,
    { protocolID: [2, 'p2pkh'], keyID: '0', counterparty: 'self' },
    "Input"
  )
  .addP2PKHOutput(recipientPublicKey, 1000, "Output")
    .addOpReturn(['data'])
  .options({ randomizeOutputs: false })
  .build();
```

TransactionTemplate handles all the complexity:
- ✅ Building unlocking script templates
- ✅ Creating temporary transactions for signing
- ✅ Fee calculation and signing
- ✅ Extracting signed scripts
- ✅ BEEF generation and merging (for multiple inputs)
- ✅ Proper createAction parameter formatting

## Quick Start

### Installation

```bash
npm install bsv-wallet-helper
```

### Basic Transaction

```typescript
import { TransactionTemplate, makeWallet } from 'bsv-wallet-helper';
import { WalletClient } from '@bsv/sdk';

// Create wallet or use WalletClient
const wallet = await makeWallet('test', storageURL, privateKeyHex);
const wallet2 = new WalletClient("auto")
const recipientPublicKey = '02...'; // Recipient's public key

// Build and execute transaction
const result = await new TransactionTemplate(wallet, "Payment to Alice")
  .addP2PKHOutput(recipientPublicKey, 5000, "Payment")
  .build();

console.log(`Transaction ID: ${result.txid}`);
```

## Core Concepts

### Builder Pattern

TransactionTemplate uses the builder pattern with method chaining:

```typescript
new TransactionTemplate(wallet, "Description")
  .addP2PKHOutput(...)        // Returns OutputBuilder
    .addOpReturn([...])        // Returns TransactionTemplate (for next output)
  .addOrdinalP2PKHOutput(...)  // Returns OutputBuilder
    .outputDescription("...")  // Returns OutputBuilder (same output)
  .options({...})              // Returns TransactionTemplate
  .build();                    // Executes transaction
```

### Return Types

- **TransactionTemplate methods** → Return `TransactionTemplate` (add more outputs, set options)
- **OutputBuilder methods** → Return `OutputBuilder` (configure current output) or `TransactionTemplate` (next output)
- **InputBuilder methods** → Return `InputBuilder` (configure current input) or `TransactionTemplate` (next input)

### Preview Mode

Inspect what will be sent to `wallet.createAction()` without executing:

```typescript
const preview = await template.build({ preview: true });

console.log(preview);
// {
//   description: "My transaction",
//   outputs: [{ lockingScript: "...", satoshis: 1000, outputDescription: "..." }],
//   options: { randomizeOutputs: false }
// }
```

## API Reference

### Constructor

```typescript
new TransactionTemplate(wallet: WalletInterface, description?: string)
```

**Parameters:**
- `wallet` - BRC-100 compatible wallet interface (required)
- `description` - Optional transaction description (default: "Transaction")

**Throws:** `Error` if wallet is not provided

**Example:**
```typescript
const template = new TransactionTemplate(wallet);
const templateWithDesc = new TransactionTemplate(wallet, "Payment to Bob");
```

---

### Output Methods

#### `addP2PKHOutput()`

Add a Pay-to-Public-Key-Hash output.

```typescript
addP2PKHOutput(
  addressOrParams: string | WalletDerivationParams,
  satoshis: number,
  description?: string
): OutputBuilder
```

**Parameters:**
- `addressOrParams` - Public key hex string OR wallet derivation parameters
- `satoshis` - Amount in satoshis (must be non-negative)
- `description` - Optional output description

**Returns:** `OutputBuilder` for configuring this output

**Example:**
```typescript
// With public key
template.addP2PKHOutput(publicKeyHex, 1000, "Payment");

// With wallet derivation
template.addP2PKHOutput({
  protocolID: [2, 'p2pkh'],
  keyID: '0',
  counterparty: 'self'
}, 1000, "Change");
```

---

#### `addChangeOutput()`

Add a change output with automatic satoshi calculation during signing.

```typescript
addChangeOutput(
  addressOrParams: string | WalletDerivationParams,
  description?: string
): OutputBuilder
```

**Parameters:**
- `addressOrParams` - Public key hex string OR wallet derivation parameters
- `description` - Optional output description (default: "Change")

**Returns:** `OutputBuilder` for configuring this output

**Important:** Change outputs require at least one input to be added first.

**How it works:**
- During transaction building, the locking script is created but satoshis are left undefined
- When the transaction is signed, fees are calculated and the remaining balance goes to change outputs
- The calculated satoshis are automatically extracted and used in the final transaction

**Important: Spending Change Outputs**
- Change outputs are standard P2PKH outputs under the hood
- To spend them later, use `addP2PKHInput()` with the **same wallet derivation parameters** you used when creating the change output
- Store the derivation parameters with your UTXO to unlock it correctly later

**Example:**
```typescript
import { TransactionTemplate } from 'bsv-wallet-helper';
import { Transaction } from '@bsv/sdk';

// Create change output with wallet derivation
const walletParams = {
  protocolID: [2, 'p2pkh'],
  keyID: '0',
  counterparty: 'self'
};

const result = await new TransactionTemplate(wallet, "Payment with change")
  .addP2PKHInput(sourceTransaction, 0, walletParams, "Input")
  .addP2PKHOutput(recipientPublicKey, 1000, "Payment")
  .addChangeOutput(walletParams, "Change") // Automatically calculated!
  .build();

// Later: Spend the change output using the SAME parameters
// Note: result.tx is atomic BEEF data, convert to Transaction first
const changeTx = Transaction.fromAtomicBEEF(result.tx);

const spendResult = await new TransactionTemplate(wallet, "Spending change")
  .addP2PKHInput(
    changeTx,            // Transaction containing the change output
    1,                   // Index of the change output
    walletParams,        // SAME parameters as when creating change!
    "Spending change"
  )
  .addP2PKHOutput(recipientPublicKey, 500, "Next payment")
  .build();
```

---

#### `addOrdinalP2PKHOutput()`

Add a 1Sat Ordinal output with optional inscription and MAP metadata.

```typescript
addOrdinalP2PKHOutput(
  addressOrParams: string | WalletDerivationParams,
  satoshis: number,
  inscription?: Inscription,
  metadata?: MAP,
  description?: string
): OutputBuilder
```

**Parameters:**
- `addressOrParams` - Public key hex OR wallet derivation parameters
- `satoshis` - Amount in satoshis (typically 1 for ordinals)
- `inscription` - Optional inscription data `{ dataB64: string, contentType: string }`
- `metadata` - Optional MAP metadata `{ app: string, type: string, ...customFields }`
- `description` - Optional output description

**Returns:** `OutputBuilder` for configuring this output

**Example:**
```typescript
template.addOrdinalP2PKHOutput(
  publicKey,
  1,
  { dataB64: imageBase64, contentType: 'image/png' },
  { app: 'gallery', type: 'art', artist: 'Alice' },
  "NFT Creation"
);

// Reinscription (metadata only, no file)
template.addOrdinalP2PKHOutput(
  publicKey,
  1,
  undefined, // No inscription data
  { app: 'gallery', type: 'art', owner: 'Bob' },
  "NFT Transfer"
);
```

---

#### `addCustomOutput()`

Add an output with a custom locking script.

```typescript
addCustomOutput(
  lockingScript: LockingScript,
  satoshis: number,
  description?: string
): OutputBuilder
```

**Parameters:**
- `lockingScript` - Pre-built locking script
- `satoshis` - Amount in satoshis
- `description` - Optional output description

**Returns:** `OutputBuilder` for configuring this output

**Example:**
```typescript
import { LockingScript } from '@bsv/sdk';

const customScript = LockingScript.fromASM('OP_TRUE');
template.addCustomOutput(customScript, 1000, "Custom script output");
```

---

### OutputBuilder Methods

These methods configure the current output and are available after calling any `add*Output()` method.

#### `addOpReturn()`

Add OP_RETURN metadata to the current output.

```typescript
addOpReturn(fields: (string | number[])[]): TransactionTemplate
```

**Parameters:**
- `fields` - Array of data fields. Each can be:
  - Plain text string (auto-converted to hex)
  - Hex string (detected and preserved)
  - Byte array (converted to hex)

**Returns:** `TransactionTemplate` (ready for next output or build)

**Throws:** `Error` if fields is empty or not an array

**Example:**
```typescript
// Plain text
template.addP2PKHOutput(publicKey, 1)
  .addOpReturn(['APP_ID', 'action', 'transfer']);

// JSON data
template.addP2PKHOutput(publicKey, 1)
  .addOpReturn(['APP_ID', JSON.stringify({ user: 'Alice', amount: 100 })]);

// Mixed types
template.addP2PKHOutput(publicKey, 1)
  .addOpReturn([
    'APP_ID',           // Text
    'deadbeef',         // Hex
    [0x01, 0x02, 0x03]  // Byte array
  ]);
```

---

#### `outputDescription()`

Set or update the description for the current output.

```typescript
outputDescription(desc: string): OutputBuilder
```

**Parameters:**
- `desc` - Description string

**Returns:** `OutputBuilder` (same output, can chain more output methods)

**Example:**
```typescript
template.addP2PKHOutput(publicKey, 1000)
  .outputDescription("Updated description")
  .addOpReturn(['metadata']);
```

---

### Input Methods

#### `addP2PKHInput()`

Add a P2PKH input (for spending a UTXO).

```typescript
addP2PKHInput(
  sourceTransaction: Transaction,
  sourceOutputIndex: number,
  walletParams?: WalletDerivationParams,
  description?: string,
  signOutputs?: 'all' | 'none' | 'single',
  anyoneCanPay?: boolean,
  sourceSatoshis?: number,
  lockingScript?: Script
): InputBuilder
```

**Parameters:**
- `sourceTransaction` - Transaction containing the UTXO
- `sourceOutputIndex` - Output index in source transaction
- `walletParams` - Wallet derivation parameters (defaults to `[2, 'p2pkh'], '0', 'self'`)
- `description` - Optional input description
- `signOutputs` - Signature scope: 'all' (default), 'none', 'single'
- `anyoneCanPay` - SIGHASH_ANYONECANPAY flag (default: false)
- `sourceSatoshis` - Optional satoshi amount
- `lockingScript` - Optional locking script

**Returns:** `InputBuilder` for configuring this input

**Example:**
```typescript
template.addP2PKHInput(
  sourceTransaction,
  0,
  { protocolID: [2, 'p2pkh'], keyID: '0', counterparty: 'self' },
  "Spending UTXO"
);
```

---

#### `addOrdinalP2PKHInput()`

Add an Ordinal P2PKH input (works same as P2PKH for unlocking).

```typescript
addOrdinalP2PKHInput(
  sourceTransaction: Transaction,
  sourceOutputIndex: number,
  walletParams?: WalletDerivationParams,
  description?: string,
  signOutputs?: 'all' | 'none' | 'single',
  anyoneCanPay?: boolean,
  sourceSatoshis?: number,
  lockingScript?: Script
): InputBuilder
```

**Parameters:** Same as `addP2PKHInput()`

**Returns:** `InputBuilder` for configuring this input

---

#### `addCustomInput()`

Add an input with a custom unlocking script template.

```typescript
addCustomInput(
  unlockingScriptTemplate: any,
  sourceTransaction: Transaction,
  sourceOutputIndex: number,
  description?: string,
  sourceSatoshis?: number,
  lockingScript?: Script
): InputBuilder
```

**Parameters:**
- `unlockingScriptTemplate` - Pre-built unlocking script template
- `sourceTransaction` - Transaction containing the UTXO
- `sourceOutputIndex` - Output index in source transaction
- `description` - Optional input description
- `sourceSatoshis` - Optional satoshi amount
- `lockingScript` - Optional locking script

**Returns:** `InputBuilder` for configuring this input

---

### InputBuilder Methods

#### `inputDescription()`

Set or update the description for the current input.

```typescript
inputDescription(desc: string): InputBuilder
```

**Parameters:**
- `desc` - Description string

**Returns:** `InputBuilder` (same input, can chain more input methods)

---

### Transaction-Level Methods

#### `transactionDescription()`

Set the transaction-level description.

```typescript
transactionDescription(desc: string): TransactionTemplate
```

**Parameters:**
- `desc` - Description string

**Returns:** `TransactionTemplate`

**Example:**
```typescript
template.transactionDescription("Payment to multiple recipients");
```

---

#### `options()`

Set transaction options (passed to `wallet.createAction()`).

```typescript
options(opts: CreateActionOptions): TransactionTemplate
```

**Parameters:**
- `opts` - Transaction options object with any of:
  - `randomizeOutputs?: boolean` - Randomize output order
  - `trustSelf?: 'known' | 'all'` - Trust level for non-verified BEEFs
  - `signAndProcess?: boolean` - Sign and process immediately
  - `acceptDelayedBroadcast?: boolean` - Accept delayed broadcast
  - `returnTXIDOnly?: boolean` - Return only TXID
  - `noSend?: boolean` - Don't broadcast
  - `knownTxids?: string[]` - Known transaction IDs
  - `noSendChange?: string[]` - Outpoints not to send change for
  - `sendWith?: string[]` - Transaction IDs to send with

**Returns:** `TransactionTemplate`

**Throws:** `Error` if options are invalid

**Example:**
```typescript
template.options({
  randomizeOutputs: false,
  trustSelf: 'known',
  signAndProcess: true
});
```

---

#### `build()`

Build and execute the transaction (or preview it).

```typescript
build(params?: BuildParams): Promise<CreateActionResult | any>
```

**Parameters:**
- `params` - Optional build parameters:
  - `preview?: boolean` - If true, return createAction args without executing

**Returns:**
- If `preview: false` or omitted: `Promise<CreateActionResult>` with `{ txid, tx }`
- If `preview: true`: Promise resolving to the createAction arguments object

**Throws:** `Error` if no outputs configured or validation fails

**Example:**
```typescript
// Execute transaction
const result = await template.build();
console.log(result.txid, result.tx);

// Preview without executing
const preview = await template.build({ preview: true });
console.log(preview.outputs, preview.options);
```

---

## Examples

### Simple Payment

```typescript
const wallet = await makeWallet('test', storageURL, privateKeyHex);

const result = await new TransactionTemplate(wallet, "Payment")
  .addP2PKHOutput(bobPublicKey, 5000, "To Bob")
  .build();

console.log(`Sent 5000 satoshis to Bob: ${result.txid}`);
```

---

### Payment with Metadata

```typescript
const metadata = {
  timestamp: Date.now(),
  memo: 'Payment for services',
  invoice: '#12345'
};

const result = await new TransactionTemplate(wallet, "Payment with memo")
  .addP2PKHOutput(vendorPublicKey, 10000, "Vendor payment")
    .addOpReturn(['MY_APP', JSON.stringify(metadata)])
  .build();
```

---

### Multiple Outputs

```typescript
const result = await new TransactionTemplate(wallet, "Multi-payment")
  .addP2PKHOutput(alice, 1000, "To Alice")
  .addP2PKHOutput(bob, 2000, "To Bob")
  .addP2PKHOutput(charlie, 3000, "To Charlie")
  .build();
```

---

### Multiple Outputs with Independent Metadata

```typescript
const result = await new TransactionTemplate(wallet, "Multiple payments")
  .addP2PKHOutput(alice, 1000, "Payment 1")
    .addOpReturn(['APP_ID', 'payment', 'alice'])
  .addP2PKHOutput(bob, 2000, "Payment 2")
    .addOpReturn(['APP_ID', 'payment', 'bob'])
  .addP2PKHOutput(charlie, 3000, "Payment 3")
    .addOpReturn(['APP_ID', 'payment', 'charlie'])
  .build();
```

---

### Creating an NFT (Ordinal)

```typescript
const imageData = fs.readFileSync('artwork.png');
const imageBase64 = imageData.toString('base64');

const result = await new TransactionTemplate(wallet, "NFT Mint")
  .addOrdinalP2PKHOutput(
    artistPublicKey,
    1,
    { dataB64: imageBase64, contentType: 'image/png' },
    {
      app: 'my-gallery',
      type: 'artwork',
      artist: 'Alice',
      title: 'Sunset Over Mountains',
      year: '2025'
    },
    "NFT Creation"
  )
  .build();

console.log(`NFT created: ${result.txid}`);
```

---

### Transferring an NFT (Reinscription)

```typescript
// Transfer without re-uploading file data
const result = await new TransactionTemplate(wallet, "NFT Transfer")
  .addOrdinalP2PKHOutput(
    newOwnerPublicKey,
    1,
    undefined, // No inscription data
    {
      app: 'my-gallery',
      type: 'artwork',
      artist: 'Alice',
      title: 'Sunset Over Mountains',
      owner: 'Bob',  // New owner
      transferred: Date.now().toString()
    },
    "NFT Ownership Transfer"
  )
  .build();
```

---

### Using Wallet Derivation

```typescript
const params = {
  protocolID: [2, 'p2pkh'] as WalletProtocol,
  keyID: '0',
  counterparty: 'self' as WalletCounterparty
};

// Simple payment with wallet-derived output
const result = await new TransactionTemplate(wallet, "Derived payment")
  .addP2PKHOutput(params, 1000, "Payment to self")
  .build();

// With automatic change calculation
const result2 = await new TransactionTemplate(wallet, "Payment with change")
  .addP2PKHInput(sourceTransaction, 0, params, "Input")
  .addP2PKHOutput(recipientPublicKey, 1000, "Payment")
  .addChangeOutput(params, "Change") // Automatically calculated!
  .build();
```

---

### Preview Mode

```typescript
// Build the transaction structure without executing
const preview = await new TransactionTemplate(wallet, "Preview test")
  .addP2PKHOutput(publicKey, 5000, "Test output")
    .addOpReturn(['APP_ID', 'test-data'])
  .options({ randomizeOutputs: false })
  .build({ preview: true });

// Inspect what would be sent
console.log('Transaction description:', preview.description);
console.log('Number of outputs:', preview.outputs.length);
console.log('First output satoshis:', preview.outputs[0].satoshis);
console.log('Options:', preview.options);

// Decide whether to execute
if (userConfirms) {
  const result = await template.build(); // Execute for real
}
```

---

### With Custom Options

```typescript
const result = await new TransactionTemplate(wallet, "Complex transaction")
  .addP2PKHOutput(recipientPublicKey, 10000, "Payment")
  .options({
    randomizeOutputs: false,  // Preserve output order
    trustSelf: 'known',       // Trust input beef
    signAndProcess: true,     // Sign immediately
    noSend: false            // Broadcast to network
  })
  .build();
```

---

### Spending a UTXO with Automatic Change

```typescript
// Assume we have a UTXO from a previous transaction
const utxoTx = ...; // Previous transaction
const utxoIndex = 0;
const utxoParams = {
  protocolID: [2, 'p2pkh'] as WalletProtocol,
  keyID: '0',
  counterparty: 'self' as WalletCounterparty
};

const result = await new TransactionTemplate(wallet, "Spending UTXO")
  .addP2PKHInput(utxoTx, utxoIndex, utxoParams, "Input from previous tx")
  .addP2PKHOutput(recipientPublicKey, 4500, "Payment")
  .addChangeOutput(utxoParams, "Change") // Automatically calculated after fees!
  .build();
```

---

## Advanced Usage

### Chaining Pattern

TransactionTemplate supports complex chaining patterns:

```typescript
const template = new TransactionTemplate(wallet, "Complex transaction");

// Add first output with metadata
const afterOutput1 = template
  .addP2PKHOutput(alice, 1000, "Payment 1")
    .addOpReturn(['data1']); // Returns TransactionTemplate

// Add second output with description and metadata
const afterOutput2 = afterOutput1
  .addP2PKHOutput(bob, 2000) // No description yet
    .outputDescription("Payment 2") // Add description
    .addOpReturn(['data2']); // Returns TransactionTemplate

// Set options and build
const result = await afterOutput2
  .options({ randomizeOutputs: false })
  .build();
```

### Error Handling

```typescript
try {
  const result = await new TransactionTemplate(wallet, "Transaction")
    .addP2PKHOutput(publicKey, 1000)
    .build();

  console.log(`Success: ${result.txid}`);
} catch (error) {
  if (error.message.includes('At least one output')) {
    console.error('No outputs configured');
  } else if (error.message.includes('Wallet is required')) {
    console.error('Invalid wallet');
  } else {
    console.error('Transaction failed:', error.message);
  }
}
```

### Preview for Debugging

```typescript
async function buildAndDebugTransaction() {
  const template = new TransactionTemplate(wallet, "Debug transaction")
    .addP2PKHOutput(publicKey, 1000, "Test")
    .addOpReturn(['debug', 'data']);

  // Preview first
  const preview = await template.build({ preview: true });
  console.log('Preview:', JSON.stringify(preview, null, 2));

  // Validate
  if (preview.outputs.length !== 1) {
    throw new Error('Expected 1 output');
  }

  // Execute
  return await template.build();
}
```

### Conditional Building

```typescript
let template = new TransactionTemplate(wallet, "Conditional transaction")
  .addP2PKHOutput(recipientPublicKey, baseAmount, "Base payment");

// Add bonus if applicable
if (includeBonus) {
  template = template.addP2PKHOutput(recipientPublicKey, bonusAmount, "Bonus");
}

// Add metadata if requested
if (includeMetadata) {
  template = template
    .addP2PKHOutput(recipientPublicKey, 1)
      .addOpReturn(['APP_ID', JSON.stringify(metadata)]);
}

const result = await template.build();
```

### Type-Safe Wallet Derivation

```typescript
import { WalletDerivationParams, WalletProtocol, WalletCounterparty } from 'bsv-wallet-helper';

const derivationParams: WalletDerivationParams = {
  protocolID: [2, 'p2pkh'] as WalletProtocol,
  keyID: '0',
  counterparty: 'self' as WalletCounterparty
};

// Store these with your UTXO for later spending
interface StoredUTXO {
  txid: string;
  outputIndex: number;
  satoshis: number;
  derivationParams: WalletDerivationParams;
}

const myUTXO: StoredUTXO = {
  txid: result.txid,
  outputIndex: 0,
  satoshis: 1000,
  derivationParams
};

// Later, spend using the stored params
const spendResult = await new TransactionTemplate(wallet, "Spending stored UTXO")
  .addP2PKHInput(sourceTx, myUTXO.outputIndex, myUTXO.derivationParams)
  .addP2PKHOutput(recipientPublicKey, myUTXO.satoshis - 100)
  .build();
```

---

## Best Practices

### 1. Always Store Derivation Parameters (Critical for Change Outputs!)

When using wallet derivation, store the parameters with your UTXO. This is **especially important for change outputs**:

```typescript
import { TransactionTemplate } from 'bsv-wallet-helper';
import { Transaction } from '@bsv/sdk';

// ✅ Good: Store params for later spending
const params = { protocolID: [2, 'p2pkh'], keyID: '0', counterparty: 'self' };

const result = await new TransactionTemplate(wallet)
  .addP2PKHInput(sourceTx, 0, params, "Input")
  .addP2PKHOutput(recipientPublicKey, 1000, "Payment")
  .addChangeOutput(params, "Change")
  .build();

// Store with UTXO for later spending
const changeUTXO = {
  txid: result.txid,
  outputIndex: 1, // Change output index
  derivationParams: params // MUST store these!
};

// Later: Spend the change using SAME params
// Note: result.tx is atomic BEEF data, convert to Transaction first
const changeTx = Transaction.fromAtomicBEEF(result.tx);

await new TransactionTemplate(wallet)
  .addP2PKHInput(changeTx, changeUTXO.outputIndex, params, "Spending change")
  .addP2PKHOutput(recipientPublicKey, 500)
  .build();

// ❌ Bad: Use different params when spending
const wrongTx = Transaction.fromAtomicBEEF(result.tx);
await template.addP2PKHInput(
  wrongTx,
  1,
  { protocolID: [2, 'p2pkh'], keyID: '1', counterparty: 'self' } // WRONG!
); // Won't unlock the change output!
```

### 2. Use Descriptive Names

```typescript
// ✅ Good: Clear descriptions
await new TransactionTemplate(wallet, "Payment to vendor for invoice #12345")
  .addP2PKHOutput(vendorPublicKey, 10000, "Vendor payment")
  .build();

// ❌ Bad: Generic descriptions
await new TransactionTemplate(wallet, "Transaction")
  .addP2PKHOutput(vendorPublicKey, 10000, "Output")
  .build();
```

### 3. Preview Before Large Transactions

```typescript
// ✅ Good: Preview expensive transactions
const template = buildComplexTransaction();
const preview = await template.build({ preview: true });
console.log(`Will create ${preview.outputs.length} outputs`);
const confirmed = await getUserConfirmation(preview);
if (confirmed) {
  await template.build();
}
```

### 4. Use Per-Output Metadata

```typescript
// ✅ Good: Each output has its own metadata
template
  .addP2PKHOutput(alice, 1000).addOpReturn(['payment', 'alice'])
  .addP2PKHOutput(bob, 2000).addOpReturn(['payment', 'bob']);
```

### 5. Handle Errors Gracefully

```typescript
try {
  const result = await template.build();
  await logSuccess(result.txid);
} catch (error) {
  await logError(error);
  await notifyUser('Transaction failed');
  throw error; // Re-throw if needed
}
```

---

## Common Patterns

### Payment with Automatic Change

```typescript
const myParams = {
  protocolID: [2, 'p2pkh'] as WalletProtocol,
  keyID: '0',
  counterparty: 'self' as WalletCounterparty
};

// No need to manually calculate change and fees!
// addChangeOutput automatically handles fee calculation
await new TransactionTemplate(wallet, "Payment with change")
  .addP2PKHInput(sourceTransaction, 0, myParams, "UTXO")
  .addP2PKHOutput(recipientPublicKey, 7000, "Payment")
  .addChangeOutput(myParams, "Change") // Automatically: input - payment - fees
  .build();
```

### Change Output with Metadata

```typescript
// Change outputs support OP_RETURN just like regular outputs
await new TransactionTemplate(wallet, "Payment with tracked change")
  .addP2PKHInput(sourceTransaction, 0, myParams, "Input")
  .addP2PKHOutput(recipientPublicKey, 5000, "Payment")
  .addChangeOutput(myParams, "Change")
    .addOpReturn(['APP_ID', JSON.stringify({ changeType: 'auto', timestamp: Date.now() })])
  .build();
```

---

### Multiple Change Outputs

```typescript
// You can add multiple change outputs to split change across addresses
const changeParams1 = { protocolID: [2, 'p2pkh'], keyID: '1', counterparty: 'self' };
const changeParams2 = { protocolID: [2, 'p2pkh'], keyID: '2', counterparty: 'self' };

await new TransactionTemplate(wallet, "Split change")
  .addP2PKHInput(sourceTransaction, 0, myParams, "Input")
  .addP2PKHOutput(recipientPublicKey, 3000, "Payment")
  .addChangeOutput(changeParams1, "Change 1") // Gets calculated change / 2
  .addChangeOutput(changeParams2, "Change 2") // Gets calculated change / 2
  .build();
```

---

### Multi-Recipient Payment

```typescript
const recipients = [
  { publicKey: alice, amount: 1000, name: "Alice" },
  { publicKey: bob, amount: 2000, name: "Bob" },
  { publicKey: charlie, amount: 3000, name: "Charlie" }
];

let template = new TransactionTemplate(wallet, "Multi-recipient payment");

for (const recipient of recipients) {
  template = template.addP2PKHOutput(
    recipient.publicKey,
    recipient.amount,
    `Payment to ${recipient.name}`
  );
}

const result = await template.build();
```

### Data Storage Pattern

```typescript
await new TransactionTemplate(wallet, "Document hash")
  .addP2PKHOutput(myPublicKey, 1, "Document proof")
    .addOpReturn([
      'DOC_HASH',
      documentHash,
      JSON.stringify({
        filename: 'contract.pdf',
        timestamp: Date.now(),
        author: 'Alice'
      })
    ])
  .build();
```

---

## Troubleshooting

### "At least one output is required"

You must add at least one output before calling `build()`:

```typescript
// ❌ Error
await new TransactionTemplate(wallet).build();

// ✅ Fixed
await new TransactionTemplate(wallet)
  .addP2PKHOutput(publicKey, 1000)
  .build();
```

### "Wallet is required"

Constructor requires a valid wallet:

```typescript
// ❌ Error
new TransactionTemplate(null);

// ✅ Fixed
const wallet = await makeWallet('test', storageURL, privateKeyHex);
new TransactionTemplate(wallet);
```

### "Change outputs require at least one input"

Change outputs need inputs to calculate remaining balance:

```typescript
// ❌ Error: No inputs
await new TransactionTemplate(wallet)
  .addP2PKHOutput(publicKey, 1000)
  .addChangeOutput(myParams) // ERROR: no inputs!
  .build();

// ✅ Fixed: Add at least one input first
await new TransactionTemplate(wallet)
  .addP2PKHInput(sourceTransaction, 0, myParams, "Input")
  .addP2PKHOutput(publicKey, 1000)
  .addChangeOutput(myParams, "Change") // Now works!
  .build();
```

### "Script already contains OP_RETURN"

You can only add OP_RETURN once per output:

```typescript
// ❌ Error
template.addP2PKHOutput(publicKey, 1)
  .addOpReturn(['data1'])
  .addOpReturn(['data2']); // Can't add second OP_RETURN to same output

// ✅ Fixed: Put all data in one call
template.addP2PKHOutput(publicKey, 1)
  .addOpReturn(['data1', 'data2']);

// ✅ Or: Use separate outputs
template
  .addP2PKHOutput(publicKey, 1).addOpReturn(['data1'])
  .addP2PKHOutput(publicKey, 1).addOpReturn(['data2']);
```

---

## See Also

- [Main README](../README.md) - Overview and installation
- [P2PKH Tests](../src/script-templates/__tests__/p2pkh.test.ts) - Working examples
- [Transaction Tests](../src/transaction-template/__tests__/transaction.test.ts) - Complete test suite
