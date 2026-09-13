import { routeSdkCapability, sdkHubStatus } from "../src/sdk-hub.js";

const status = sdkHubStatus();
if (status.length !== 5) throw new Error(`Expected 5 SDK providers, found ${status.length}.`);

const ids = new Set(status.map((row) => row.id));
for (const required of ["replicate", "fal", "elevenlabs", "scenario", "cloudinary"]) {
  if (!ids.has(required as never)) throw new Error(`Missing SDK provider: ${required}`);
}

const delivery = routeSdkCapability("media-delivery", { requireConfigured: false });
if (delivery !== "cloudinary") throw new Error(`Expected Cloudinary for media delivery, got ${delivery}.`);

const speech = routeSdkCapability("speech-generation", { requireConfigured: false });
if (speech !== "elevenlabs") throw new Error(`Expected ElevenLabs for speech, got ${speech}.`);

console.log("SDK Hub smoke: OK");
console.log(`providers=${status.length}`);
console.log("paid provider requests executed=0");
