#!/usr/bin/env node
/**
 * ComfyUI MCP server.
 *
 * Talks to a locally running ComfyUI over its HTTP API, so generation uses the
 * user's own GPU. No cloud, no API keys, no per-image cost.
 *
 * Tools:
 *   status             — is the server up, queue depth, VRAM
 *   models             — available unets, text encoders, VAEs
 *   workflows          — built-in and saved workflows, with what they need
 *   validate-workflow  — check a workflow against the live ComfyUI before running it
 *   generate           — text to image, waits, copies the PNG into the project
 *   history            — recent generations known to ComfyUI
 *
 * Workflows live in production/workflows/<name>.json. A workflow file is either
 * a raw API graph or { name, description, models, defaults, graph }. Placeholders
 * inside strings are replaced from the generate arguments: {{prompt}},
 * {{negative}}, {{width}}, {{height}}, {{steps}}, {{cfg}}, {{seed}}.
 *
 * Config: production/comfyui.json -> { "url": "...", "dir": "..." }
 * Env: COMFYUI_URL, COMFYUI_DIR, COMFYUI_TIMEOUT_MS
 */
import fs from "node:fs"
import path from "node:path"
import readline from "node:readline"

const ROOT = process.cwd()
const DEFAULT_URL = "http://127.0.0.1:8188"
const WORKFLOWS = path.join(ROOT, "production", "workflows")

function config() {
  const file = path.join(ROOT, "production", "comfyui.json")
  let data = {}
  if (fs.existsSync(file)) {
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""))
    } catch {
      data = {}
    }
  }
  return {
    url: (process.env.COMFYUI_URL ?? data.url ?? DEFAULT_URL).replace(/\/+$/, ""),
    dir: process.env.COMFYUI_DIR ?? data.dir ?? "",
  }
}

const TIMEOUT_MS = Number(process.env.COMFYUI_TIMEOUT_MS ?? 300000)

// ── Built-in workflow ────────────────────────────────────────────────────────
// Verified on this machine: ComfyUI 0.20.1, flux-2-klein-base-4b, qwen_3_4b
// (clip type flux2), flux2-vae, SamplerCustomAdvanced + Flux2Scheduler.

function builtinGraph() {
  return {
    "1": { class_type: "UNETLoader", inputs: { unet_name: "flux-2-klein-base-4b.safetensors", weight_dtype: "default" } },
    "2": { class_type: "CLIPLoader", inputs: { clip_name: "qwen_3_4b.safetensors", type: "flux2", device: "default" } },
    "3": { class_type: "VAELoader", inputs: { vae_name: "flux2-vae.safetensors" } },
    "4": { class_type: "CLIPTextEncode", inputs: { text: "{{prompt}}", clip: ["2", 0] } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: "{{negative}}", clip: ["2", 0] } },
    "6": { class_type: "EmptyFlux2LatentImage", inputs: { width: "{{width}}", height: "{{height}}", batch_size: 1 } },
    "7": { class_type: "Flux2Scheduler", inputs: { steps: "{{steps}}", width: "{{width}}", height: "{{height}}" } },
    "8": { class_type: "KSamplerSelect", inputs: { sampler_name: "euler" } },
    "9": { class_type: "CFGGuider", inputs: { cfg: "{{cfg}}", model: ["1", 0], positive: ["4", 0], negative: ["5", 0] } },
    "10": { class_type: "RandomNoise", inputs: { noise_seed: "{{seed}}" } },
    "11": {
      class_type: "SamplerCustomAdvanced",
      inputs: { noise: ["10", 0], guider: ["9", 0], sampler: ["8", 0], sigmas: ["7", 0], latent_image: ["6", 0] },
    },
    "12": { class_type: "VAEDecode", inputs: { samples: ["11", 0], vae: ["3", 0] } },
    "13": { class_type: "SaveImage", inputs: { images: ["12", 0], filename_prefix: "agent" } },
  }
}

const BUILTIN = {
  name: "flux2-klein",
  description: "Flux 2 Klein 4B. Stylized illustration, textures, backgrounds, concept art. The verified default.",
  models: {
    unet: "flux-2-klein-base-4b.safetensors",
    clip: "qwen_3_4b.safetensors",
    clip_type: "flux2",
    vae: "flux2-vae.safetensors",
  },
  defaults: { width: 1024, height: 1024, steps: 20, cfg: 5 },
}

// ── Workflow files ───────────────────────────────────────────────────────────

function readWorkflowFile(file) {
  const raw = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""))
  if (raw.graph && typeof raw.graph === "object") return raw
  return { name: path.basename(file, ".json"), description: "", graph: raw }
}

function listWorkflows() {
  const saved = []
  if (fs.existsSync(WORKFLOWS)) {
    for (const file of fs.readdirSync(WORKFLOWS).filter((f) => f.endsWith(".json"))) {
      try {
        const wf = readWorkflowFile(path.join(WORKFLOWS, file))
        saved.push({
          name: wf.name,
          file: path.join("production", "workflows", file).split(path.sep).join("/"),
          description: wf.description ?? "",
          models: wf.models ?? {},
          defaults: wf.defaults ?? {},
          nodes: Object.keys(wf.graph ?? {}).length,
        })
      } catch {
        saved.push({ name: path.basename(file, ".json"), file, error: "invalid JSON" })
      }
    }
  }
  return { builtin: { ...BUILTIN, nodes: Object.keys(builtinGraph()).length }, saved }
}

function resolveWorkflow(nameOrPath = "flux2-klein") {
  const direct = path.resolve(ROOT, nameOrPath)
  if (fs.existsSync(direct) && direct.endsWith(".json")) return readWorkflowFile(direct)

  const candidate = path.join(WORKFLOWS, `${nameOrPath}.json`)
  if (fs.existsSync(candidate)) return readWorkflowFile(candidate)

  if (nameOrPath === "flux2-klein") {
    return { ...BUILTIN, graph: builtinGraph() }
  }

  const available = ["flux2-klein", ...(fs.existsSync(WORKFLOWS) ? fs.readdirSync(WORKFLOWS).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [])]
  throw new Error(`unknown workflow "${nameOrPath}". Available: ${available.join(", ")}`)
}

function substitute(value, vars) {
  if (typeof value === "string") {
    const exact = value.match(/^\{\{(\w+)\}\}$/)
    if (exact) {
      const key = exact[1]
      if (!(key in vars)) throw new Error(`workflow placeholder {{${key}}} has no value`)
      return vars[key]
    }
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in vars ? String(vars[key]) : `{{${key}}}`))
  }
  if (Array.isArray(value)) return value.map((item) => substitute(item, vars))
  if (value && typeof value === "object") {
    const out = {}
    for (const [key, item] of Object.entries(value)) out[key] = substitute(item, vars)
    return out
  }
  return value
}

// ── HTTP ─────────────────────────────────────────────────────────────────────

async function jsonGet(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`ComfyUI responded ${response.status} at ${url}`)
  return response.json()
}

async function jsonPost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`ComfyUI responded ${response.status}: ${text.slice(0, 300)}`)
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

function unavailable(error) {
  return (
    `ComfyUI is not reachable at ${config().url} (${error.message}). ` +
    'Start it with run_nvidia_gpu.bat in the ComfyUI folder, or set COMFYUI_URL.'
  )
}

// ── Tools ────────────────────────────────────────────────────────────────────

async function status() {
  const { url } = config()
  try {
    const stats = await jsonGet(`${url}/system_stats`)
    const queue = await jsonGet(`${url}/queue`)
    return JSON.stringify(
      {
        ok: true,
        url,
        version: stats.system?.comfyui_version,
        device: stats.devices?.[0]?.name,
        vram_total_mb: Math.round((stats.devices?.[0]?.vram_total ?? 0) / 1024 / 1024),
        vram_free_mb: Math.round((stats.devices?.[0]?.vram_free ?? 0) / 1024 / 1024),
        queue: { running: queue.queue_running?.length ?? 0, pending: queue.queue_pending?.length ?? 0 },
      },
      null,
      2,
    )
  } catch (error) {
    return JSON.stringify({ ok: false, error: unavailable(error) })
  }
}

async function models() {
  const { url } = config()
  try {
    const unet = await jsonGet(`${url}/object_info/UNETLoader`)
    const clip = await jsonGet(`${url}/object_info/CLIPLoader`)
    const vae = await jsonGet(`${url}/object_info/VAELoader`)
    return JSON.stringify(
      {
        ok: true,
        unets: unet.UNETLoader.input.required.unet_name[0],
        clips: clip.CLIPLoader.input.required.clip_name[0],
        clip_types: clip.CLIPLoader.input.required.type[0],
        vaes: vae.VAELoader.input.required.vae_name[0],
      },
      null,
      2,
    )
  } catch (error) {
    return JSON.stringify({ ok: false, error: unavailable(error) })
  }
}

function workflows() {
  return JSON.stringify({ ok: true, ...listWorkflows() }, null, 2)
}

async function validateWorkflow(args = {}) {
  const { url } = config()
  let workflow
  try {
    workflow = resolveWorkflow(args.workflow ?? "flux2-klein")
  } catch (error) {
    return JSON.stringify({ ok: false, error: error.message })
  }

  let info
  try {
    info = await jsonGet(`${url}/object_info`)
  } catch (error) {
    return JSON.stringify({ ok: false, error: unavailable(error) })
  }

  const problems = []
  const graph = workflow.graph ?? {}

  for (const [id, node] of Object.entries(graph)) {
    const definition = info[node.class_type]
    if (!definition) {
      problems.push(`node ${id}: class_type "${node.class_type}" does not exist in this ComfyUI`)
      continue
    }
    const required = definition.input?.required ?? {}
    for (const key of Object.keys(required)) {
      if (!(key in (node.inputs ?? {}))) problems.push(`node ${id} (${node.class_type}): missing required input "${key}"`)
    }
    for (const [key, value] of Object.entries(node.inputs ?? {})) {
      const spec = required[key] ?? definition.input?.optional?.[key]
      if (!spec) {
        problems.push(`node ${id} (${node.class_type}): unknown input "${key}"`)
        continue
      }
      const enumValues = Array.isArray(spec[0]) ? spec[0] : null
      if (enumValues && typeof value === "string" && !value.startsWith("{{") && !enumValues.includes(value)) {
        problems.push(`node ${id} (${node.class_type}): "${value}" is not a valid value for "${key}"`)
      }
    }
  }

  return JSON.stringify(
    {
      ok: problems.length === 0,
      workflow: workflow.name ?? args.workflow,
      nodes: Object.keys(graph).length,
      models: workflow.models ?? {},
      problems,
    },
    null,
    2,
  )
}

async function generate(args = {}) {
  const { url } = config()
  const prompt = String(args.prompt ?? "").trim()
  if (!prompt) return JSON.stringify({ ok: false, error: "prompt is required" })

  let workflow
  try {
    workflow = resolveWorkflow(args.workflow ?? "flux2-klein")
  } catch (error) {
    return JSON.stringify({ ok: false, error: error.message })
  }

  const defaults = workflow.defaults ?? {}
  const width = Math.max(256, Math.min(2048, Number(args.width) || defaults.width || 1024))
  const height = Math.max(256, Math.min(2048, Number(args.height) || defaults.height || 1024))
  const steps = Math.max(1, Math.min(60, Number(args.steps) || defaults.steps || 20))
  const cfg = Math.max(0, Math.min(20, Number(args.cfg) || defaults.cfg || 5))
  const seed = Number(args.seed) > 0 ? Math.trunc(Number(args.seed)) : Math.floor(Math.random() * 2 ** 31)

  let graph
  try {
    graph = substitute(workflow.graph ?? {}, {
      prompt,
      negative: String(args.negative ?? ""),
      width,
      height,
      steps,
      cfg,
      seed,
    })
  } catch (error) {
    return JSON.stringify({ ok: false, error: error.message })
  }

  const started = Date.now()
  let submitted
  try {
    submitted = await jsonPost(`${url}/prompt`, { prompt: graph, client_id: `framework-${started}` })
  } catch (error) {
    return JSON.stringify({ ok: false, error: unavailable(error) })
  }

  if (submitted.node_errors && Object.keys(submitted.node_errors).length) {
    return JSON.stringify({ ok: false, error: "ComfyUI rejected the graph", node_errors: submitted.node_errors }, null, 2)
  }
  const promptId = submitted.prompt_id
  if (!promptId) return JSON.stringify({ ok: false, error: "ComfyUI returned no prompt_id", raw: submitted })

  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    let history
    try {
      history = await jsonGet(`${url}/history/${promptId}`)
    } catch {
      continue
    }
    const entry = history[promptId]
    if (!entry) continue
    if (entry.status?.status_str === "error") {
      return JSON.stringify({ ok: false, error: "generation failed", detail: entry.status }, null, 2)
    }
    const images = []
    for (const output of Object.values(entry.outputs ?? {})) {
      for (const image of output.images ?? []) images.push(image)
    }
    if (!images.length) continue

    const outDir = path.resolve(ROOT, args.out ?? path.join("production", "images"))
    fs.mkdirSync(outDir, { recursive: true })
    const { dir } = config()
    const saved = []

    for (const image of images) {
      const source = dir ? path.join(dir, "ComfyUI", "output", image.subfolder ?? "", image.filename) : null
      const target = path.join(outDir, image.filename)
      if (source && fs.existsSync(source)) {
        fs.copyFileSync(source, target)
      } else {
        const view = await fetch(
          `${url}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder ?? "")}&type=${image.type ?? "output"}`,
          { signal: AbortSignal.timeout(60000) },
        )
        if (!view.ok) continue
        fs.writeFileSync(target, Buffer.from(await view.arrayBuffer()))
      }
      saved.push(path.relative(ROOT, target).split(path.sep).join("/"))
    }

    return JSON.stringify(
      {
        ok: true,
        workflow: workflow.name ?? args.workflow,
        files: saved,
        seed,
        width,
        height,
        steps,
        cfg,
        prompt_id: promptId,
        seconds: Math.round((Date.now() - started) / 1000),
        note: "open the file to judge the result; if it is wrong, change one thing and generate again",
      },
      null,
      2,
    )
  }

  return JSON.stringify({ ok: false, error: `timed out after ${Math.round(TIMEOUT_MS / 1000)}s`, prompt_id: promptId })
}

async function history(args = {}) {
  const { url } = config()
  const limit = Math.max(1, Math.min(20, Number(args.limit) || 5))
  try {
    const data = await jsonGet(`${url}/history?max_items=${limit}`)
    const rows = Object.entries(data).map(([id, entry]) => ({
      prompt_id: id,
      status: entry.status?.status_str,
      images: Object.values(entry.outputs ?? {})
        .flatMap((output) => output.images ?? [])
        .map((image) => image.filename),
    }))
    return JSON.stringify({ ok: true, items: rows }, null, 2)
  } catch (error) {
    return JSON.stringify({ ok: false, error: unavailable(error) })
  }
}

// ── MCP plumbing ─────────────────────────────────────────────────────────────

const TOOLS = [
  { name: "status", description: "Check whether ComfyUI is running, and its queue and VRAM.", inputSchema: { type: "object", properties: {} } },
  { name: "models", description: "List the checkpoints, text encoders and VAEs ComfyUI can load.", inputSchema: { type: "object", properties: {} } },
  {
    name: "workflows",
    description: "List the built-in workflow and every workflow saved in production/workflows, with the models and defaults each needs.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "validate-workflow",
    description:
      "Check a workflow against the live ComfyUI before running it: node classes exist, required inputs present, enum values valid. Run this after building or editing a workflow.",
    inputSchema: {
      type: "object",
      properties: { workflow: { type: "string", description: "Name in production/workflows or a path; default flux2-klein" } },
    },
  },
  {
    name: "generate",
    description:
      "Generate an image from a text prompt on the local GPU. Waits for the result and returns the saved file path. Costs no money; costs GPU time and tokens when you look at the result.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Positive prompt, English" },
        negative: { type: "string", description: "Negative prompt, usually empty for Flux" },
        workflow: { type: "string", description: "Workflow name or path; default flux2-klein" },
        width: { type: "number" },
        height: { type: "number" },
        steps: { type: "number" },
        cfg: { type: "number" },
        seed: { type: "number", description: "0 or omitted means random" },
        out: { type: "string", description: "Output folder, default production/images" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "history",
    description: "Recent generations known to ComfyUI.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
]

async function callTool(name, args) {
  if (name === "status") return status()
  if (name === "models") return models()
  if (name === "workflows") return workflows()
  if (name === "validate-workflow") return validateWorkflow(args)
  if (name === "generate") return generate(args)
  if (name === "history") return history(args)
  throw new Error(`unknown tool: ${name}`)
}

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`)
}

function replyError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`)
}

const rl = readline.createInterface({ input: process.stdin })

rl.on("line", async (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let message
  try {
    message = JSON.parse(trimmed)
  } catch {
    return
  }

  const { id, method, params } = message
  if (id === undefined) return

  try {
    if (method === "initialize") {
      reply(id, {
        protocolVersion: params?.protocolVersion ?? "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "comfyui", version: "1.1.0" },
      })
      return
    }
    if (method === "tools/list") {
      reply(id, { tools: TOOLS })
      return
    }
    if (method === "tools/call") {
      const text = await callTool(params?.name, params?.arguments)
      reply(id, { content: [{ type: "text", text }] })
      return
    }
    replyError(id, -32601, `method not found: ${method}`)
  } catch (error) {
    replyError(id, -32000, error.message ?? String(error))
  }
})
