# tree-sitter-evm-trace

A production-grade [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for EVM execution traces (Foundry / Forge / Cast traces).

Designed specifically for **Zed editor** to provide instant, zero-latency native syntax highlighting, symbol navigation, and outline support across execution traces.

---

## Features

- **Headers**: `Traces:`
- **Tree Guides**: Full support for tree drawing glyphs (`├─`, `└─`, `│`, `─`, `+--`, `\--`, `|`)
- **Gas Annotations**: `[1312683]`, `[0]`
- **Contract Calls**:
  - `Contract::function(args...)`
  - `0xAddress::function(args...)`
  - Raw 4-byte selectors: `0xAddress::36b3d4df(...)`
  - Call types: `[call]`, `[staticcall]`, `[delegatecall]`
  - Value transfers: `{value: 12345}`
- **Contract Creation**: `→ new Contract@0xAddress` (including `<Create3>` / template contracts)
- **Returns & Reverts**:
  - `← [Return]` (empty, scalar values, arrays, tuples)
  - `← [Return] 5626 bytes of code`
  - `← [Stop]`
  - `← [Revert] reason` or custom errors like `Unauthorized()`
  - `← [Panic] ...`, `← [Selfdestruct]`
- **Event Logging**:
  - Decoded: `emit Transfer(from: ..., to: ..., amount: ...)`
  - Anonymous / Raw Topics: `emit topic 0: 0x...`, `topic 1: 0x...`, `data: 0x...`
- **Storage Diffs**:
  - `storage changes:`
  - `@ slot: before → after`
- **Literals & Values**:
  - Addresses (`0x...`), numbers, scientific approximations (`118384060 [1.183e8]`)
  - Labeled addresses: `SENDER : [0x7977...]`, `Proof: [0x3255...]`
  - Strings (`"bsc"`), booleans (`true`/`false`), arrays (`[...]`)

---

## Development & Usage

### 1. Generate Parser
```bash
npx tree-sitter-cli generate
```

### 2. Run Test Corpus
```bash
npx tree-sitter-cli test
```

### 3. Parse a Trace File
```bash
npx tree-sitter-cli parse /path/to/file.trace
```

### 4. Highlight Preview in Terminal
```bash
npx tree-sitter-cli highlight /path/to/file.trace
```

### 5. Compile WebAssembly for Zed (`wasm32-wasip1`)
```bash
~/.local/share/zed/extensions/build/wasi-sdk/bin/wasm32-wasip1-clang \
  -shared -fPIC -O3 \
  -I src src/parser.c \
  -Wl,--export=tree_sitter_evm_trace \
  -o evm_trace.wasm
```

Verify the exported symbol and dynamic linking section:
```bash
~/.local/share/zed/extensions/build/wasi-sdk/bin/llvm-nm evm_trace.wasm | grep tree_sitter_evm_trace
~/.local/share/zed/extensions/build/wasi-sdk/bin/llvm-objdump -h evm_trace.wasm | grep dylink
```

---

## License

MIT
