Place Tree-sitter WASM grammars here to enable full AST-based parsing, e.g.:

- tree-sitter-javascript.wasm
- tree-sitter-typescript.wasm
- tree-sitter-python.wasm
- tree-sitter-java.wasm
- tree-sitter-go.wasm

Download pre-built grammars from https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web
or build them yourself with `tree-sitter build --wasm` from each grammar repo.

If a grammar is missing for a detected language, treeSitterParser.js automatically
falls back to a lightweight regex-based extractor, so the pipeline keeps working
without these files (with slightly less precise function/class/import extraction).
