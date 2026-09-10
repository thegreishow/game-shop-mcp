import { controlCenterSnapshot } from "./control-center.js";
import { governanceInfo, listEvents, listPreviews } from "./governance-ledger.js";
import { integrationHealthInfo } from "./integration-health.js";
import { projectRegistryV2Info, listProjectsV2 } from "./project-registry-v2.js";
import { providerReconcilerInfo } from "./provider-reconciler.js";
import { trustPipelineV2Info, trustedCapabilityPortfolio } from "./trust-pipeline-v2.js";
import { continuousDiscoveryInfo } from "./continuous-discovery.js";
import { multiAiContinuityInfo } from "./multi-ai-continuity.js";
import { distributedRateLimitInfo } from "./distributed-rate-limit.js";
export async function controlCenterV2Snapshot(){const [base,projects,events,previews,trust]=await Promise.all([controlCenterSnapshot(),listProjectsV2(),listEvents({limit:50}),listPreviews({limit:50}),trustedCapabilityPortfolio()]);return{schemaVersion:"2.0",base,supervision:{projects,events,previews,trust},systems:{governance:governanceInfo(),projectRegistry:projectRegistryV2Info(),integrationHealth:integrationHealthInfo(),providerReconciler:providerReconcilerInfo(),trustPipeline:trustPipelineV2Info(),continuousDiscovery:continuousDiscoveryInfo(),multiAiContinuity:multiAiContinuityInfo(),rateLimit:distributedRateLimitInfo()},actions:["approve-repair","reject-repair","approve-mcp","quarantine-mcp","authorize-budget","run-qa","retry-provider","promote-preview"],questions:["Why did this build fail?","Who approved this?","What did it cost?","What changed?","What evidence made it green?"]};}
export function controlCenterV2Info(){return{version:"2.0",role:"human-supervisory-cockpit",surfaces:["active-executions","tasks","projects","provider-jobs","artifact-graph","previews","browser-evidence","repair-proposals","approvals","costs","trust-candidates","integration-health","release-gates","deployment-history","system-audit"]};}
