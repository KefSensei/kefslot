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

### Model Selection Guide:
- **gpt4o** (default) — Best for stylized game art, characters, fantasy scenes. Supports reference images.
- **flux-kontext-pro** — Good for consistent style, text rendering. Faster.
- **flux-kontext-max** — Highest quality Flux model. Slower but better details.

### Aspect Ratio Guide:
- **2:3** — Portrait source images (for backgrounds that need landscape + portrait crops)
- **9:16** — Tall portrait (alternative to 2:3)
- **1:1** — Symbols, characters, icons
- **3:2** — Landscape-only assets
- **16:9** — Wide landscape scenes

### Prompt Crafting Rules:
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
| Blocker overlay | 1:1 | Output 256x256. Semi-transparent. |
| Power-up effect | 1:1 | Output 256x256. Transparent bg. Glowing/magical. |

### Roxy Character Reference
Roxy is a beautiful halfling adventurer — small in stature (~3.5 feet tall), cheerful confident expression, curly auburn hair with wildflowers, bright green eyes, rosy freckled cheeks, pointed ears. Wears a fitted emerald green vest over cream blouse, brown leather belt with pouches, dark brown boots, flowing teal cape with golden gem brooch. Magical sparkles trail from her fingertips.

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

# For symbols — resize + ensure RGBA
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

## Current Game Assets
Read `src/config/SymbolConfig.ts` for the full symbol list and `src/config/LevelConfig.ts` for worlds/themes.

$ARGUMENTS
