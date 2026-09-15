// Build-time fallback for Game Shop project resolution when the standalone
// runtime has no GitHub credential. The authoritative source remains
// thegreishow/thegreishow.com:arcade/games/games.json; refresh this snapshot
// whenever that registry changes.
export const ARCADE_REGISTRY_SNAPSHOT = {
  source: "thegreishow/thegreishow.com:arcade/games/games.json",
  capturedAt: "2026-09-14T00:00:00Z",
  games: [
    { id: "dubai-legends", title: "Dubai Legends: Night Cup 2026", entry: "arcade/games/dubai-legends/index.html?v=20260909af" },
    { id: "orbit-breaker", title: "Orbit Breaker", entry: "arcade/games/orbit-breaker/index.html" },
    { id: "rodeo-are-you-ready", title: "Rodeo: Are You Ready", entry: "arcade/games/rodeo-are-you-ready/index.html" },
    { id: "dreamweaver-oracle", title: "Dreamweaver", entry: "arcade/games/dreamweaver-oracle/index.html" },
    { id: "signal-runner", title: "Signal Runner", entry: "arcade/games/signal-runner/index.html?v=20260909a" },
    { id: "jamaica-run", title: "Rasta Runner", entry: "arcade/games/jamaica-run/index.html?v=20260909b" },
  ],
} as const;
