import { getLanguageFromExtension } from '@/lib/toolHelpers';
import { FILE_TYPE_ICON_IDS } from '@/lib/fileTypeIconIds';

type ThemeVariant = 'light' | 'dark';

const FILE_TYPE_SPRITE_ROOT_ID = 'oc-file-type-icon-sprite-root';
const SVG_NS = 'http://www.w3.org/2000/svg';

/*
 * The file-type sprite holds ~2,000 icons (almost 1 MB of SVG). Mounting it
 * whole put ~6,000 elements (and ~1,000 <use> shadow trees) in the page, which
 * every full style recalculation then walked — several hundred milliseconds
 * each during startup. Instead the sprite loads lazily and only the symbols
 * actually rendered are copied into a small sprite root.
 */
let symbolIndex: Map<string, string> | null = null;
let indexLoading: Promise<void> | null = null;
const mountedSymbols = new Set<string>();
const pendingSymbols = new Set<string>();

const getSpriteDefs = (): SVGDefsElement | null => {
  if (typeof document === 'undefined' || !document.body) return null;
  let root = document.getElementById(FILE_TYPE_SPRITE_ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = FILE_TYPE_SPRITE_ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    root.style.position = 'absolute';
    root.style.width = '0';
    root.style.height = '0';
    root.style.overflow = 'hidden';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.appendChild(document.createElementNS(SVG_NS, 'defs'));
    root.appendChild(svg);
    document.body.appendChild(root);
  }
  return root.querySelector('defs');
};

const buildSymbolIndex = (raw: string): Map<string, string> => {
  const index = new Map<string, string>();
  const pattern = /<symbol\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/symbol>/g;
  for (let match = pattern.exec(raw); match; match = pattern.exec(raw)) {
    index.set(match[1], match[0]);
  }
  return index;
};

const mountSymbol = (id: string): void => {
  if (mountedSymbols.has(id) || !symbolIndex) return;
  const markup = symbolIndex.get(id);
  const defs = getSpriteDefs();
  if (!markup || !defs) return;
  mountedSymbols.add(id);
  // A `_light` variant usually just <use>s its base icon: mount that too.
  for (const ref of markup.matchAll(/<use\b[^>]*href="#([^"]+)"/g)) mountSymbol(ref[1]);
  defs.insertAdjacentHTML('beforeend', markup);
};

const flushPending = (): void => {
  for (const id of pendingSymbols) mountSymbol(id);
  pendingSymbols.clear();
};

const ensureFileTypeSymbol = (id: string): void => {
  if (typeof document === 'undefined' || mountedSymbols.has(id)) return;
  if (symbolIndex) {
    mountSymbol(id);
    return;
  }
  pendingSymbols.add(id);
  if (!indexLoading) {
    indexLoading = import('../assets/icons/file-types/sprite.svg?raw')
      .then((module) => {
        symbolIndex = buildSymbolIndex(module.default);
        flushPending();
      })
      .catch((error) => {
        indexLoading = null;
        console.warn('[fileTypeIcons] Failed to load the file icon sprite:', error);
      });
  }
};

const fileNameIconMap: Record<string, string> = {
  dockerfile: 'docker',
  makefile: 'makefile',
  gnumakefile: 'makefile',
  'cmakelists.txt': 'cmake',
  'package-lock.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'pnpm',
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'tsconfig.json': 'tsconfig',
  'jsconfig.json': 'jsconfig',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  '.editorconfig': 'editorconfig',
  '.npmrc': 'npm',
  '.yarnrc': 'yarn',
  '.prettierrc': 'prettier',
  '.eslintrc': 'eslint',
  '.babelrc': 'babel',
};

const languageIconMap: Record<string, string> = {
  javascript: 'javascript',
  jsx: 'react',
  typescript: 'typescript',
  tsx: 'react_ts',
  html: 'html',
  handlebars: 'handlebars',
  twig: 'twig',
  liquid: 'liquid',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  stylus: 'stylus',
  json: 'json',
  yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  ini: 'settings',
  properties: 'settings',
  bash: 'console',
  powershell: 'powershell',
  batch: 'console',
  python: 'python',
  ruby: 'ruby',
  erb: 'ruby',
  php: 'php',
  java: 'java',
  kotlin: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',
  c: 'c',
  cpp: 'cpp',
  objectivec: 'objective-c',
  csharp: 'csharp',
  fsharp: 'fsharp',
  go: 'go',
  rust: 'rust',
  swift: 'swift',
  dart: 'dart',
  lua: 'lua',
  perl: 'perl',
  r: 'r',
  julia: 'julia',
  haskell: 'haskell',
  elixir: 'elixir',
  erlang: 'erlang',
  clojure: 'clojure',
  lisp: 'lisp',
  scheme: 'scheme',
  ocaml: 'ocaml',
  reason: 'reason',
  nim: 'nim',
  zig: 'zig',
  v: 'vlang',
  crystal: 'crystal',
  d: 'd',
  sql: 'database',
  graphql: 'graphql',
  solidity: 'solidity',
  nasm: 'assembly',
  nix: 'nix',
  hcl: 'terraform',
  puppet: 'puppet',
  latex: 'tex',
  bibtex: 'bibliography',
  markdown: 'markdown',
  asciidoc: 'asciidoc',
  text: 'document',
  vim: 'vim',
  makefile: 'makefile',
  cmake: 'cmake',
  diff: 'diff',
  prisma: 'prisma',
  protobuf: 'proto',
  thrift: 'document',
  wasm: 'webassembly',
  glsl: 'shader',
  hlsl: 'shader',
  cg: 'shader',
  apacheconf: 'settings',
  nginx: 'nginx',
};

const extensionIconMap: Record<string, string> = {
  yml: 'yaml',
  mdx: 'mdx',
  md: 'markdown',
  lock: 'lock',
  env: 'settings',
  zip: 'zip',
  tgz: 'zip',
  gz: 'zip',
  rar: 'zip',
  '7z': 'zip',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'svg',
  webp: 'image',
  avif: 'image',
  bmp: 'image',
  ico: 'favicon',
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  ogg: 'audio',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
};

const fallbackIconName = 'document';

const selectVariantIconName = (iconName: string, variant: ThemeVariant): string => {
  if (!iconName) {
    return variant === 'light' ? `${fallbackIconName}_light` : fallbackIconName;
  }

  if (variant === 'light') {
    const lightName = iconName.endsWith('_light') ? iconName : `${iconName}_light`;
    return FILE_TYPE_ICON_IDS.has(lightName) ? lightName : iconName;
  }

  return iconName;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const resolveIconName = (filePath: string, extension?: string): string => {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = normalizedPath.split('/').pop()?.toLowerCase() || '';

  if (fileNameIconMap[fileName]) {
    return fileNameIconMap[fileName];
  }
  if (fileName.startsWith('.env')) {
    return 'settings';
  }
  if (fileName.endsWith('.excalidraw.md')) {
    return 'excalidraw';
  }

  const language = getLanguageFromExtension(filePath);
  if (language && languageIconMap[language]) {
    return languageIconMap[language];
  }

  const normalizedExtension = isNonEmptyString(extension)
    ? extension.toLowerCase()
    : fileName.includes('.')
      ? fileName.split('.').pop()?.toLowerCase() || ''
      : '';

  if (normalizedExtension && extensionIconMap[normalizedExtension]) {
    return extensionIconMap[normalizedExtension];
  }

  if (normalizedExtension && FILE_TYPE_ICON_IDS.has(normalizedExtension)) {
    return normalizedExtension;
  }

  return fallbackIconName;
};

export const getFileTypeIconHref = (
  filePath: string,
  options?: { extension?: string; themeVariant?: ThemeVariant }
): string => {
  const resolvedBaseIconName = resolveIconName(filePath, options?.extension);
  const baseIconName = FILE_TYPE_ICON_IDS.has(resolvedBaseIconName) ? resolvedBaseIconName : fallbackIconName;
  const iconName = selectVariantIconName(baseIconName, options?.themeVariant || 'dark');
  ensureFileTypeSymbol(iconName);
  return `#${iconName}`;
};
