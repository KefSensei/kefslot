---
name: art-asset
description: Generate AI art assets for the game using kie.ai API, process raw images, or check asset status. Use when the user asks to create art, generate images, design sprites, process images, or integrate visual assets.
argument-hint: [generate <description> | process | status | credits]
---

# KefSlot Art Asset Pipeline

You manage the art asset pipeline for Roxy's Magic Reels. There are four modes:

## Mode 1: Generate Image (`/art-asset generate <description>`)

Generate an image directly using the kie.ai MCP tools. This is the PRIMARY workflow.

### Steps:
1. **Understand the request** — what asset type (background, symbol, character, UI, blocker, effect)?
2. **Craft an optimized prompt** using the style rules below
3. **Call `mcp__kie-art__generate_image`** with the crafted prompt, appropriate model and aspect ratio
4. **Wait for result** — the tool polls automatically and downloads to `src/assets/raw/`
5. **Show the downloaded file path** so the user can preview it (use Read tool to display the image)
6. **If user approves**, run `/art-asset process` to crop/resize and integrate into the game
7. **If user wants another option**, generate again with a tweaked prompt

---

### Model Selection Guide

#### Image Models (available via `mcp__kie-art__generate_image`)

| Model ID | Best For | Notes |
|----------|----------|-------|
| `gpt4o` | Characters, fantasy scenes, stylized game art | Best overall quality; supports img2img |
| `gpt-image/1.5-text-to-image` | **UI panels, sprites, anything needing transparent bg** | Natively outputs RGBA alpha=0 outside subject when asked |
| `gpt-image/1.5-image-to-image` | Edit/repaint existing images | Needs image_urls (public URL) |
| `google/nano-banana` | Fast drafts, concept exploration | Google Gemini Flash-based; very fast |
| `google/nano-banana-edit` | Quick edits with natural language | Needs image_urls |
| `nano-banana-2` | Fast gen with Google Search grounding | Good for realistic refs |
| `nano-banana-pro` | Higher quality Nano Banana | Slower than nano-banana-2 |
| `google/imagen4` | Photorealistic images | High quality, Google model |
| `google/imagen4-fast` | Photorealistic, faster | Good for quick iterations |
| `google/imagen4-ultra` | Highest quality photorealism | Slow, use for final assets |
| `flux-kontext-pro` | Style consistency, text rendering | Faster than max |
| `flux-kontext-max` | Highest quality Flux output | Best for detailed final art |
| `flux-2/pro-text-to-image` | General purpose, good quality | Reliable workhorse |
| `flux-2/pro-image-to-image` | Edit existing images | Needs image_urls |
| `flux-2/flex-text-to-image` | Flexible Flux generation | Alternative to pro |
| `seedream/4.5-text-to-image` | Anime/stylized, game art | ByteDance; fast |
| `seedream/4.5-edit` | Edit with Seedream style | Needs image_urls |
| `bytedance/seedream-v4-text-to-image` | Previous Seedream gen | Solid fallback |
| `grok-imagine/text-to-image` | Creative/unusual compositions | xAI Grok model |
| `grok-imagine/image-to-image` | Grok-style edits | Needs image_urls |
| `qwen/text-to-image` | Asian art styles, game art | Alibaba model |
| `qwen/image-edit` | Masked image editing | Needs image_urls |
| `qwen2/image-edit` | Improved Qwen editing | Needs image_urls |
| `ideogram/character` | Character sheets with consistent style | Needs reference image |
| `ideogram/character-edit` | Edit Ideogram character | Needs image_urls |
| `ideogram/v3-reframe` | Outpaint / expand image canvas | Needs image_urls |
| `z-image` | Experimental/alternative style | Use for variety |
| `recraft/crisp-upscale` | Upscale existing images | Needs image_urls; good for final polish |
| `recraft/remove-background` | Remove bg from existing image | Needs **public** image_urls — NOT local paths |

#### ⚠️ image_urls vs image_path
All img2img / edit models require **`image_urls`** (publicly accessible URLs) — local file paths do NOT work. If you need to edit a local file, either:
- Generate a fresh version using a text-to-image model instead
- Host the file temporarily (complex) — not recommended

---

### ⚠️ Transparent Background Rule
When the asset needs a transparent background (UI panels, sprites, characters, overlays — anything that isn't a full-scene background):
1. **Use `gpt-image/1.5-text-to-image`** — it reliably outputs RGBA with alpha=0 outside the subject.
2. **Include these exact phrases in the prompt**:
   - `"PURE TRANSPARENT background"`
   - `"fully transparent alpha channel outside the [subject]"`
   - `"no background, no backdrop, no rectangle behind it"`
3. **Do NOT post-process** — the alpha channel is already correct.
4. **Verify** after download:
   ```python
   python3 -c "from PIL import Image; img=Image.open('path.png').convert('RGBA'); px=img.load(); w,h=img.size; print('corners alpha:', px[0,0][3], px[w-1,0][3], px[0,h-1][3], px[w-1,h-1][3])"
   ```
   Corners should be alpha=0.

---

### Aspect Ratio Guide
- **2:3** — Portrait source images (for backgrounds needing landscape + portrait crops)
- **9:16** — Tall portrait (alternative to 2:3)
- **1:1** — Symbols, characters, icons, UI panels
- **3:2** — Landscape-only assets
- **16:9** — Wide landscape scenes

### Prompt Crafting Rules
1. **Always include**: "Digital painting, fantasy mobile game aesthetic"
2. **Color palette**: Emerald green, teal (#1abc9c), warm amber/gold, sunset orange, cream whites, rich forest browns
3. **Lighting**: Warm golden-hour from upper-left
4. **Mood**: Adventurous, magical, whimsical, joyful
5. **For backgrounds**: Leave bottom area dark/clear for UI button overlays
6. **For symbols**: "Centered subject on transparent background, bold shapes, high contrast, minimal fine detail, must read clearly at 80x80px"
7. **For characters**: "Whimsical approachable style, not realistic"
8. **Be specific** — describe exact colors, poses, composition, what NOT to include

### Asset Size Reference
| Asset Type | Aspect Ratio | Notes |
|-----------|-------------|-------|
| Menu/Game/Map background | 2:3 | Source image, cropped to 800x700 landscape + 500x900 portrait |
| Grid symbol | 1:1 | Output 256x256, scaled to 80x80 in-game. Transparent bg. |
| Character (Roxy) | 1:1 | Output 512x512. Transparent bg. Multiple poses. |
| UI button | 3:2 | Output 512x128. Transparent bg. |
| UI panel (scroll, victory, etc.) | 2:3 or 1:1 | Output at display size. Transparent bg. |
| Blocker overlay | 1:1 | Output 256x256. Semi-transparent. |
| Power-up effect | 1:1 | Output 256x256. Transparent bg. Glowing/magical. |

### Roxy Character Reference
Roxy is a beautiful halfling adventurer — small in stature (~3.5 feet tall), cheerful confident expression, curly auburn hair with wildflowers, bright green eyes, rosy freckled cheeks, pointed ears. Wears a fitted emerald green vest over cream blouse, brown leather belt with pouches, dark brown boots, flowing teal cape with golden gem brooch. Magical sparkles trail from her fingertips.

---

## 🎬 Video & Audio Generation (kie.ai — MCP upgrade needed)

The current MCP (`mcp__kie-art__*`) only covers image generation. The full **felores/kie-ai-mcp-server** adds 11 more tools. To unlock them, upgrade the MCP in Claude settings:

```json
{
  "mcpServers": {
    "kie-art": {
      "command": "npx",
      "args": ["-y", "@felores/kie-ai-mcp-server"],
      "env": {
        "KIE_AI_API_KEY": "<your-key>",
        "KIE_AI_TOOL_CATEGORIES": "image,video,audio"
      }
    }
  }
}
```

### Video Models (after upgrade)
| Tool | Model | Best For |
|------|-------|----------|
| `veo3_generate_video` | Google Veo 3 / Veo 3.1 | Cinematic video + sync audio, 1080p. Best quality. |
| `sora_video` | OpenAI Sora 2 | Realistic video generation |
| `bytedance_seedance_video` | Seedance 2.0 | Fast video, good for game trailers |
| `wan_video` | Alibaba Wan 2.5 | Stylized video |
| `hailuo_video` | Hailuo 02 | Alternative video gen |
| `kling_video` | Kling 3.0 | Stable, consistent video |
| `runway_aleph_video` | Runway Aleph | Professional film-quality |
| `midjourney_generate` | Midjourney | High artistic quality images/video |

### Audio Models (after upgrade)
| Tool | Model | Best For |
|------|-------|----------|
| `suno_generate_music` | Suno V5 | Music with vocals up to 8 min. Game BGM/jingles. |
| `elevenlabs_tts` | ElevenLabs | Voice acting, narration, character voices |
| `elevenlabs_ttsfx` | ElevenLabs SFX | Sound effects generation |

### Tool Filtering (v2.0.2+)
Use env vars to control which tools are exposed:
- `KIE_AI_ENABLED_TOOLS` — whitelist specific tools (highest priority)
- `KIE_AI_TOOL_CATEGORIES` — filter by category: `image`, `video`, `audio`
- `KIE_AI_DISABLED_TOOLS` — blacklist specific tools

---

## Mode 2: Generate Prompt Only (`/art-asset prompt <description>`)

If the user specifically asks for just the prompt (to use manually elsewhere), generate a detailed AI image prompt following the rules above. Do NOT call the kie.ai API.

## Mode 3: Process Raw Assets (`/art-asset process`)

When images are in `src/assets/raw/`, process them:

### Processing Pipeline
1. **Discover**: List all files in `src/assets/raw/` (use `mcp__kie-art__list_raw_assets` or ls)
2. **Analyze**: Read each image — check dimensions, content, transparency
3. **Classify**: Determine asset type from filename or content
4. **Process** using Python PIL:
   - **Backgrounds**: Crop to landscape (800x700) + portrait (500x900) versions
   - **Symbols**: Resize to 256x256, ensure RGBA transparency
   - **Characters**: Resize appropriately, ensure transparency
   - **UI elements**: Resize as needed, ensure transparency
5. **Save**: Output to `src/assets/sprites/` with descriptive kebab-case names
6. **Integrate**: Update relevant source files:
   - Add `import` statement for the new asset URL
   - Load texture via `Assets.load<Texture>(url)`
   - Replace placeholder Graphics with Sprite
   - Handle relayout (swap textures for portrait/landscape if dual versions)
7. **Delete**: Remove the processed file from `src/assets/raw/`
8. **Verify**: Run `npx tsc --noEmit` to confirm no type errors

### Integration Patterns

**For backgrounds (menu, game, world map):**
```ts
import bgLandscapeUrl from '@/assets/sprites/my-bg-landscape.png';
import bgPortraitUrl from '@/assets/sprites/my-bg-portrait.png';
// In loadAssets():
const [landscape, portrait] = await Promise.all([
  Assets.load<Texture>(bgLandscapeUrl),
  Assets.load<Texture>(bgPortraitUrl),
]);
// In scene build:
const bg = new Sprite(isPortrait ? portrait : landscape);
bg.width = w; bg.height = h;
// In relayout:
bg.texture = isPortrait ? portrait : landscape;
bg.width = w; bg.height = h;
```

**For symbols (grid cells):**
```ts
import rubyUrl from '@/assets/sprites/symbol-ruby.png';
const rubyTex = await Assets.load<Texture>(rubyUrl);
const sprite = new Sprite(rubyTex);
sprite.width = CELL; sprite.height = CELL;
```

### Python Processing Template
```python
from PIL import Image

img = Image.open('src/assets/raw/FILENAME.png')

# For backgrounds — dual crop
ratio = 800 / img.width
scaled = img.resize((800, int(img.height * ratio)), Image.LANCZOS)
top = scaled.height - 700 - 100
landscape = scaled.crop((0, top, 800, top + 700))
landscape.save('src/assets/sprites/name-landscape.png', optimize=True)

ratio_p = 500 / img.width
scaled_p = img.resize((500, int(img.height * ratio_p)), Image.LANCZOS)
top_p = max(0, scaled_p.height - 900)
portrait = scaled_p.crop((0, top_p, 500, top_p + 900))
portrait.save('src/assets/sprites/name-portrait.png', optimize=True)

# For symbols / UI — resize + ensure RGBA
img = img.convert('RGBA')
img = img.resize((256, 256), Image.LANCZOS)
img.save('src/assets/sprites/symbol-name.png', optimize=True)
```

## Mode 4: Status (`/art-asset status`)

Report current asset status:
- List all files in `src/assets/sprites/` (processed assets in the game)
- List all files in `src/assets/raw/` (unprocessed, waiting)
- Check kie.ai credits with `mcp__kie-art__check_credits`
- Check which game elements still use placeholder Graphics (search for `new Graphics()` in rendering code)
- Summarize: X assets integrated, Y waiting, Z still placeholder

## Mode 5: Credits (`/art-asset credits`)

Check remaining kie.ai API credits using `mcp__kie-art__check_credits`.

## File Naming Convention
- Backgrounds: `{scene}-bg-{orientation}.png` (e.g., `menu-bg-landscape.png`)
- Symbols: `symbol-{id}.png` (e.g., `symbol-ruby.png`) — matches SymbolConfig id
- Character: `roxy-{pose}.png` (e.g., `roxy-idle.png`, `roxy-cheer.png`)
- Blockers: `blocker-{type}.png` (e.g., `blocker-ice.png`)
- UI: `ui-{element}.png` (e.g., `ui-play-button.png`)
- Power-ups: `powerup-{type}.png` (e.g., `powerup-blast.png`)
- Video: `video-{name}.mp4`
- Audio: `audio-{name}.mp3`

## Current Game Assets
Read `src/config/SymbolConfig.ts` for the full symbol list and `src/config/LevelConfig.ts` for worlds/themes.

$ARGUMENTS
