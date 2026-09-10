import { setProjectOverlay } from "./project-overlay.js";

const REPO = "thegreishow/thegreishow.com";
const REGISTRY_PATH = "arcade/games/games.json";

type ArcadeGame = {
  id: string;
  title?: string;
  entry: string;
};

function githubToken(){return process.env.GAME_SHOP_GITHUB_TOKEN||process.env.GITHUB_TOKEN;}
function projectRoot(entry:string){const clean=entry.split("?")[0].replace(/^\/+/,"");const slash=clean.lastIndexOf("/");return slash>0?clean.slice(0,slash):clean;}

export async function hydrateArcadeRegistry(){
  const token=githubToken();
  if(!token)return{authority:"arcade/games/games.json",hydrated:0,available:false,reason:"github credential not configured"};
  const response=await fetch(`https://api.github.com/repos/${REPO}/contents/${REGISTRY_PATH}?ref=main`,{
    headers:{accept:"application/vnd.github+json",authorization:`Bearer ${token}`,"user-agent":"game-shop-mcp"},
    signal:AbortSignal.timeout(8000),
  });
  if(!response.ok)throw new Error(`Canonical arcade registry fetch failed (${response.status}).`);
  const payload=await response.json() as {content?:string;encoding?:string};
  if(payload.encoding!=="base64"||!payload.content)throw new Error("Canonical arcade registry returned no decodable content.");
  const games=JSON.parse(Buffer.from(payload.content.replace(/\n/g,""),"base64").toString("utf8")) as ArcadeGame[];
  if(!Array.isArray(games))throw new Error("Canonical arcade registry must be an array.");
  const ids=new Set<string>();
  for(const game of games){
    if(!game||typeof game.id!=="string"||typeof game.entry!=="string")throw new Error("Canonical arcade registry contains an invalid game record.");
    if(ids.has(game.id))throw new Error(`Canonical arcade registry contains duplicate id: ${game.id}`);
    ids.add(game.id);
    const root=projectRoot(game.entry);
    if(!root.startsWith("arcade/games/")||root.includes(".."))throw new Error(`Unsafe game entry in canonical registry: ${game.id}`);
    setProjectOverlay({id:game.id,name:game.title??game.id,repo:REPO,defaultBranch:"main",framework:"browser-game",productKind:"browser-game",projectPath:root,gamePath:root,verifyPaths:[root]});
  }
  return{authority:REGISTRY_PATH,repository:REPO,hydrated:games.length,available:true,projects:[...ids]};
}

export function arcadeRegistryInfo(){return{authority:REGISTRY_PATH,repository:REPO,role:"canonical game inventory and project-root source",operationalEnrichment:"Project Registry V2"};}
