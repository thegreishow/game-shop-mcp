import { timingSafeEqual } from "node:crypto";
import { listQaEvidence, qaEvidenceInfo, upsertQaEvidence } from "../src/qa-evidence.js";
import { authorizeRequest } from "../src/security.js";

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});}
function workerAuthorized(request:Request){const expected=process.env.GAME_SHOP_WORKER_SECRET?.trim();const provided=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim();if(!expected||!provided)return false;const a=Buffer.from(expected),b=Buffer.from(provided);return a.length===b.length&&timingSafeEqual(a,b);}

export async function POST(request:Request){
  if(!workerAuthorized(request))return json({error:"Unauthorized worker"},401);
  try{
    const body=await request.json() as Record<string,unknown>;
    const projectId=String(body.projectId??"");
    const provider=String(body.provider??"");
    const status=String(body.status??"");
    if(!projectId||!provider||!["queued","running","passed","failed","blocked"].includes(status))return json({error:"Invalid evidence payload"},400);
    const saved=await upsertQaEvidence({
      evidenceId:body.evidenceId?String(body.evidenceId):undefined,
      executionId:body.executionId?String(body.executionId):undefined,
      projectId,
      provider,
      runId:body.runId?String(body.runId):undefined,
      commitSha:body.commitSha?String(body.commitSha):undefined,
      previewUrl:body.previewUrl?String(body.previewUrl):undefined,
      status:status as "queued"|"running"|"passed"|"failed"|"blocked",
      evidence:(body.evidence&&typeof body.evidence==="object"?body.evidence:{}) as Record<string,unknown>,
    });
    return json({ok:true,evidence:saved});
  }catch(error){return json({error:error instanceof Error?error.message:"Evidence ingestion failed"},400);}
}

export async function GET(request:Request){
  const auth=authorizeRequest(request);
  if(!auth.ok)return json({error:auth.error},auth.status);
  const url=new URL(request.url);
  const rows=await listQaEvidence({projectId:url.searchParams.get("projectId")||undefined,executionId:url.searchParams.get("executionId")||undefined,provider:url.searchParams.get("provider")||undefined,limit:Number(url.searchParams.get("limit")||50)});
  return json({info:qaEvidenceInfo(),evidence:rows});
}
