import { getArtifact, updateArtifact } from "./artifacts.js";
import { githubReadProjectFile, githubUpsertProjectBytes } from "./github-execution.js";

function safeRemote(url:string){const parsed=new URL(url);if(parsed.protocol!=="https:")throw new Error("Artifact source must use HTTPS.");const host=parsed.hostname.toLowerCase();if(host==="localhost"||host.endsWith(".local")||/^127\./.test(host)||/^10\./.test(host)||/^192\.168\./.test(host)||/^169\.254\./.test(host))throw new Error("Private artifact sources are not allowed.");return parsed.toString();}
export async function placeArtifactInProject(input:{artifactId:string;projectId:string;path:string;branch:string;message?:string}){
 const artifact=await getArtifact(input.artifactId);if(!artifact)throw new Error("Artifact not found.");if(artifact.status!=="ready")throw new Error("Only ready artifacts can be placed into a project.");const source=artifact.storageUrl||artifact.sourceUrl;if(!source)throw new Error("Artifact has no downloadable source URL.");
 const response=await fetch(safeRemote(source),{signal:AbortSignal.timeout(30000),redirect:"follow"});if(!response.ok)throw new Error(`Artifact download failed (${response.status}).`);const length=Number(response.headers.get("content-length")||0);if(length>20*1024*1024)throw new Error("Artifact exceeds the 20 MB controlled placement limit.");const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>20*1024*1024)throw new Error("Artifact exceeds the 20 MB controlled placement limit.");
 let sha: string|undefined;try{sha=(await githubReadProjectFile({projectId:input.projectId,path:input.path,ref:input.branch})).sha as string}catch{}
 const result=await githubUpsertProjectBytes({projectId:input.projectId,path:input.path,bytes,message:input.message||`Place Game Shop artifact ${artifact.artifactId}`,branch:input.branch,sha});
 await updateArtifact(artifact.artifactId,{metadata:{placed:{projectId:input.projectId,path:input.path,branch:input.branch,commitSha:result.commitSha}}});
 return{artifactId:artifact.artifactId,bytes:bytes.byteLength,mimeType:response.headers.get("content-type")||artifact.mimeType||null,...result};
}
