import { diagnosticsRoute } from "../src/http/diagnostics-route.js";
import { storageRoute } from "../src/http/storage-route.js";
import { tasksRoute } from "../src/http/tasks-route.js";

async function route(request:Request){
  const url=new URL(request.url);
  const target=url.searchParams.get("route")||"";
  if(target==="diagnostics")return diagnosticsRoute(request);
  if(target==="storage")return storageRoute(request);
  if(target==="tasks")return tasksRoute(request);
  return new Response(JSON.stringify({error:"Unknown utility route"}),{status:404,headers:{"content-type":"application/json"}});
}

export { route as GET, route as POST, route as DELETE };
