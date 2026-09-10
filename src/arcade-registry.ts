import { setProjectOverlay } from './project-overlay.js';

const REGISTRY_REPO = process.env.GAME_SHOP_ARCADE_REGISTRY_REPO || 'thegreishow/thegreishow.com';
const REGISTRY_PATH = process.env.GAME_SHOP_ARCADE_REGISTRY_PATH || 'arcade/games/games.json';
const CACHE_MS = Math.max(5_000, Number(process.env.GAME_SHOP_ARCADE_REGISTRY_CACHE_MS || 60_000));

type ArcadeMcpMetadata = {
  aliases?: string[];
  framework?: string;
  productKind?: string;
  gamePath?: string;
  artStyle?: string;
  notes?: string;
  verifyPaths?: string[];
};
export type ArcadeGameRecord = {
  id: string;
  title: string;
  version?: string;
  type?: string;
  entry: string;
  thumbnail?: string;
  tags?: string[];
  mcp: ArcadeMcpMetadata;
  qa?: Record<string, unknown>;
};

type Cache = { games: ArcadeGameRecord[]; loadedAt: number; source: string };
let cache: Cache | null = null;
const aliases = new Map<string, string>();

function githubToken() { return process.env.GAME_SHOP_GITHUB_TOKEN || process.env.GITHUB_TOKEN || ''; }
function validateGame(value: unknown): value is ArcadeGameRecord {
  if (!value || typeof value !== 'object') return false;
  const game = value as Record<string, unknown>;
  const mcp = game.mcp as Record<string, unknown> | undefined;
  return typeof game.id === 'string' && typeof game.title === 'string' && typeof game.entry === 'string' && Boolean(mcp && typeof mcp.gamePath === 'string');
}
function parseRegistry(raw: unknown) {
  if (!Array.isArray(raw)) throw new Error('Arcade registry must be an array.');
  const games = raw.filter(validateGame);
  if (games.length !== raw.length) throw new Error('Arcade registry contains invalid records.');
  const seen = new Set<string>();
  for (const game of games) {
    if (seen.has(game.id)) throw new Error(`Duplicate arcade game id: ${game.id}`);
    seen.add(game.id);
    if (!game.mcp.gamePath?.startsWith('arcade/games/')) throw new Error(`${game.id}: invalid gamePath`);
    if (!game.entry.startsWith(`${game.mcp.gamePath}/`)) throw new Error(`${game.id}: entry is outside gamePath`);
  }
  return games;
}
function installOverlays(games: ArcadeGameRecord[]) {
  aliases.clear();
  for (const game of games) {
    const projectPath = game.mcp.gamePath || `arcade/games/${game.id}`;
    setProjectOverlay({
      id: game.id,
      name: game.title,
      repo: REGISTRY_REPO,
      defaultBranch: 'main',
      framework: game.mcp.framework || 'browser-game',
      productKind: game.mcp.productKind || 'browser-game',
      projectPath,
      gamePath: projectPath,
      artStyle: game.mcp.artStyle,
      notes: game.mcp.notes,
      verifyPaths: game.mcp.verifyPaths?.length ? game.mcp.verifyPaths : [projectPath],
    });
    for (const alias of game.mcp.aliases || []) if (alias && alias !== game.id) aliases.set(alias, game.id);
  }
}
async function fetchRegistryFromGitHub() {
  const token = githubToken();
  if (!token) throw new Error('GAME_SHOP_GITHUB_TOKEN is required to read the private arcade registry.');
  const [owner, repo] = REGISTRY_REPO.split('/');
  if (!owner || !repo) throw new Error('Invalid GAME_SHOP_ARCADE_REGISTRY_REPO.');
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${REGISTRY_PATH.split('/').map(encodeURIComponent).join('/')}?ref=main`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json', 'User-Agent': 'game-shop-mcp' }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Arcade registry fetch failed (${response.status}).`);
  const rawText = await response.text();
  let raw: unknown;
  try { raw = JSON.parse(rawText); } catch { throw new Error('Arcade registry returned invalid JSON.'); }
  return parseRegistry(raw);
}

export async function refreshArcadeRegistry(input: { force?: boolean } = {}) {
  if (!input.force && cache && Date.now() - cache.loadedAt < CACHE_MS) return { games: cache.games, source: cache.source, cached: true };
  const envRaw = process.env.GAME_SHOP_ARCADE_REGISTRY_JSON;
  try {
    const games = envRaw ? parseRegistry(JSON.parse(envRaw)) : await fetchRegistryFromGitHub();
    installOverlays(games);
    cache = { games, loadedAt: Date.now(), source: envRaw ? 'env-fallback' : `${REGISTRY_REPO}:${REGISTRY_PATH}` };
    return { games, source: cache.source, cached: false };
  } catch (error) {
    if (cache) return { games: cache.games, source: cache.source, cached: true, warning: error instanceof Error ? error.message : String(error) };
    throw error;
  }
}

export function resolveArcadeAlias(id: string) { return aliases.get(id) || id; }
export function arcadeRegistryInfo() {
  return {
    primarySource: `${REGISTRY_REPO}:${REGISTRY_PATH}`,
    cacheMs: CACHE_MS,
    loaded: Boolean(cache),
    gameCount: cache?.games.length ?? 0,
    aliases: Object.fromEntries(aliases),
    rule: 'arcade/games/games.json is the primary source of truth for registered arcade titles; MCP overlays are generated from it at runtime.',
  };
}
