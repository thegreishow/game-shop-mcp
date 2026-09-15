import { removeProjectOverlay, setProjectOverlay } from "./project-overlay.js";

const REPO = "thegreishow/thegreishow.com";
const REGISTRY_PATH = "arcade/games/games.json";
let canonicalIds = new Set<string>();

type ArcadeGame = {
  id: string;
  title?: string;
  entry: string;
};

function githubToken(){return process.env.GAME_SHOP_GITHUB_TOKEN||process.env.GITHUB_TOKEN;}
function projectRoot(entry:string){const clean=entry.split("?")[0].replace(/^\/+/,"");const slash=clean.lastIndexOf("/");return slash>0?clean.slice(0,slash):clean;}

async function fetchCanonicalGames(){
  const token=githubToken();
  if(token){
    const response=await fetch(`https://api.github.com/repos/${REPO}/contents/${REGISTRY_PATH}?ref=main`,{
      headers:{accept:"application/vnd.github+json",authorization:`Bearer ${token}`,"user-agent":"game-shop-mcp"},
      signal:AbortSignal.timeout(8000),
    });
    if(!response.ok)throw new Error(`Canonical arcade registry fetch failed (${response.status}).`);
    const payload=await response.json() as {content?:string;encoding?:string};
    if(payload.encoding!=="base64"||!payload.content)throw new Error("Canonical arcade registry returned no decodable content.");
    return JSON.parse(Buffer.from(payload.content.replace(/\n/g,""),"base64").toString("utf8")) as ArcadeGame[];
  }

  const response=await fetch(`https://raw.githubusercontent.com/${REPO}/main/${REGISTRY_PATH}`,{
    headers:{"user-agent":"game-shop-mcp"},
    signal:AbortSignal.timeout(8000),
  });
  if(!response.ok)throw new Error(`Canonical arcade registry public fetch failed (${response.status}).`);
  return await response.json() as ArcadeGame[];
}

export async function hydrateArcadeRegistry(){
  const games=await fetchCanonicalGames();
  if(!Array.isArray(games))throw new Error("Canonical arcade registry must be an array.");
  const ids=new Set<string>();
  const projects=[];
  for(const game of games){
    if(!game||typeof game.id!=="string"||typeof game.entry!=="string")throw new Error("Canonical arcade registry contains an invalid game record.");
    if(ids.has(game.id))throw new Error(`Canonical arcade registry contains duplicate id: ${game.id}`);
    ids.add(game.id);
    const root=projectRoot(game.entry);
    if(!root.startsWith("arcade/games/")||root.includes(".."))throw new Error(`Unsafe game entry in canonical registry: ${game.id}`);
    projects.push({id:game.id,name:game.title??game.id,repo:REPO,defaultBranch:"main",framework:"browser-game",productKind:"browser-game",projectPath:root,gamePath:root,verifyPaths:[root]});
  }
  for(const id of canonicalIds){if(!ids.has(id))removeProjectOverlay(id);}
  for(const project of projects)setProjectOverlay(project);
  canonicalIds=ids;
  return{authority:REGISTRY_PATH,repository:REPO,hydrated:games.length,available:true,credentialMode:githubToken()?"authenticated":"public",projects:[...ids]};
}

export function arcadeRegistryInfo(){return{authority:REGISTRY_PATH,repository:REPO,role:"sole game inventory and project-root authority",operationalEnrichment:"Project Registry V2",legacyFallback:false,publicHydration:true};}
