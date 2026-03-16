#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const API_BASE = 'https://api.kie.ai';
const API_KEY = process.env.KIE_API_KEY;
const PROJECT_ROOT = process.env.KIE_PROJECT_ROOT || process.cwd();
const RAW_DIR = join(PROJECT_ROOT, 'src/assets/raw');

if (!API_KEY) {
  console.error('KIE_API_KEY environment variable is required');
  process.exit(1);
}

if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });

// ─── Model Registry ───
// Each model defines: endpoint, how to build the request body, and valid options.
// Models using the generic createTask endpoint go through /api/v1/jobs/createTask.
// GPT-4o and Flux Kontext have dedicated endpoints.

const MODEL_REGISTRY = {
  // ── GPT-4o (dedicated endpoint) ──
  'gpt4o': {
    name: 'GPT-4o Image',
    endpoint: '/api/v1/gpt4o-image/generate',
    type: 'dedicated',
    aspectRatios: ['1:1', '3:2', '2:3'],
    options: {
      isEnhance: { type: 'boolean', default: false, description: 'Enable prompt enhancement' },
      enableFallback: { type: 'boolean', default: false, description: 'Fallback to backup model if unavailable' },
      fallbackModel: { type: 'string', enum: ['GPT_IMAGE_1', 'FLUX_MAX'], default: 'FLUX_MAX' },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, size: aspectRatio, ...opts };
      if (imageUrls?.length) body.filesUrl = imageUrls;
      return body;
    },
  },

  // ── Flux Kontext (dedicated endpoint) ──
  'flux-kontext-pro': {
    name: 'Flux Kontext Pro',
    endpoint: '/api/v1/flux/kontext/generate',
    type: 'dedicated',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    options: {
      outputFormat: { type: 'string', enum: ['jpeg', 'png'], default: 'png' },
      promptUpsampling: { type: 'boolean', default: false, description: 'Upsample prompt for more detail' },
      safetyTolerance: { type: 'number', min: 0, max: 6, default: 2 },
      enableTranslation: { type: 'boolean', default: true, description: 'Auto-translate non-English prompts' },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'flux-kontext-pro', aspectRatio, outputFormat: 'png', ...opts };
      if (imageUrls?.length) body.inputImage = imageUrls[0];
      return body;
    },
  },
  'flux-kontext-max': {
    name: 'Flux Kontext Max',
    endpoint: '/api/v1/flux/kontext/generate',
    type: 'dedicated',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    options: {
      outputFormat: { type: 'string', enum: ['jpeg', 'png'], default: 'png' },
      promptUpsampling: { type: 'boolean', default: false },
      safetyTolerance: { type: 'number', min: 0, max: 6, default: 2 },
      enableTranslation: { type: 'boolean', default: true },
    },
    buildBody(prompt, aspectRatio, imageUrls, opts) {
      const body = { prompt, model: 'flux-kontext-max', aspectRatio, outputFormat: 'png', ...opts };
      if (imageUrls?.length) body.inputImage = imageUrls[0];
      return body;
    },
  },

  // ── Market models (generic createTask endpoint) ──
  // GPT Image 1.5
  'gpt-image/1.5-text-to-image': {
    name: 'GPT Image 1.5',
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2'],
    options: {
      quality: { type: 'string', enum: ['medium', 'high'], default: 'medium' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, aspect_ratio: aspectRatio, quality: opts.quality || 'medium' };
    },
  },
  'gpt-image/1.5-image-to-image': {
    name: 'GPT Image 1.5 (img2img)',
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2'],
    requiresImage: true,
    options: {
      quality: { type: 'string', enum: ['medium', 'high'], default: 'medium' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, quality: opts.quality || 'medium' };
    },
  },

  // Grok Imagine
  'grok-imagine/text-to-image': {
    name: 'Grok Imagine',
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '16:9', '9:16'],
    buildInput(prompt, aspectRatio) {
      return { prompt, aspect_ratio: aspectRatio };
    },
  },
  'grok-imagine/image-to-image': {
    name: 'Grok Imagine (img2img)',
    type: 'market',
    aspectRatios: [],
    requiresImage: true,
    buildInput(prompt, _ar, imageUrls) {
      return { prompt, image_urls: imageUrls };
    },
  },

  // Flux 2
  'flux-2/pro-text-to-image': {
    name: 'Flux 2 Pro',
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },
  'flux-2/pro-image-to-image': {
    name: 'Flux 2 Pro (img2img)',
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto'],
    requiresImage: true,
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },
  'flux-2/flex-text-to-image': {
    name: 'Flux 2 Flex',
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },
  'flux-2/flex-image-to-image': {
    name: 'Flux 2 Flex (img2img)',
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', 'auto'],
    requiresImage: true,
    options: {
      resolution: { type: 'string', enum: ['1K', '2K'], default: '1K' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, input_urls: imageUrls, aspect_ratio: aspectRatio, resolution: opts.resolution || '1K' };
    },
  },

  // Seedream (ByteDance)
  'bytedance/seedream': {
    name: 'Seedream 3.0',
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      guidance_scale: { type: 'number', min: 1, max: 10, default: 2.5 },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'bytedance/seedream-v4-text-to-image': {
    name: 'Seedream 4.0',
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_3_2', 'portrait_16_9', 'landscape_4_3', 'landscape_3_2', 'landscape_16_9', 'landscape_21_9'],
    options: {
      image_resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      max_images: { type: 'number', min: 1, max: 6, default: 1 },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'bytedance/seedream-v4-edit': {
    name: 'Seedream 4.0 Edit',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_3_2', 'portrait_16_9', 'landscape_4_3', 'landscape_3_2', 'landscape_16_9', 'landscape_21_9'],
    options: {
      image_resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      max_images: { type: 'number', min: 1, max: 6, default: 1 },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, image_size: aspectRatio, ...opts };
    },
  },
  'seedream/4.5-text-to-image': {
    name: 'Seedream 4.5',
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    options: {
      quality: { type: 'string', enum: ['basic', 'high'], default: 'basic', description: 'basic=2K, high=4K' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, quality: opts.quality || 'basic' };
    },
  },
  'seedream/4.5-edit': {
    name: 'Seedream 4.5 Edit',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'],
    options: {
      quality: { type: 'string', enum: ['basic', 'high'], default: 'basic' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, aspect_ratio: aspectRatio, quality: opts.quality || 'basic' };
    },
  },

  // Google Imagen
  'google/imagen4': {
    name: 'Imagen 4',
    type: 'market',
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    options: {
      negative_prompt: { type: 'string' },
      seed: { type: 'string' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, ...opts };
    },
  },
  'google/imagen4-fast': {
    name: 'Imagen 4 Fast',
    type: 'market',
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    options: {
      negative_prompt: { type: 'string' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, ...opts };
    },
  },
  'google/imagen4-ultra': {
    name: 'Imagen 4 Ultra',
    type: 'market',
    aspectRatios: ['1:1', '16:9', '9:16', '3:4', '4:3'],
    options: {
      negative_prompt: { type: 'string' },
      seed: { type: 'string' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, aspect_ratio: aspectRatio, ...opts };
    },
  },

  // Google Nano Banana (Gemini-based)
  'google/nano-banana': {
    name: 'Nano Banana (Gemini)',
    type: 'market',
    aspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9', 'auto'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, output_format: opts.output_format || 'png' };
    },
  },
  'google/nano-banana-edit': {
    name: 'Nano Banana Edit',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '9:16', '16:9', '3:4', '4:3', '3:2', '2:3', '5:4', '4:5', '21:9', 'auto'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_urls: imageUrls, image_size: aspectRatio, output_format: opts.output_format || 'png' };
    },
  },
  'nano-banana-2': {
    name: 'Nano Banana 2',
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      output_format: { type: 'string', enum: ['png', 'jpg'], default: 'jpg' },
      google_search: { type: 'boolean', default: false },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) input.image_input = imageUrls;
      return input;
    },
  },
  'nano-banana-pro': {
    name: 'Nano Banana Pro',
    type: 'market',
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9', 'auto'],
    options: {
      resolution: { type: 'string', enum: ['1K', '2K', '4K'], default: '1K' },
      output_format: { type: 'string', enum: ['png', 'jpg'], default: 'png' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      const input = { prompt, aspect_ratio: aspectRatio, ...opts };
      if (imageUrls?.length) input.image_input = imageUrls;
      return input;
    },
  },

  // Z-Image
  'z-image': {
    name: 'Z-Image',
    type: 'market',
    aspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
    buildInput(prompt, aspectRatio) {
      return { prompt, aspect_ratio: aspectRatio };
    },
  },

  // Ideogram
  'ideogram/character': {
    name: 'Ideogram Character',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'REALISTIC', 'FICTION'], default: 'AUTO' },
      expand_prompt: { type: 'boolean', default: true, description: 'MagicPrompt enhancement' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, reference_image_urls: imageUrls, image_size: aspectRatio, ...opts };
    },
  },
  'ideogram/character-edit': {
    name: 'Ideogram Character Edit',
    type: 'market',
    requiresImage: true,
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'REALISTIC', 'FICTION'], default: 'AUTO' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      // Expects image_url, mask_url, reference_image_urls passed via model_options
      return { prompt, reference_image_urls: imageUrls, ...opts };
    },
  },
  'ideogram/v3-reframe': {
    name: 'Ideogram v3 Reframe (outpaint)',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      rendering_speed: { type: 'string', enum: ['TURBO', 'BALANCED', 'QUALITY'], default: 'BALANCED' },
      style: { type: 'string', enum: ['AUTO', 'GENERAL', 'REALISTIC', 'DESIGN'], default: 'AUTO' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'], default: '1' },
    },
    buildInput(_prompt, aspectRatio, imageUrls, opts) {
      return { image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },

  // Qwen
  'qwen/text-to-image': {
    name: 'Qwen Text-to-Image',
    type: 'market',
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      num_inference_steps: { type: 'number', min: 2, max: 250, default: 30 },
      guidance_scale: { type: 'number', min: 0, max: 20, default: 2.5 },
      negative_prompt: { type: 'string' },
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      seed: { type: 'number' },
      acceleration: { type: 'string', enum: ['none', 'regular', 'high'], default: 'none' },
    },
    buildInput(prompt, aspectRatio, _imgs, opts) {
      return { prompt, image_size: aspectRatio, ...opts };
    },
  },
  'qwen/image-to-image': {
    name: 'Qwen Image-to-Image',
    type: 'market',
    requiresImage: true,
    options: {
      strength: { type: 'number', min: 0, max: 1, default: 0.8 },
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      negative_prompt: { type: 'string' },
      seed: { type: 'number' },
      acceleration: { type: 'string', enum: ['none', 'regular', 'high'], default: 'none' },
    },
    buildInput(prompt, _ar, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], ...opts };
    },
  },
  'qwen/image-edit': {
    name: 'Qwen Image Edit',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['square', 'square_hd', 'portrait_4_3', 'portrait_16_9', 'landscape_4_3', 'landscape_16_9'],
    options: {
      num_inference_steps: { type: 'number', min: 2, max: 49, default: 25 },
      guidance_scale: { type: 'number', min: 0, max: 20, default: 4 },
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      negative_prompt: { type: 'string' },
      num_images: { type: 'string', enum: ['1', '2', '3', '4'] },
      seed: { type: 'number' },
      acceleration: { type: 'string', enum: ['none', 'regular', 'high'], default: 'none' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },
  'qwen2/image-edit': {
    name: 'Qwen2 Image Edit',
    type: 'market',
    requiresImage: true,
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'],
    options: {
      output_format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
      seed: { type: 'number' },
    },
    buildInput(prompt, aspectRatio, imageUrls, opts) {
      return { prompt, image_url: imageUrls?.[0], image_size: aspectRatio, ...opts };
    },
  },

  // Recraft (utility)
  'recraft/crisp-upscale': {
    name: 'Recraft Upscale',
    type: 'market',
    requiresImage: true,
    buildInput(_prompt, _ar, imageUrls) {
      return { image: imageUrls?.[0] };
    },
  },
  'recraft/remove-background': {
    name: 'Recraft Remove Background',
    type: 'market',
    requiresImage: true,
    buildInput(_prompt, _ar, imageUrls) {
      return { image: imageUrls?.[0] };
    },
  },
};

// ─── Helpers ───

const taskHistory = [];

async function kieRequest(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const json = await res.json();
  if (res.status !== 200) {
    throw new Error(`kie.ai API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function pollTask(taskId, maxWaitMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const result = await kieRequest('GET', `/api/v1/jobs/recordInfo?taskId=${taskId}`);
    const data = result.data || result;
    if (data.state === 'success') return data;
    if (data.state === 'fail') throw new Error(`Task failed: ${data.failMsg || 'Unknown'} (code: ${data.failCode})`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Task ${taskId} timed out after ${maxWaitMs / 1000}s`);
}

function extractResultUrls(result) {
  let urls = [];
  if (result.resultJson) {
    try {
      const p = typeof result.resultJson === 'string' ? JSON.parse(result.resultJson) : result.resultJson;
      urls = p.resultUrls || p.result_urls || [];
      if (p.resultObject?.url) urls.push(p.resultObject.url);
      if (p.url) urls.push(p.url);
      // Flux kontext returns originImageUrl/resultImageUrl
      if (p.resultImageUrl) urls.push(p.resultImageUrl);
      if (p.info?.resultImageUrl) urls.push(p.info.resultImageUrl);
    } catch {
      if (typeof result.resultJson === 'string' && result.resultJson.startsWith('http')) {
        urls = [result.resultJson];
      }
    }
  }
  if (result.resultUrls) urls = [...urls, ...result.resultUrls];
  if (urls.length === 0 && result.url) urls = [result.url];
  // Deduplicate
  return [...new Set(urls)];
}

async function downloadToFile(url, destPath) {
  let downloadUrl = url;
  try {
    const dlResult = await kieRequest('POST', '/api/v1/common/download-url', { url });
    if (dlResult.data) downloadUrl = dlResult.data;
  } catch { /* direct download fallback */ }

  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  writeFileSync(destPath, Buffer.from(await response.arrayBuffer()));
  return destPath;
}

// ─── MCP Server ───

const server = new Server({ name: 'kie-art', version: '2.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description: `Generate an image using kie.ai. Supports 30+ models including GPT-4o, Flux Kontext, Flux 2, Seedream, Imagen 4, Nano Banana, Grok, Ideogram, Qwen, and more. Polls until complete and downloads to src/assets/raw/.`,
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text prompt describing the image to generate' },
          model: {
            type: 'string',
            description: 'Model ID. Use list_models to see all available models and their options.',
            default: 'gpt4o',
          },
          aspect_ratio: {
            type: 'string',
            description: 'Aspect ratio (valid values depend on model — see list_models). Common: 1:1, 2:3, 3:2, 16:9, 9:16, 4:3, 3:4',
            default: '2:3',
          },
          image_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'Reference/input image URLs for image-to-image models',
          },
          filename: {
            type: 'string',
            description: 'Output filename (saved to src/assets/raw/). Auto-generated if omitted.',
          },
          model_options: {
            type: 'object',
            description: 'Model-specific options (quality, resolution, seed, negative_prompt, etc). Use list_models to see available options per model.',
          },
        },
        required: ['prompt'],
      },
    },
    {
      name: 'list_models',
      description: 'List all available kie.ai models with their aspect ratios and model-specific options',
      inputSchema: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Filter models by name (e.g. "flux", "gpt", "seedream")' },
          verbose: { type: 'boolean', default: false, description: 'Show full option details for each model' },
        },
      },
    },
    {
      name: 'check_task',
      description: 'Check the status of a kie.ai generation task by taskId',
      inputSchema: {
        type: 'object',
        properties: { task_id: { type: 'string' } },
        required: ['task_id'],
      },
    },
    {
      name: 'list_tasks',
      description: 'List recent image generation tasks from this session',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'number', default: 10 } },
      },
    },
    {
      name: 'check_credits',
      description: 'Check remaining kie.ai account credits',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'download_result',
      description: 'Download a completed task result to src/assets/raw/',
      inputSchema: {
        type: 'object',
        properties: {
          task_id: { type: 'string' },
          filename: { type: 'string' },
        },
        required: ['task_id'],
      },
    },
    {
      name: 'list_raw_assets',
      description: 'List all files in src/assets/raw/ waiting to be processed',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_image': {
        const { prompt, model: modelId = 'gpt4o', aspect_ratio = '2:3', image_urls, filename, model_options = {} } = args;

        const modelDef = MODEL_REGISTRY[modelId];
        if (!modelDef) {
          const available = Object.keys(MODEL_REGISTRY).join(', ');
          return { content: [{ type: 'text', text: `Unknown model "${modelId}". Available models:\n${available}` }] };
        }

        if (modelDef.requiresImage && (!image_urls || image_urls.length === 0)) {
          return { content: [{ type: 'text', text: `Model "${modelId}" requires image_urls (image-to-image model).` }] };
        }

        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const safeModelName = modelId.replace(/\//g, '-');
        const outFilename = filename || `${safeModelName}-${ts}.png`;
        const outPath = join(RAW_DIR, outFilename);

        let taskId;

        if (modelDef.type === 'dedicated') {
          // GPT-4o and Flux Kontext have dedicated endpoints
          const body = modelDef.buildBody(prompt, aspect_ratio, image_urls, model_options);
          body.callBackUrl = undefined; // We poll instead
          const result = await kieRequest('POST', modelDef.endpoint, body);
          taskId = result.data?.taskId;
        } else {
          // Market models use createTask
          const input = modelDef.buildInput(prompt, aspect_ratio, image_urls, model_options);
          const body = { model: modelId, input };
          const result = await kieRequest('POST', '/api/v1/jobs/createTask', body);
          taskId = result.data?.taskId;
        }

        if (!taskId) {
          return { content: [{ type: 'text', text: 'Failed to create task — no taskId returned' }] };
        }

        const taskEntry = {
          taskId,
          model: modelId,
          prompt: prompt?.slice(0, 100) + ((prompt?.length || 0) > 100 ? '...' : ''),
          filename: outFilename,
          status: 'polling',
          createdAt: new Date().toISOString(),
        };
        taskHistory.push(taskEntry);

        // Poll until done
        const result = await pollTask(taskId);
        const resultUrls = extractResultUrls(result);

        if (resultUrls.length === 0) {
          taskEntry.status = 'no_urls';
          return {
            content: [{
              type: 'text',
              text: `Task ${taskId} completed but no result URLs found.\nRaw: ${JSON.stringify(result, null, 2)}`,
            }],
          };
        }

        // Download all results
        const downloadedFiles = [];
        for (let i = 0; i < resultUrls.length; i++) {
          const path = i === 0 ? outPath : join(RAW_DIR, outFilename.replace(/\.png$/, `-${i + 1}.png`));
          await downloadToFile(resultUrls[i], path);
          downloadedFiles.push(path);
        }

        taskEntry.status = 'downloaded';
        taskEntry.resultUrls = resultUrls;

        return {
          content: [{
            type: 'text',
            text: [
              `✅ Image generated successfully!`,
              `Model: ${modelDef.name} (${modelId})`,
              `Task ID: ${taskId}`,
              `Cost time: ${result.costTime ? result.costTime / 1000 + 's' : 'N/A'}`,
              ``,
              `Downloaded ${downloadedFiles.length} file(s):`,
              ...downloadedFiles.map((f) => `  → ${f}`),
              ``,
              `Use the Read tool to preview the image, then \`/art-asset process\` to crop and integrate.`,
            ].join('\n'),
          }],
        };
      }

      case 'list_models': {
        const { filter, verbose } = args;
        let entries = Object.entries(MODEL_REGISTRY);
        if (filter) {
          const f = filter.toLowerCase();
          entries = entries.filter(([id, m]) => id.toLowerCase().includes(f) || m.name.toLowerCase().includes(f));
        }

        if (entries.length === 0) {
          return { content: [{ type: 'text', text: `No models matching "${filter}". Try: gpt, flux, seedream, imagen, nano, grok, ideogram, qwen, recraft, z-image` }] };
        }

        const lines = entries.map(([id, m]) => {
          let line = `**${m.name}** — \`${id}\``;
          if (m.requiresImage) line += ' [requires image]';
          if (m.aspectRatios?.length) line += `\n  Aspect ratios: ${m.aspectRatios.join(', ')}`;
          if (verbose && m.options) {
            const optLines = Object.entries(m.options).map(([k, v]) => {
              let desc = `    ${k}`;
              if (v.type) desc += ` (${v.type})`;
              if (v.enum) desc += ` — values: ${v.enum.join(', ')}`;
              if (v.default !== undefined) desc += ` — default: ${v.default}`;
              if (v.min !== undefined) desc += ` — range: ${v.min}-${v.max}`;
              if (v.description) desc += ` — ${v.description}`;
              return desc;
            });
            line += '\n  Options:\n' + optLines.join('\n');
          } else if (m.options) {
            line += `\n  Options: ${Object.keys(m.options).join(', ')}`;
          }
          return line;
        });

        return { content: [{ type: 'text', text: lines.join('\n\n') }] };
      }

      case 'check_task': {
        const result = await kieRequest('GET', `/api/v1/jobs/recordInfo?taskId=${args.task_id}`);
        const data = result.data || result;
        return {
          content: [{
            type: 'text',
            text: [
              `Task: ${data.taskId}`,
              `State: ${data.state}`,
              `Progress: ${data.progress || 0}%`,
              `Model: ${data.model || 'N/A'}`,
              `Cost time: ${data.costTime ? data.costTime / 1000 + 's' : 'N/A'}`,
              data.failMsg ? `Error: ${data.failMsg}` : '',
              data.resultJson ? `Result: ${JSON.stringify(data.resultJson)}` : '',
            ].filter(Boolean).join('\n'),
          }],
        };
      }

      case 'list_tasks': {
        const limit = args.limit || 10;
        const recent = taskHistory.slice(-limit);
        if (recent.length === 0) return { content: [{ type: 'text', text: 'No tasks this session.' }] };
        const lines = recent.map((t, i) =>
          `${i + 1}. [${t.status}] ${t.model} — ${t.prompt}\n   ID: ${t.taskId}\n   File: ${t.filename}`
        );
        return { content: [{ type: 'text', text: lines.join('\n\n') }] };
      }

      case 'check_credits': {
        const result = await kieRequest('GET', '/api/v1/chat/credit');
        return { content: [{ type: 'text', text: `Account credits: ${JSON.stringify(result.data ?? result)}` }] };
      }

      case 'download_result': {
        const result = await kieRequest('GET', `/api/v1/jobs/recordInfo?taskId=${args.task_id}`);
        const data = result.data || result;
        if (data.state !== 'success') {
          return { content: [{ type: 'text', text: `Task is "${data.state}", not yet downloadable.` }] };
        }
        const urls = extractResultUrls(data);
        if (urls.length === 0) {
          return { content: [{ type: 'text', text: `No result URLs for task ${args.task_id}` }] };
        }
        const outName = args.filename || `download-${args.task_id.slice(0, 8)}.png`;
        const outPath = join(RAW_DIR, outName);
        await downloadToFile(urls[0], outPath);
        return { content: [{ type: 'text', text: `Downloaded to: ${outPath}` }] };
      }

      case 'list_raw_assets': {
        try {
          const files = readdirSync(RAW_DIR).filter((f) => !f.startsWith('.'));
          if (files.length === 0) return { content: [{ type: 'text', text: 'No files in src/assets/raw/' }] };
          const details = files.map((f) => {
            const s = statSync(join(RAW_DIR, f));
            return `  ${f} (${(s.size / 1024).toFixed(0)}KB, ${s.mtime.toISOString().slice(0, 19)})`;
          });
          return { content: [{ type: 'text', text: `Files in src/assets/raw/:\n${details.join('\n')}` }] };
        } catch {
          return { content: [{ type: 'text', text: 'Raw directory is empty or missing.' }] };
        }
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
