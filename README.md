# Multi-Sig DApp

A front-end application that streamlines the full multi-signature flow: **auth → transaction creation → multi-party signing → on-chain execution → query/delete**.

---

## Table of Contents

* [Feature Overview](#feature-overview)
* [Environment](#environment)
* [Install & Run](#install--run)
* [Configuration (`public/config.json`)](#configuration-publicconfigjson)
* [Usage Flow](#usage-flow)

  * [1) Sign In](#1-sign-in)
  * [2) Create a Transaction](#2-create-a-transaction)
  * [3) Table Actions](#3-table-actions)
  * [4) Query Transactions](#4-query-transactions)
* [Signing & Execution Rules (Important)](#signing--execution-rules-important)
* [Common Errors & Troubleshooting](#common-errors--troubleshooting)
* [Build](#build)
* [Developer Tips](#developer-tips)
* [Security Notes](#security-notes)

---

## Feature Overview

1. **Sign In**

   * Authenticate with a designated **Owner address** via MetaMask.
   * Upon success, a **token** is issued and automatically attached to all subsequent API requests.

2. **Create a Transaction**

   * Select a transaction type and fill in required parameters (target address/args).
   * Submit to generate a pending multi-sig transaction; it will appear in the table.

3. **Table Actions**

   * **Sign**: After Owner A creates the transaction, **Owner B** (or other owners) must add a second signature.
   * **Send**: When signatures meet the **threshold**, log in with the **Executor** account and click **Send** to execute on chain.
   * **Delete**: The **creator Owner** may delete the transaction only if its status is **READY**.

4. **Query Transactions**

   * Query by **Transaction ID**.
   * Filter by **status** (READY / SIGNE / PROPOSED / EXECUTED / CLOSED).

---

## Environment

* **Node.js ≥ 20.9.0** (LTS recommended)
* Package manager: `yarn` or `pnpm`
* Browser extension: **MetaMask**

---

## Install & Run

```bash
# Install dependencies
yarn install
# or
pnpm install

# Start dev server
yarn dev
# or
pnpm run dev
```

---

## Configuration (`public/config.json`)

> All runtime parameters come from `public/config.json`. Adjust them to match your environment.

```json
{
  "APP_ENV": "development",

  "API_BASE": "http://52.48.173.231:3000/api",

  "CONFIG_CHAIN_ID": 1337,
  "CONFIG_RPC_URL": "https://rpc8.testnet.kasplextest.xyz",

  "CONFIG_MULTICALL": "0xEc9933725C7CE6cc9A2D887ECCa20482d4bbb61e",
  "CONFIG_MULTISIGN": "0xEeF68c13df0Ab44C48fA78b09a970B251B47ae32",
  "CONFIG_TIME_LOCK": "0xea93165228B8F62013670Dc5c3B3A07A6da28Ba3",
  "CONFIG_FEE_DISPATCHER": "0xA218D609a65BAE33Ba2fFD867c7a66E8664b4E3e",
  "CONFIG_EXECUTOR": "0x69d4B3Fd107972655D6Ea256e9B1B52644Ec21E7",

  "CONFIG_OWNER0": "0xe65F4EA0c461693f6051845C195a14AD9701C2b4",
  "CONFIG_OWNER1": "0x29B011952eaF39D38804A8C4efCe3c5D502a3ab0",
  "CONFIG_OWNER2": "0x3EF5CDf950610FD3D3df7Ae245748E067A37028c"
}
```

**Field Description**

| Field                   | Description                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `APP_ENV`               | Runtime environment: `development` / `production`             |
| `API_BASE`              | Backend API base URL (login, create/query transactions, etc.) |
| `CONFIG_CHAIN_ID`       | Blockchain network Chain ID                                   |
| `CONFIG_RPC_URL`        | RPC endpoint                                                  |
| `CONFIG_MULTICALL`      | Multicall contract address                                    |
| `CONFIG_MULTISIGN`      | MultiSign contract address                                    |
| `CONFIG_TIME_LOCK`      | Timelock contract address                                     |
| `CONFIG_FEE_DISPATCHER` | FeeDispatcher contract address                                |
| `CONFIG_EXECUTOR`       | Executor account (or contract) address                        |
| `CONFIG_OWNER0/1/2`     | Predefined test Owner addresses (for local demo/integration)  |

> Ensure your MetaMask network matches `CONFIG_CHAIN_ID` / `CONFIG_RPC_URL`.

---

## Usage Flow

### 1) Sign In

1. Click **Sign In** (MetaMask will prompt for authorization).
2. Authenticate with an **Owner address**.
3. On success, the **token** is stored and used automatically by the client.

### 2) Create a Transaction

1. In **Create Transaction**, choose a type:

   * `addReceiver / removeReceiver` (via **Timelock** proxying to **FeeDispatcher**)
2. Fill in the parameters (e.g., address).
3. Submit; the backend stores the transaction and it appears in the table.

### 3) Table Actions

**3.1 Sign**

* After creation, other **Owners** will see a **Sign** button in the table.
* Click **Sign** → MetaMask pops up → sign the transaction digest.
* The signature count in the table will update on success.

**3.2 Send**

* When the signature count reaches the **threshold**, log in with the **Executor** account.
* A **Send** button appears; click to execute the transaction on chain.
* Status updates to **PROPOSED** (if via Timelock) or **EXECUTED**.

**3.3 Delete**

* Deletion is allowed only if the **current Owner is the creator** and status is **READY**.

### 4) Query Transactions

* Query by **Transaction ID**.
* Or filter by **status** (0–5) to quickly locate transactions by phase.

---

## Signing & Execution Rules (Important)

* **Owner allowlist**: Each signature must recover to an address returned by `MultiSign.getOwners()`.
* **Threshold**: Valid signature count must be ≥ **threshold** (only **valid** signatures are counted).
* **Signature order**: When packing signatures, sort by **Owner address in strict ascending lexicographic order** (deduplicate by address).

---

## Common Errors & Troubleshooting

* **`MultiSign: insufficient signatures`**

  * Check that **nonce** on chain equals the transaction’s recorded `nonce`.
  * Ensure all signatures are for the **same digest** (same `to/value/data/nonce`).
  * Confirm all recovered signers are in the **Owner** allowlist.
  * Verify signatures are **sorted** (by owner address) and **deduplicated**.
  * Make sure signature count meets the **threshold**.

> Tip: Before sending, perform a local validation following the contract rules and/or run a `callStatic.execTransaction(...)` dry run to catch ordering/threshold/allowlist issues.

---

## Build

```bash
# Production build
yarn build
# or
pnpm run build
```

---

## Developer Tips

* **Network parity**: The MetaMask network must match `CONFIG_CHAIN_ID` / `CONFIG_RPC_URL`.
* **API auth**: The token is returned by the login API and automatically attached to subsequent requests.
* **Local validation**: Run a contract-compatible local signature check before submission to greatly reduce on-chain failures.

---

## Security Notes

* **Never** input or expose private keys in an insecure environment.
* Only sign and send transactions you fully understand.
* Separate testnet and mainnet configurations to avoid mistakes.
