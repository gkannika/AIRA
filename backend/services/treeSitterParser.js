const fs = require('fs-extra');
const logger = require('../utils/logger');
const { detectLanguage } = require('../utils/fileFilters');

/**
 * Tree-sitter based code parser.
 *
 * Uses `web-tree-sitter` with per-language .wasm grammars (placed in
 * backend/wasm/ - see setup note below). Parsing is done per-file and
 * wrapped in try/catch so a single malformed/huge file never aborts the
 * whole analysis; it's just skipped and logged.
 *
 * Setup note: web-tree-sitter grammars are distributed as .wasm files
 * (e.g. tree-sitter-javascript.wasm). Download the grammars you need for
 * MAX_FILES_TO_PARSE languages into backend/wasm/ - see
 * https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web
 * When a grammar for a detected language isn't available, that file falls
 * back to the regex-based lightweight extractor below, so the pipeline
 * degrades gracefully instead of failing.
 */

let Parser = null;
let initialized = false;
const languageParsers = {}; // language -> Parser instance

async function initTreeSitter() {
  if (initialized) return;
  try {
    Parser = require('web-tree-sitter');
    await Parser.init();
    initialized = true;
  } catch (err) {
    logger.warn(`web-tree-sitter unavailable (${err.message}). Falling back to lightweight regex extraction for all files.`);
    initialized = false;
  }
}

async function getLanguageParser(language) {
  if (!initialized) return null;
  if (languageParsers[language]) return languageParsers[language];
  try {
    const wasmPath = require('path').join(__dirname, '..', 'wasm', `tree-sitter-${language}.wasm`);
    const exists = await fs.pathExists(wasmPath);
    if (!exists) return null;
    const Lang = await Parser.Language.load(wasmPath);
    const parser = new Parser();
    parser.setLanguage(Lang);
    languageParsers[language] = parser;
    return parser;
  } catch (err) {
    logger.warn(`Could not load Tree-sitter grammar for ${language}: ${err.message}`);
    return null;
  }
}

/**
 * Lightweight regex-based fallback extractor. Not as precise as a real
 * Tree-sitter grammar, but good enough to surface function/class/import
 * names when a .wasm grammar isn't installed, keeping the pipeline usable
 * out of the box.
 */
function regexExtract(source, language) {
  const functions = new Set();
  const classes = new Set();
  const imports = new Set();

  const patterns = {
    javascript: {
      func: /function\s+([A-Za-z0-9_$]+)\s*\(/g,
      arrow: /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(?[^)]*\)?\s*=>/g,
      cls: /class\s+([A-Za-z0-9_$]+)/g,
      imp: /(?:import .*? from ['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g,
    },
    typescript: null, // reuse javascript patterns below
    python: {
      func: /def\s+([A-Za-z0-9_]+)\s*\(/g,
      cls: /class\s+([A-Za-z0-9_]+)/g,
      imp: /(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/g,
    },
    java: {
      func: /(?:public|private|protected|static)\s+[\w<>\[\]]+\s+([A-Za-z0-9_]+)\s*\(/g,
      cls: /class\s+([A-Za-z0-9_]+)/g,
      imp: /import\s+([\w.]+);/g,
    },
    go: {
      func: /func\s+(?:\([^)]*\)\s*)?([A-Za-z0-9_]+)\s*\(/g,
      cls: /type\s+([A-Za-z0-9_]+)\s+struct/g,
      imp: /"([\w./-]+)"/g,
    },
  };

  const p = patterns[language] || patterns[language === 'typescript' ? 'javascript' : language];
  if (!p) return { functions: [], classes: [], imports: [] };

  let m;
  if (p.func) while ((m = p.func.exec(source))) functions.add(m[1]);
  if (p.arrow) while ((m = p.arrow.exec(source))) functions.add(m[1]);
  if (p.cls) while ((m = p.cls.exec(source))) classes.add(m[1]);
  if (p.imp) while ((m = p.imp.exec(source))) imports.add(m[1] || m[2]);

  return {
    functions: Array.from(functions),
    classes: Array.from(classes),
    imports: Array.from(imports),
  };
}

/**
 * Parses a single file, returning { language, functions, classes, imports, lineCount }.
 * Returns null for files with no supported/detected language.
 */
async function parseFile(file) {
  const language = detectLanguage(file.name);
  if (!language) return null;

  let source;
  try {
    source = await fs.readFile(file.fsPath, 'utf-8');
  } catch (err) {
    logger.warn(`Skipping unreadable file ${file.path}: ${err.message}`);
    return null;
  }

  // Guard against pathologically large generated files.
  if (source.length > 500_000) {
    logger.warn(`Skipping ${file.path}: file too large for parsing (${source.length} chars).`);
    return { language, functions: [], classes: [], imports: [], lineCount: source.split('\n').length, truncated: true };
  }

  const lineCount = source.split('\n').length;

  const parser = await getLanguageParser(language);
  if (!parser) {
    // Graceful degradation: regex-based extraction instead of Tree-sitter AST.
    const extracted = regexExtract(source, language);
    return { language, ...extracted, lineCount };
  }

  try {
    const tree = parser.parse(source);
    const extracted = extractFromAst(tree.rootNode, language);
    return { language, ...extracted, lineCount };
  } catch (err) {
    logger.warn(`Tree-sitter parse failed for ${file.path} (${err.message}); falling back to regex extraction.`);
    const extracted = regexExtract(source, language);
    return { language, ...extracted, lineCount };
  }
}

/**
 * Walks a Tree-sitter AST collecting function/class/import-like node names.
 * Node type names are grammar-specific; this covers the common cases for
 * JS/TS, Python, Java, and Go grammars.
 */
function extractFromAst(root, language) {
  const functions = [];
  const classes = [];
  const imports = [];

  const FUNCTION_NODE_TYPES = new Set([
    'function_declaration', 'function_definition', 'method_definition', 'arrow_function',
  ]);
  const CLASS_NODE_TYPES = new Set(['class_declaration', 'class_definition']);
  const IMPORT_NODE_TYPES = new Set([
    'import_statement', 'import_from_statement', 'import_declaration',
  ]);

  function visit(node) {
    if (FUNCTION_NODE_TYPES.has(node.type)) {
      const nameNode = node.childForFieldName ? node.childForFieldName('name') : null;
      functions.push(nameNode ? nameNode.text : '(anonymous)');
    } else if (CLASS_NODE_TYPES.has(node.type)) {
      const nameNode = node.childForFieldName ? node.childForFieldName('name') : null;
      classes.push(nameNode ? nameNode.text : '(anonymous)');
    } else if (IMPORT_NODE_TYPES.has(node.type)) {
      imports.push(node.text.slice(0, 120));
    }
    for (let i = 0; i < node.childCount; i++) {
      visit(node.child(i));
    }
  }

  visit(root);
  return { functions, classes, imports };
}

module.exports = { initTreeSitter, parseFile };
