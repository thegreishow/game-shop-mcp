export type ProviderName = "spriteship" | "autosprite" | "sprite-ai" | "aimlapi" | "deepseek";

export type ProviderInfo = {
  name: ProviderName;
  purpose: string;
  configured: boolean;
};

export function providerStatus(): ProviderInfo[] {
  return [
    {
      name: "spriteship",
      purpose: "Primary game-art and animation pipeline",
      configured: Boolean(process.env.SPRITESHIP_API_KEY),
    },
    {
      name: "autosprite",
      purpose: "Character generation and Phaser-ready sprite sheets",
      configured: Boolean(process.env.AUTOSPRITE_API_KEY),
    },
    {
      name: "sprite-ai",
      purpose: "2D and pixel-art sprite specialist",
      configured: Boolean(process.env.SPRITE_AI_API_KEY),
    },
    {
      name: "aimlapi",
      purpose: "General AI model gateway for image, video, audio, and text models",
      configured: Boolean(process.env.AIMLAPI_API_KEY),
    },
    {
      name: "deepseek",
      purpose: "Coding and reasoning provider",
      configured: Boolean(process.env.DEEPSEEK_API_KEY),
    },
  ];
}

async function readJson(response: Response) {
  const text = await response.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Preserve provider text for diagnostics.
  }
  if (!response.ok) {
    throw new Error(`Provider request failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body;
}

export async function autoSpriteCreateCharacter(input: {
  name: string;
  prompt: string;
  quality?: "turbo" | "pro";
  isHumanoid?: boolean;
}) {
  const key = process.env.AUTOSPRITE_API_KEY;
  if (!key) throw new Error("AUTOSPRITE_API_KEY is not configured");

  const response = await fetch("https://www.autosprite.io/api/v1/characters", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name: input.name,
      prompt: input.prompt,
      quality: input.quality ?? "turbo",
      isHumanoid: input.isHumanoid ?? true,
      usePromptTemplate: true,
    }),
  });
  return readJson(response);
}

export async function autoSpriteGenerateAnimations(input: {
  characterId: string;
  animations: Array<{ kind: string; name?: string; prompt?: string }>;
  videoTier?: "turbo" | "pro" | "ultra" | "max";
  frameCount?: number;
  frameSize?: number;
  removeBg?: "default" | "ultra";
}) {
  const key = process.env.AUTOSPRITE_API_KEY;
  if (!key) throw new Error("AUTOSPRITE_API_KEY is not configured");

  const response = await fetch(
    `https://www.autosprite.io/api/v1/characters/${encodeURIComponent(input.characterId)}/spritesheets`,
    {
      method: "POST",
      headers: {
        "x-api-key": key,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        animations: input.animations,
        videoTier: input.videoTier ?? "turbo",
        frameCount: input.frameCount ?? 25,
        frameSize: input.frameSize ?? 256,
        removeBg: input.removeBg ?? "ultra",
      }),
    },
  );
  return readJson(response);
}

export async function autoSpriteGetJob(jobId: string) {
  const key = process.env.AUTOSPRITE_API_KEY;
  if (!key) throw new Error("AUTOSPRITE_API_KEY is not configured");
  const response = await fetch(`https://www.autosprite.io/api/v1/jobs/${encodeURIComponent(jobId)}`, {
    headers: { "x-api-key": key },
  });
  return readJson(response);
}

export async function autoSpriteGetSpritesheet(spritesheetId: string) {
  const key = process.env.AUTOSPRITE_API_KEY;
  if (!key) throw new Error("AUTOSPRITE_API_KEY is not configured");
  const response = await fetch(`https://www.autosprite.io/api/v1/spritesheets/${encodeURIComponent(spritesheetId)}`, {
    headers: { "x-api-key": key },
  });
  return readJson(response);
}
