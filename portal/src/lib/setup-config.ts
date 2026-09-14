export function claudeSettings(origin: string, key: string): string {
  return JSON.stringify(
    {
      env: {
        ANTHROPIC_BASE_URL: origin,
        ANTHROPIC_AUTH_TOKEN: key,
        API_TIMEOUT_MS: '3000000',
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      },
    },
    null,
    2
  )
}

export function codexToml(origin: string): string {
  return `model = "gpt-5.5"
model_provider = "transit"

[model_providers.transit]
name = "transit"
base_url = "${origin}/v1"
env_key = "TRANSIT_API_KEY"
wire_api = "responses"`
}

export function codexEnv(key: string): string {
  return `# macOS / Linux（写进 ~/.zshrc）
export TRANSIT_API_KEY="${key}"

# Windows PowerShell
setx TRANSIT_API_KEY "${key}"`
}

export function openaiPython(origin: string, key: string): string {
  return `from openai import OpenAI

client = OpenAI(
    base_url="${origin}/v1",
    api_key="${key}",
)
resp = client.chat.completions.create(
    model="gpt-5.5",
    messages=[{"role": "user", "content": "hello"}],
)`
}

export function openaiNode(origin: string, key: string): string {
  return `import OpenAI from "openai";
const client = new OpenAI({ baseURL: "${origin}/v1", apiKey: "${key}" });`
}

export function anthropicPython(origin: string, key: string): string {
  return `from anthropic import Anthropic

client = Anthropic(
    base_url="${origin}",
    api_key="${key}",
)`
}

export function modelsCurl(origin: string, key: string): string {
  return `curl ${origin}/v1/models \\
  -H "Authorization: Bearer ${key}"`
}

export function inviteBlurb(origin: string, aff: string): string {
  const link = `${origin}/register?aff=${encodeURIComponent(aff)}`
  return `这是 Polaris API 的邀请链接，点开就能注册（邀请制，没有链接注册不了）：
${link}

注册后到「密钥」建一把 key，再去「接入」复制 Claude Code / Codex 配置。余额找我要兑换码。`
}
