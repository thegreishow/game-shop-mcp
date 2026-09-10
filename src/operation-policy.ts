export type OperationClass = 'read' | 'generate' | 'write' | 'destructive' | 'deploy';

const FLAGS: Record<OperationClass, string | null> = {
  read: null,
  generate: 'GAME_SHOP_ALLOW_GENERATION',
  write: 'GAME_SHOP_ALLOW_EXTERNAL_WRITES',
  destructive: 'GAME_SHOP_ALLOW_DESTRUCTIVE_EXTERNAL_ACTIONS',
  deploy: 'GAME_SHOP_ALLOW_DEPLOY',
};

export function operationPolicy() {
  const enabled = Object.fromEntries((Object.keys(FLAGS) as OperationClass[]).map(kind => [kind, kind === 'read' || (FLAGS[kind] ? process.env[FLAGS[kind]!] === 'true' : true)]));
  return {
    classes: ['read','generate','write','destructive','deploy'] as OperationClass[],
    enabled,
    flags: FLAGS,
    defaults: { read: true, generate: false, write: false, destructive: false, deploy: false },
    compatibility: {
      githubWrite: 'GAME_SHOP_ALLOW_GITHUB_WRITES remains a separate required gate for GitHub mutations.',
      paidGeneration: 'GAME_SHOP_ALLOW_PAID_GENERATION remains an additional required gate for paid generation.',
      externalNetwork: 'GAME_SHOP_ALLOW_EXTERNAL_INTEGRATIONS remains a network-level master gate, not an authorization substitute.',
    },
  };
}

export function operationAllowed(kind: OperationClass) {
  if (kind === 'read') return true;
  const flag = FLAGS[kind];
  return Boolean(flag && process.env[flag] === 'true');
}

export function assertOperationAllowed(kind: OperationClass, action: string) {
  if (!operationAllowed(kind)) throw new Error(`${kind} operations are disabled. Enable ${FLAGS[kind]} explicitly before ${action}.`);
}
