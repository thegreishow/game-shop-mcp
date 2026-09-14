import { missionCodeAgentStatus } from "../src/mission-code-agent.js";

export async function GET(){
  const status=missionCodeAgentStatus();
  return Response.json({
    available:status.available,
    githubConfigured:status.githubConfigured,
    codeModelConfigured:status.codeModelConfigured,
    codeModelProvider:status.codeModelProvider,
    vercelOidcAvailable:status.vercelOidcAvailable,
    aiGatewayKeyConfigured:status.aiGatewayKeyConfigured,
    openAiFallbackConfigured:status.openAiFallbackConfigured,
    emergencyDisabled:status.emergencyDisabled,
    model:status.model,
  },{headers:{"cache-control":"no-store"}});
}
