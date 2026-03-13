---
name: art-asset
description: Generate AI art prompts for game assets OR process raw images from src/assets/raw/ into the game. Use when the user asks to create art, design sprites, process images, or integrate visual assets.
argument-hint: [prompt | process | status]
---

# KefSlot Art Asset Pipeline

You manage the art asset pipeline for Roxy's Magic Reels. There are two modes:

## Mode 1: Generate Prompts (`/art-asset prompt <description>`)

Generate a precise AI image generation prompt for the requested asset. Every prompt MUST include:

### Required Prompt Structure
1. **Asset name and type** (background, symbol, character, UI element, blocker, effect)
2. **Output format**: PNG dimensions, transparency requirement
3. **Style anchor**: "Digital painting, fantasy mobile game aesthetic" — consistent across ALL assets
4. **Color palette**: Deep indigo/purple (#1a0a2e), gold (#f1c40f), purple (#9b59b6), teal (#1abc9c)
5. **Specific scene/subject description** with mood and lighting
6. **Constraints**: What must be left clear for UI overlays, what NOT to include

### Asset Size Reference
| Asset Type | Dimensions | Notes |
|-----------|-----------|-------|
| Menu background | 900x1600px | Portrait source, cropped to 800x700 landscape + 500x900 portrait |
| Game background | 900x1600px | Same dual-crop approach |
| World map | 900x1600px | Same dual-crop approach |
| Grid symbol | 256x256px | Scaled to 80x80 in-game. Transparent background. Centered subject. |
| Character (Roxy) | 512x512px | Transparent background. Multiple poses as separate assets. |
| UI button | 512x128px | Transparent background. Gold/purple theme. |
| Blocker overlay | 256x256px | Semi-transparent. Overlays on top of symbols. |
| Power-up effect | 256x256px | Transparent background. Glowing/magical feel. |

### Style Consistency Rules
- All assets share the same art direction: rich fantasy, soft painterly lighting, magical atmosphere
- Lighting comes from upper-left across all assets
- Symbols must read clearly at 80x80px — bold shapes, high contrast, minimal fine detail
- Characters have a whimsical, approachable style (not realistic)
- Backgrounds are atmospheric but not busy in areas where UI overlays

## Mode 2: Process Raw Assets (`/art-asset process`)

When images are dropped in `src/assets/raw/`, process them:

### Processing Pipeline
1. **Discover**: List all files in `src/assets/raw/`
2. **Analyze**: Read each image — check dimensions, content, transparency
3. **Classify**: Determine asset type from filename or content
4. **Process** using Python PIL:
   - **Backgrounds**: Crop to landscape (800x700) + portrait (500x900) versions
   - **Symbols**: Resize to 256x256 (or 80x80 if already small), ensure transparency
   - **Characters**: Resize to appropriate dimensions, ensure transparency
   - **UI elements**: Resize as needed, ensure transparency
5. **Save**: Output to `src/assets/sprites/` with descriptive kebab-case names
6. **Integrate**: Update the relevant source files:
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
// In loadAssets():
const rubyTex = await Assets.load<Texture>(rubyUrl);
// In CellSprite draw: replace Graphics with Sprite
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
# Landscape: crop 800x700 from lower section (meadow + sky)
top = scaled.height - 700 - 100
landscape = scaled.crop((0, top, 800, top + 700))
landscape.save('src/assets/sprites/name-landscape.png', optimize=True)
# Portrait: scale to 500 wide, crop to 900
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

## Mode 3: Status (`/art-asset status`)

Report current asset status:
- List all files in `src/assets/sprites/` (processed assets in the game)
- List all files in `src/assets/raw/` (unprocessed, waiting)
- Check which game elements still use placeholder Graphics (search for `new Graphics()` in rendering code)
- Summarize: X assets integrated, Y waiting, Z still placeholder

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
