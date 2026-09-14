import { getVercelOidcToken } from "@vercel/functions/oidc";

export async function GET(){
  let available=false;
  let error:string|null=null;
  try{available=Boolean(await getVercelOidcToken());}catch(err){error=err instanceof Error?err.message:String(err);}
  return Response.json({oidcAvailable:available,error:error?"oidc-unavailable":null},{headers:{"cache-control":"no-store"}});
}
