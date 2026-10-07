# Editorial imagery

Generated for the landing page with the built-in image generation tool on 2026-09-14. These are illustrative scenes, not photographs of the GBO team, offices, or clients.

Astro's Image component produces responsive WebP variants. The source assets stay local, below-fold images are lazy-loaded, and fixed-height frames reserve layout space. Empty alt text is intentional: these decorative images accompany product and process descriptions and add no additional factual content.

## Product media delivery

`ProductVideo.astro` renders one responsive WebP still beneath each video. It remains visible until the first playing event and is also the fallback for disabled JavaScript, blocked autoplay, reduced motion, and data-saving connections. Do not pass an imported PNG's `.src` to a native video `poster`: doing so bypasses image optimization (the Kollektor source alone is 8.1 MB).

Video sources use `data-src`, with no autoplay attribute, so they cannot start downloading before the card enters the viewport. The still finishes decoding before video loading begins. Playback pauses offscreen and in background tabs. Reduced motion, Save-Data, and 2G connections retain the still.

The original video files are preserved. The site uses these delivery copies:

- Kollektor: `public/media/kollektor-human-conversation-1280.webm` (about 891 KB) and `kollektor-human-conversation-1280.mp4` (about 897 KB), at 1280 × 734 and 24 fps. The MP4 uses H.264 and fast-start metadata.
- Hastam: `public/media/hastam-doctor-consultation-960.mp4` (about 488 KB), at 960 × 960 and 24 fps, H.264 with fast-start metadata.

To regenerate delivery copies with FFmpeg:

```sh
ffmpeg -i public/media/kollektor-human-conversation.mp4 -an -vf 'scale=1280:-2:flags=lanczos,fps=24' -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -map_metadata -1 public/media/kollektor-human-conversation-1280.mp4
ffmpeg -i public/media/kollektor-human-conversation.mp4 -an -vf 'scale=1280:-2:flags=lanczos,fps=24' -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -cpu-used 2 -pix_fmt yuv420p -map_metadata -1 public/media/kollektor-human-conversation-1280.webm
ffmpeg -i public/media/hastam-doctor-consultation.mp4 -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart -map_metadata -1 public/media/hastam-doctor-consultation-960.mp4
```

`npm run check:ssr` checks that both homepages defer their video sources, keep each delivered clip below 1 MB, and use responsive stills below 150 KB per candidate.

## Source files and prompts

### kollektor — current

Source: `src/assets/editorial/kollektor-human-conversation-particles-original-2x.png`

Replaces the headset still life with a human phone conversation and an abstract AI voice waveform. The portrait is generated and does not depict an actual customer. The image uses `object-position: 45% 15%` to retain headroom on wide banners and the face/waveform pair on mobile.

```text
Use case: ads-marketing
Asset type: photographic editorial banner for Kollektor, an AI voice agent that talks with people over ordinary phone calls.
Primary request: Show a real-feeling human conversation with AI. A thoughtful adult woman in her thirties, short dark wavy hair and a simple cream shirt, is seen waist-up in three-quarter profile on the left half of the composition, holding a slim black smartphone naturally to her ear. She is mid-conversation, attentive and relaxed, lips gently parted as she replies, looking slightly right. She is a person receiving a call, not a call-center employee. The right half contains a single elegant emerald-green audio waveform suspended against a softly defocused deep charcoal-green background: the visual representation of the AI voice on the other end. The waveform is a restrained precise design overlay of slender vertical bars with a small soft glow, not a physical device. The human and waveform share one uninterrupted image.
Style/medium: Photorealistic editorial portrait with one minimal graphic voice-wave overlay. Premium modern technology campaign, natural facial and skin texture, thoughtful art direction, candid believable expression. Beautiful realistic light, not generic stock photo.
Composition/framing: WIDE LANDSCAPE 2:1 aspect ratio, 1536x768. Show the woman's WHOLE head with generous space above, down to mid-torso. Her face centered around x=36%, y=45%, waveform centered around x=70%, y=48%. Both key subjects kept inside the middle 70% width and central 65% height so neither is lost when this gets cropped into a website banner. Balanced visual conversation across the image. No collage split, no divider, no inset panel.
Scene/backdrop: A quiet modern interior, very softly blurred, subtle natural window light on the woman and the left background, deeper forest green on the right. No clutter.
Lighting/mood: Soft directional natural light, calm and human, believable human warmth with crisp emerald voice accent. Neutral cream highlights, natural skin, charcoal and forest green. Avoid heavy amber or sepia grading.
Constraints: Full-bleed image only. No text, no logo, no watermark, no readable screen, no numeric indicators, no chat bubbles. No headset, no headphones on a desk, no robot, no cyborg, no holographic human, no handshakes, no smile at camera, no exaggerated grin. Anatomically correct hand holding the phone. Do not depict distress, debt, money, or a specific real person.
```

#### Dotted waveform edit — 2026-09-20

Edited with the built-in imagegen tool using the original Kollektor image as the edit target. The woman, room, lighting, framing, and photographic treatment are preserved; only the voice waveform was redrawn.

```text
Use case: precise-object-edit.
Asset type: wide photographic editorial banner for the Kollektor product card.
Input image: the supplied local image is the edit target.

Primary request: Change only the emerald-green audio waveform on the right. Preserve the waveform’s existing overall horizontal position, width, height, peaks, valleys, symmetry, brightness, and soft glow, but redraw it entirely from many very small circular dots arranged in close, regular vertical columns. Each original slender vertical bar should become a dense column of tiny evenly spaced luminous dots, so the same voice-wave silhouette remains immediately recognizable. The dots must be considerably smaller and more refined than a typical halftone dot—roughly pinprick-sized at full resolution—with restrained spacing and no connecting strokes.

Absolute invariants: preserve the exact same woman, identity, face, hair, expression, gaze, skin texture, hand, black phone, cream shirt, pose, anatomy, scale, framing, crop, office environment, plants, furniture, background blur, lighting, shadows, color grading, and image dimensions. Do not repaint, regenerate, retouch, move, crop, or alter any part of the photograph outside the existing waveform area.

Constraints: edit only the graphic waveform. Keep it emerald green with the same subtle glow. Use circles/dots only—no vertical bars, no solid lines, no dashes, no text, no logo, no added UI, no watermark. Keep the original 2:1 full-bleed composition exactly.
```

#### GPT image upscale — 2026-09-20

Upscaled with the built-in image generation tool, using the dotted-waveform image as the sole edit target. The AI-enhanced result was saved at 2× dimensions: 3548 × 1774 pixels.

```text
Use case: identity-preserve.
Asset type: high-resolution photographic editorial banner for the Kollektor product card.
Input image: the supplied image is the sole edit target and visual source.

Primary request: upscale this exact image to 2× resolution, targeting 3548 × 1774 pixels, with clean natural detail enhancement. Improve only resolution, edge definition, fine hair strands, realistic skin and fabric texture, subtle room detail, and the clarity of the tiny dotted emerald waveform. Remove compression softness and aliasing while keeping the image photorealistic and restrained.

Absolute invariants: preserve the exact same woman and identity, facial structure, expression, gaze, hair shape, hand anatomy and placement, black phone, cream shirt, body pose, scale, framing, crop, office environment, plants, furniture, background blur, lighting direction, shadows, color grading, and every object’s position. Preserve the dotted waveform’s exact location, dimensions, silhouette, column pattern, dot size, spacing, emerald color, brightness, and glow. Do not redesign, repaint, move, add, remove, crop, or recompose anything.

Constraints: upscale and restore detail only. Keep the exact 2:1 full-bleed composition. No beauty retouching, no altered facial features, no extra texture, no oversharpening, no halos, no noise, no text, no logo, no watermark, no added UI.
```

#### Waveform background cleanup — 2026-09-20

Edited with the built-in imagegen tool to remove tonal banding behind the dotted waveform. The cleaned result was saved at 3548 × 1774 pixels.

```text
Use case: precise-object-edit.
Asset type: wide photographic editorial banner for the Kollektor product card.
Input image: the supplied image is the sole edit target.

Primary request: remove the visible tonal banding and blocky gradient artifacts in the dark-green background directly behind and around the dotted audio waveform, centered near x=65%, y=42%. Replace only those background artifacts with a smooth, seamless, naturally defocused continuation of the same deep forest-green wall. The cleaned area should have an even photographic gradient with subtle natural lens blur and fine continuous tone, matching the surrounding wall perfectly.

Absolute invariants: preserve the dotted emerald waveform exactly—same dots, dot size, spacing, columns, silhouette, location, width, height, brightness, color, and glow. Preserve the exact same woman, identity, facial details, hair, expression, gaze, hand, phone, shirt, pose, framing, crop, plants, furniture, lighting, shadows, colors, and every other part of the image. Do not repaint or alter anything outside the affected dark-green background immediately behind the waveform.

Avoid: horizontal or vertical bands, posterization, rectangular patches, halos, rings, brush marks, smudges, new shadows, extra glow, texture patterns, text, logos, watermarks, added objects, or any change to the waveform. Keep the original 2:1 full-bleed composition exactly.
```

#### Skin, fabric, and dot cleanup — 2026-09-20

Edited with the built-in imagegen tool to remove artificial stripe and moiré artifacts from the woman and eliminate glow outside the individual waveform dots. The corrected result was saved at 3548 × 1774 pixels.

```text
Use case: precise-object-edit.
Asset type: wide photographic editorial banner for the Kollektor product card.
Input image: the supplied image is the sole edit target.

Primary request 1: remove every artificial contour-line, moiré, watermark-like stripe, embossed swirl, repeating ripple, and patterned texture from the woman’s skin and clothing, especially her face, neck, chest, forearm, hand, and cream shirt around x=36.8%, y=62.4%. Restore clean natural human skin with subtle real pores and normal tonal variation. Restore the shirt as plain, realistic cream linen with only natural weave, folds, seams, and wrinkles—no decorative pattern and no repeated markings.

Primary request 2: remove all bloom, haze, halos, and soft glow outside the individual emerald waveform dots around x=70.5%, y=41.2%. Each dot must be a small, crisp, solid circular point with a clean edge and consistent emerald color. Keep the background visible cleanly between dots. Preserve the waveform’s exact silhouette, column layout, position, width, and height.

Absolute invariants: preserve the same woman’s identity, facial proportions, expression, gaze, hairstyle, pose, hand placement, black phone, shirt cut, anatomy, framing, crop, office environment, plants, furniture, depth of field, smooth dark-green wall, lighting direction, shadows, color grade, and every object’s position. Do not add, move, crop, or redesign anything.

Avoid: any banding or posterization in the dark-green background; any stripe, contour, embossed, fingerprint, watermark, fabric-print, or moiré artifacts on the woman; any luminous haze connecting waveform dots; any glow beyond a dot edge; bars, lines, dashes, text, logos, watermarks, new objects, beauty retouching, plastic skin, oversharpening, or altered identity. Keep the exact 2:1 full-bleed composition.
```

#### Waveform position adjustment — 2026-09-20

Edited with the built-in imagegen tool to move the dotted waveform farther right into the open wall space. The selected result was saved at 3548 × 1774 pixels.

```text
Use case: precise-object-edit.
Asset type: wide photographic editorial banner for a Kollektor product card.

Primary request: Move the entire emerald dotted audio waveform horizontally to the right by approximately 5% of the total image width (about 90 px in a 1774 px source). Do not move it vertically. Keep the waveform's exact width, height, silhouette, dot count and columns, dot size, spacing, crisp solid edges, emerald color, and zero outer glow. Its new center should be around x=75% while remaining at the same y position around 42%.

Cleanly remove the waveform from its old location and restore that area as a smooth, seamless continuation of the dark forest-green defocused wall, with no banding, posterization, patch, halo, or cloning artifacts.

Absolute invariants: preserve the exact same woman, identity, face, hair, expression, gaze, skin, hand, phone, shirt, pose, natural artifact-free skin and linen, framing, crop, room, plants, furniture, depth of field, lighting, shadows, and color. Change only the waveform's horizontal position and the background pixels it vacates or occupies.

Avoid: changing the subject, crop, or background; moiré or stripes on skin or fabric; glow or haze around dots; bars, lines, dashes, text, logos, or watermarks. Preserve the exact 2:1 full-bleed composition.
```

#### Full scene regeneration — 2026-09-20

Regenerated from a text-only prompt with the built-in imagegen tool. No source image was supplied. The new full-scene result keeps the same visual brief and places the dotted waveform closer to the woman. It was saved at 3548 × 1774 pixels.

```text
Use case: ads-marketing.
Asset type: wide photographic editorial banner for Kollektor, an enterprise AI voice-agent product.
Generate this image entirely from scratch from this text prompt. Do not use, trace, composite, or edit any source image.

Primary scene: A thoughtful adult Mediterranean woman in her thirties with short, naturally curly dark-brown hair is seated waist-up in three-quarter profile on the left half of the frame. She wears a simple plain cream-white linen button-up shirt with rolled sleeves and holds a slim black smartphone naturally to her left ear. She is mid-conversation, attentive and relaxed, lips gently parted, looking slightly to the right. Her face, skin, hand anatomy, hair, and clothing must be fully photorealistic and natural.

Environment: A quiet, premium contemporary living-room or hospitality interior. Tall daylight window at far left, softly blurred pale sofa and deep-green cushions behind her, a small dark round table with a plant in the lower-left foreground, a warm defocused lamp behind her, and a smooth deep forest-green wall across the right half. At far right, include only subtle blurred dark furniture and out-of-focus plant leaves. Keep the room calm, tasteful, and uncluttered.

AI voice graphic: On the forest-green wall to the woman's right, place one elegant emerald audio waveform made entirely from many tiny crisp solid circular dots in evenly spaced vertical columns. No bars, no lines, no connecting strokes. Preserve a recognizable balanced voice-wave silhouette with varied peaks and valleys. The individual dots must have clean edges and no glow, bloom, haze, halo, or banding. Place the waveform a little closer to the woman than before: centered near x=68%, y=43%, with its left edge near x=55% and enough breathing room between the waveform and her shoulder. Keep it moderately compact, around 31% of total image width and 24% of total image height.

Style and lighting: High-end photorealistic editorial campaign photography, natural window light from the left, authentic skin pores and linen texture, restrained depth of field, warm ivory highlights, charcoal shadows, deep evergreen background, quiet human warmth. Smooth continuous-tone wall with no posterization or patches.

Composition: exact 2:1 wide landscape, full bleed. Woman's face centered around x=36%, y=34%; show her complete head with comfortable headroom and body to mid-torso. Keep the woman and waveform balanced as two conversational subjects. No split-screen, divider, inset, border, text, logo, watermark, UI, headset, robot, cyborg, holographic person, debt or money imagery.

Avoid: contour lines, invisible stripes, moiré, embossed swirls, repeated texture artifacts, plastic skin, excessive beauty retouching, deformed hands, extra fingers, altered phone geometry, excessive sharpening, glow around waveform dots, vertical bars, solid lines, dashes, typography, or any visible gradient banding.
```

#### Technical micro-dot waveform — 2026-09-20

Edited with the built-in imagegen tool to replace the waveform with a tighter, more technical micro-dot signal while preserving the regenerated photograph. The selected result was saved at 3548 × 1774 pixels.

```text
Use case: precise-object-edit.
Asset type: wide photographic editorial banner for Kollektor, an enterprise AI voice-agent product.

Edit only the emerald dotted audio waveform on the dark-green wall around x=67.9%, y=36%. Replace it with a more modern, refined, technical audio visualization made exclusively from tiny circular micro-dots arranged on a precise invisible grid.

Design direction for the new waveform:
- crisp contemporary voice-signal silhouette with a thin horizontal centerline implied only by dots
- narrow tapered ends, varied but controlled peaks, and a strong central pulse
- smaller dots than the current version, roughly 40% smaller, with tighter regular spacing
- perfectly round, sharp solid dots with consistent geometry
- restrained emerald and mint-green tones, using only subtle solid-color brightness variation between dots to suggest signal energy
- high-end enterprise AI interface aesthetic: precise, minimal, intelligent, balanced
- no glow, bloom, halos, haze, gradients, connecting lines, vertical bars, dashes, rings, shadows, or translucent smears
- retain approximately the current waveform position and overall footprint, centered around x=70%, y=36%, with clear breathing room from the woman's face and shoulder

Cleanly remove the existing waveform first and restore its former pixels as a seamless continuation of the smooth defocused forest-green wall before placing the new micro-dot visualization.

Absolute invariants: preserve the woman and the entire photographic scene exactly—same identity, face, expression, gaze, hair, skin, hand, phone, shirt, pose, anatomy, framing, crop, sofa, cushions, table, books, plants, lamp, cabinet, depth of field, lighting, shadows, color grade, and every object position. Do not repaint, regenerate, retouch, move, crop, or alter any part of the photograph outside the waveform region.

Artifact prevention: no banding, posterization, moiré, contour lines, repeated texture, watermark-like patterns, striping, patches, cloning seams, compression blocks, artificial skin texture, fabric distortion, malformed dots, stray dots, or residual glow. No text, logo, watermark, UI panel, or additional graphic. Keep the exact 2:1 full-bleed composition.
```

#### Pinprick waveform dots — 2026-09-20

Edited with the built-in imagegen tool to reduce the individual dots dramatically while keeping the audio spectrum's overall size and position. An initial pass was rejected because it introduced hollow ring artifacts; the selected pass uses tiny solid circles only. The result was saved at 3548 × 1774 pixels.

```text
Precise local edit. Change only the green audio waveform on the right side of this image.

Keep the waveform's exact current outer dimensions, position, center, tapered ends, silhouette, peaks, valleys, number of columns, number of rows, and the center coordinate of every existing dot. Do not change the spectrum's width or height.

Make each existing dot dramatically smaller: reduce every dot to approximately 25% of its current diameter. Each must be a tiny pinprick-sized, perfectly round, completely FILLED solid emerald-green circle. Keep the same spacing between dot centers. Do not add more dots and do not remove dots. The much smaller circles should leave substantially more clean dark-green wall visible between them.

Strict dot rules: solid filled circles only. No hollow circles. No rings. No outlines. No loops. No ovals. No teardrops. No glyphs. No diamonds. No stars. No gradients. No light center. No glow, bloom, halo, shadow, haze, connecting line, vertical bar, dash, or blur. Every dot must be a single flat-color circular mark with a crisp edge.

Remove all pixels of the old larger dots and restore the exposed area as a smooth seamless continuation of the surrounding forest-green wall. No residual edges or ghost marks.

Preserve every other pixel and detail of the photograph: same woman, identity, face, skin, hair, expression, hand, phone, shirt, pose, room, furniture, plants, lighting, framing, crop, color, and blur. Do not repaint or retouch the woman or environment.

No artifacts anywhere: no moiré, contour textures, striping, banding, posterization, patches, cloning seams, repeated marks, malformed dots, residual dots, text, logo, or watermark. Exact 2:1 full-bleed composition.
```

#### Particle audio spectrum — 2026-09-20

Edited with the built-in imagegen tool using the generated Kollektor scene as the target and the supplied monochrome particle waveform as a style reference. The grid was replaced by an organic emerald particle ribbon at approximately the same scale. The result was saved at 3548 × 1774 pixels.

```text
Use case: precise-object-edit with style reference.
Asset type: wide photographic editorial banner for Kollektor.

Reference roles:
- FIRST image is the edit target. Preserve its photograph.
- SECOND image is style reference only. Use its audio-particle language: a flowing waveform formed from thousands of tiny particles with organic density, soft dispersion at the edges, and energetic clustered ridges. Do not copy its white background, black color, browser frame, icon, or exact waveform.

Edit only the green dotted waveform around x=68.9%, y=37.2% in the FIRST image. Remove the regular dot-grid waveform completely and replace it with an emerald particle audio spectrum inspired by the SECOND image.

Particle design:
- thousands of extremely tiny, solid, pinprick particles
- particles flow in a continuous organic audio ribbon rather than rows, columns, or a geometric grid
- variable particle density defines the signal: dense emerald ridges through the strongest peaks, lighter sparse particles feathering around the edges
- one coherent horizontal voice-wave silhouette with natural undulation and several energetic peaks and valleys
- refined, premium enterprise-AI aesthetic; dimensional through density only
- preserve approximately the existing waveform's overall footprint, centered near x=70%, y=37%, spanning roughly the same width and height
- keep generous separation from the woman's face and shoulder
- particles use restrained emerald and mint tones, clearly visible against the forest-green wall

Strict constraints: particles must remain individual microscopic solid specks. No large dots, regular rows, regular columns, halftone grid, hollow rings, outlines, bars, lines, solid ribbon, smoke, fog, neon glow, bloom, halo, lens flare, translucent panel, rectangular haze, or visible bounding box.

Cleanly restore the wall beneath the removed waveform as a smooth seamless continuation of the same defocused forest-green surface before placing the new particle spectrum.

Absolute invariants: preserve every photographic element in the FIRST image exactly—the woman, identity, face, expression, gaze, hair, skin, hand, phone, shirt, pose, anatomy, framing, crop, sofa, cushions, table, books, plants, lamp, cabinet, depth of field, lighting, shadows, colors, and object positions. Do not repaint, regenerate, retouch, crop, or move any part of the photograph outside the waveform area.

Artifact prevention: no banding, posterization, contour lines, moiré, striping, repeated texture, patches, cloning seams, compression blocks, residual old dots, stray geometric marks, text, logos, watermarks, UI, or changes to skin and fabric. Preserve the exact 2:1 full-bleed composition.
```

#### Refined particle ribbon — 2026-09-20

The first particle treatment was rejected because it read as a bright, chaotic explosion. A second imagegen edit returned to the clean photograph and produced a restrained flowing particle ribbon with lower contrast and smoother contours. The selected result was saved at 3548 × 1774 pixels.

```text
Use case: precise-object-edit with style reference.
Asset type: premium wide editorial banner for Kollektor.

Reference roles:
- FIRST image is the clean photographic edit target. Preserve the photograph exactly.
- SECOND image is the visual style reference for the particle behavior only.

Replace only the regular green dot-grid waveform on the wall in the FIRST image, around x=69%, y=37%, with a refined particle-based audio ribbon inspired by the SECOND image.

The previous particle attempt failed because it looked like a bright neon explosion with chaotic spray, harsh vertical spikes, a white-hot center, and excessive contrast. Avoid all of those qualities.

Desired particle treatment:
- an elegant, airy horizontal ribbon formed from thousands of microscopic emerald specks
- smooth continuous flowing contours, like a gently folded fabric ribbon or an audio signal moving through space
- two or three soft overlapping undulations that create natural peaks and valleys
- particles cluster subtly along the flowing curves and disperse gradually above and below
- low-to-medium contrast, restrained deep emerald with a few muted mint particles
- no white particles and no bright center
- no single solid line; the flowing shape must be perceived through particle density
- delicate, quiet, precise, premium, technical, and editorial
- clean negative space remains visible through the particle cloud
- preserve approximately the existing spectrum footprint and placement: centered near x=70%, y=37%, roughly the same total width and height
- tapered, softly dissolving ends

Strict exclusions:
- no explosion, splash, powder blast, sparks, firework, smoke, fog, electrical arc, neon effect, glow, bloom, halo, luminous haze, white-hot highlights, jagged sawtooth waveform, tall needle spikes, sharp triangular peaks, noisy cloud, random debris, thick central band, regular rows, regular columns, grid, halftone dots, bars, lines, rings, or large dots
- no rectangular patch, bounding box, or visible edit boundary

First remove the old dot-grid completely and reconstruct the wall behind it as a smooth seamless continuation of the same defocused forest-green surface. Then add the new restrained particle ribbon.

Absolute invariants: preserve all photographic content outside the waveform region exactly—the woman, identity, face, expression, gaze, hair, skin, hand, phone, shirt, pose, anatomy, framing, crop, sofa, cushions, table, books, plants, lamp, cabinet, depth of field, lighting, shadows, colors, and object positions. Do not repaint, regenerate, retouch, move, or crop the photograph.

Artifact prevention: no banding, posterization, contour lines, moiré, striping, repeated textures, patches, seams, compression blocks, residual old dots, text, logos, watermarks, or changes to skin and fabric. Exact 2:1 full-bleed composition.
```

### kollektor — initial concept (unused)


Source: `src/assets/editorial/kollektor-voice-workspace.png`

```text
Use case: photorealistic-natural
Asset type: editorial photograph for a premium enterprise AI website, Kollektor voice automation product card.
Primary request: A beautifully art-directed close-up still life of a sculptural black professional telephone headset resting on a warm pale limestone desk next to neatly stacked unmarked off-white papers. An understated dark green glass partition behind. The subject is voice and careful professional work.
Style/medium: Photorealistic architectural editorial photography, tactile and quietly cinematic, natural material texture, sophisticated magazine quality.
Composition/framing: Landscape 3:2, 1536x1024. Headset is the clear main subject, centered in the middle 50 percent of the frame so it survives a shallow wide website crop. Low three-quarter camera angle, confident diagonal afternoon shadows, enough breathing room. Full-bleed photograph only.
Lighting/mood: Warm sun raking across stone from a nearby window, deep forest green shadows, clear real-world detail, calm and intelligent.
Color palette: Warm ivory stone, graphite, deep evergreen glass, gentle amber sunlight.
Constraints: No people, no faces, no text, no labels, no logo, no watermark, no UI, no robots, no neon, no blue holograms. Not a website screenshot.
```

### intelval

Source: `src/assets/editorial/intelval-architecture.png`

```text
Use case: photorealistic-natural
Asset type: editorial architectural photograph for a premium enterprise AI website, Intelval property valuation product card.
Primary request: A compelling close view looking upward between elegant contemporary office towers, with a sculptural pale limestone facade on one side and deep evergreen reflective glass on the other. Architectural geometry and real materials give the image depth. A narrow wedge of pale warm sky.
Style/medium: Photorealistic premium architecture magazine photography, sharp genuine surface details, realistic elegant urban building, not a sci-fi building.
Composition/framing: Landscape 3:2, 1536x1024, centered converging vertical lines and a strong graphic diagonal composition that remains compelling in a wide shallow crop. Full-bleed photograph only. Distinctive close architectural framing, not an aerial skyline.
Lighting/mood: Rich warm late afternoon sidelight on cream stone, green-grey glass catching soft sky reflections, cinematic natural contrast.
Color palette: Warm limestone ivory, deep forest green glass, charcoal, subdued honey sunlight. Cohesive with warm stone and green-glass editorial workplace photography.
Constraints: No people, no text, no logos, no UI, no watermark, no fantasy towers, no oversaturated blue or cyberpunk neon. Not a website screenshot.
```

### worktable

Source: `src/assets/editorial/collaborative-worktable.png`

```text
Use case: photorealistic-natural
Asset type: wide editorial photograph for the how-we-work section of a premium enterprise AI agency website.
Primary request: An overhead editorial still-life of a collaborative design work session on a long warm limestone and pale oak worktable. Only two pairs of natural adult hands and forearms enter the edges, thoughtfully arranging small unmarked ivory paper cards into a workflow near a closed graphite laptop, a mechanical pencil, and one subtle deep green glass tumbler. This is an illustrative work process, not a team portrait.
Style/medium: Photorealistic high-end design magazine photography, authentic material texture, art-directed but human, natural skin and hand anatomy.
Composition/framing: Wide landscape 3:2, 1536x1024, straight-down camera. Key objects and hand activity are across the central horizontal third so the image also works cropped into a 3:1 strip. Airy editorial negative space with directional shadows. Full-bleed photograph only.
Lighting/mood: Warm afternoon sunlight through a tall window, long clean shadows, calm purposeful work, a tactile contrast to digital interfaces.
Color palette: Warm ivory, pale oak, charcoal, understated deep green, natural skin. Muted but not grey.
Constraints: No faces, no readable text, no branding, no logos, no watermark, no post-it wall, no futuristic UI, no holograms, no neon, no blue tech imagery. No artificial team portrait. Not a website screenshot.
```

## Added 2026-10-02 with Magnific

Made through the owner's Magnific account during the ElevenLabs-based restyle: the two backdrops are stock images, the two photographs were generated. The generated originals stay in the Magnific library (Personal project); the repo holds the delivery copies. Same rule as above for the photographs: illustrative scenes, not photographs of the GBO team, offices, or clients, with no people in them.

### atmosphere backdrops

The noise gradient behind a product window: `stage-atmos` in `src/styles/global.css`. Two layers:

- The gradient: `--atmos-image`, `src/assets/editorial/atmosphere-evergreen.webp` in the light theme (peach over deep evergreen) and `atmosphere-dusk.webp` in the dark theme (emerald on black). 1280 px wide, WebP quality 86, 12 KB and 9 KB. They are the stock images below with their grain blurred away, so the files hold only the gradient.
- The grain: `src/assets/editorial/atmosphere-grain.png`, a 256 × 256 tile of black and white specks (gaussian, sigma 42, strength in the alpha channel), repeated over the gradient. It is drawn at one speck per device pixel: 256 px on a 1x screen, 128 px from 1.5x up. `--atmos-grain` sets its strength per theme. The tile was made with sharp, not downloaded.

Both gradients are CSS backgrounds, so Astro's Image component does not touch them: keep them small.

Stock sources, licensed through the owner's Magnific account on 2026-10-02 (premium items; the 19 MB and 8 MB originals are not in the repo):

- Light: "Abstract background featuring grainy texture with soft between dark green and peach", by pasivejurney. https://www.magnific.com/premium-photo/abstract-background-featuring-grainy-texture-with-soft-dark-green-peach_432379897.htm
- Dark: "Dark green blue grainy gradient background black backdrop noise texture effect webpage header wide". https://www.magnific.com/premium-photo/dark-green-blue-grainy-gradient-background-black-backdrop-noise-texture-effect-webpage-header-wide_137081945.htm

A first set of three backdrops was generated with Recraft V4.1 and rejected by the owner the same day: they came out as textured glass ("plastic-y"), not as a noise gradient. Do not go back to generated backdrops; pick a stock noise gradient or build one from blurred colour and this grain tile.

### about

Source: `src/assets/editorial/about-studio-worktable.jpg` (3024 × 1296, JPEG quality 92 from the PNG original).

The banner under the About page title. Model: Seedream 5 Pro, 21:9, two variants; the other one showed a maker's mark on the laptop lid and was dropped.

```text
Use case: photorealistic-natural
Asset type: wide editorial photograph for the About page of a premium enterprise AI agency website.
Primary request: A quiet, beautifully art-directed studio workspace at rest, with no one in it. A long warm pale limestone worktable runs across the frame; on it a closed graphite laptop, a small neat stack of unmarked ivory paper cards, a mechanical pencil and one deep green glass tumbler. Behind the table a tall window at the left and a deep evergreen glass partition; one slender olive tree in a plain stone pot at the far right. The subject is calm, careful professional work.
Style/medium: Photorealistic architectural editorial photography, tactile natural material texture, sophisticated magazine quality, quietly cinematic. Real-world detail, not a 3D render.
Composition/framing: Very wide landscape. The table is a strong horizontal across the lower third; the laptop and cards sit inside the middle 60 percent of the width so the picture survives a narrower crop. Low three-quarter camera angle, generous calm negative space on the wall above. Full-bleed photograph only.
Lighting/mood: Warm late-afternoon sun raking across the stone from the window at left, long clean diagonal shadows, deep forest green in the shadows, calm and intelligent.
Color palette: Warm ivory stone, pale oak, graphite, deep evergreen glass, gentle amber sunlight. Muted but not grey.
Constraints: No people, no faces, no hands, no text, no labels, no logo, no watermark, no UI, no lit screens, no robots, no neon, no blue holograms. Not a website screenshot.
```

### hastam reception

Source: `src/assets/editorial/hastam-clinic-reception.jpg` (2496 × 1664, JPEG quality 92 from the PNG original).

The photograph in the Hastam page's "how" chapter, whose title says the assistant speaks like a reception. The image uses `object-position: 50% 72%` so the telephone stays in the 21:9 crop. Model: Seedream 5 Pro, 3:2, two variants; the other one had readable digits and a maker's label on the telephone.

```text
Use case: photorealistic-natural
Asset type: editorial photograph for the page of Hastam, an AI voice receptionist that answers a clinic's telephone, on a premium enterprise AI website.
Primary request: A beautifully art-directed still life of a small private clinic's reception desk at rest, with no one behind it. A warm pale limestone counter; on it a slim matte graphite desk telephone with its handset resting in the cradle, the clear main subject; beside it an open paper appointment diary with blank unmarked pages and a pen, and a small green plant in a plain ceramic pot. Behind, softly out of focus, a deep evergreen glass partition and two empty pale upholstered waiting chairs.
Style/medium: Photorealistic architectural editorial photography, tactile natural material texture, sophisticated magazine quality, quietly cinematic. Real-world detail, not a 3D render.
Composition/framing: Landscape 3:2. The telephone is centered in the middle 50 percent of the frame so it survives a shallow wide website crop. Low three-quarter camera angle, enough breathing room. Full-bleed photograph only.
Lighting/mood: Early morning sun raking across the stone from a window at left, long soft shadows, deep forest green shadows, calm and reassuring.
Color palette: Warm ivory stone, graphite, deep evergreen glass, gentle amber sunlight.
Constraints: No people, no faces, no hands, no text, no readable writing, no labels, no logo, no red cross, no medical symbols, no watermark, no screens, no UI, no robots, no neon, no blue holograms. Not a website screenshot.
```

### menu photos

Sources: `src/assets/editorial/menu-kollektor.jpg` and `menu-hastam.jpg` (1280 × 720, JPEG quality 92 from the PNG originals).

The picture column of the products menu in `SiteHeader.astro`: one photograph per product, shown about 288 px wide and cropped from the centre, swapped as the pointer moves between the rows. Generated on 2026-10-02 with GPT Image 2.5 (Sunburst) through the owner's ElevenLabs account, at the owner's suggestion; 16:9, 1K, quality high, two variants each. The people are generated and depict no one. The originals are in the ElevenLabs flow "BlEJnZU8lkdTXnD0zOWD".

```text
Intended use: a small contextual photograph inside a website navigation menu for Kollektor, an AI voice agent that phones people about an overdue payment. It is shown about 300 px wide and cropped to 4:3 from the centre, so the subject must sit inside the middle 60 percent of the frame and read clearly at small size.

Scene: a quiet contemporary living room in late-afternoon light. Behind the subject a deep evergreen painted wall, softly out of focus, with the edge of a pale linen armchair and one small plant, both blurred.

Subject: a man in his late thirties with short dark hair and a trimmed beard, wearing a plain cream knit sweater, seen from the chest up in three-quarter profile, holding a slim black smartphone to his ear with his right hand. He is in the middle of a phone conversation: listening, calm and attentive, lips closed, looking slightly off camera. He is a person taking a call at home, not a call-centre employee.

Key details: natural skin texture, believable hand anatomy on the phone, shallow depth of field like an 85 mm lens at f/2, warm window light from the left with a soft shadow on the far side of the face. Palette of warm ivory, graphite and deep evergreen with a little amber sunlight.

Constraints: photorealistic editorial photograph, not an illustration and not a 3D render. One person only. No text, no logo, no watermark, no readable screen, no headset, no microphone, no money, no documents, no distress, no smile at the camera.
```

```text
Intended use: a small contextual photograph inside a website navigation menu for Hastam, an AI voice receptionist that answers a clinic's telephone and books appointments with the right doctor. It is shown about 300 px wide and cropped to 4:3 from the centre, so the subject must sit inside the middle 60 percent of the frame and read clearly at small size.

Scene: the reception of a small modern private clinic in soft morning light. A pale limestone counter in the foreground; behind, softly out of focus, a deep evergreen glass partition and one green plant.

Subject: a doctor in her forties with dark hair tied back, wearing a white coat over a sage-green blouse, a stethoscope around her neck, seen from the waist up in three-quarter view. She stands at the counter and writes in an open paper appointment diary with a pen, looking down at the page, calm and focused with a faint relaxed expression.

Key details: natural skin texture, believable hands, the pages of the diary blank and unmarked, shallow depth of field like an 85 mm lens at f/2, soft window light from the left. Palette of warm ivory stone, white, sage and deep evergreen with a little amber sunlight.

Constraints: photorealistic editorial photograph, not an illustration and not a 3D render. One person only. No text, no readable writing, no logo, no red cross, no medical symbols, no name badge, no screens, no watermark.
```


## Added 2026-10-07 for /intelval

Generated with GPT Image 2.5 (`gpt-image-2.5-sunburst`) through the owner's ElevenLabs account, flow `gkVMoSIaL0kF4R1gOWMz`. Illustrative scenes: the valuer, the flat and the street map are invented and show no client, property or person. 1280 × 720 originals.

### intelval hero

Source: `src/assets/editorial/intelval-valuer-site-visit.png` (second of two variations of the re-shoot below). Used by `src/components/intelval-page/HeroReport.astro` with numbered overlays, as on /kollektor. Re-shot the same day so the valuer stands in the sample flat itself (a plain 2004 flat, as in the room photos), not in the pre-war room of the first prompt, which follows for the record.

```text
Re-shoot: same valuer, outfit, pose, phone, tablet and composition, but in the empty living room of a renovated flat in a 2004 mid-rise apartment building in Göztepe, Istanbul: light herringbone oak parquet, smooth white walls with no cornice or moulding, a flat white ceiling with a single small pendant light socket, a wide modern white PVC tilt-and-turn window with a sheer white curtain, a white panel radiator under the window; through the window, softly out of focus, trees and neighbouring cream apartment blocks. No ornate architecture, no French balcony railings.
```

First prompt:

```text
Photorealistic editorial photograph for a premium AI product website. A licensed property valuer, an adult man in his early forties with short dark hair and a trimmed beard, wearing a navy overshirt over a light grey knit, stands inside an empty, recently renovated older apartment in Istanbul during a site inspection. He holds a slim black smartphone a little below his mouth and is dictating a short voice note while looking thoughtfully toward an open balcony doorway on the right, mid-sentence, calm and focused. In his other hand, held low by his side, a closed graphite tablet. The room: warm herringbone oak parquet, tall white walls with original cornice moulding, a tall double window and a glass balcony door, sheer linen curtain, soft afternoon daylight. Through the window, softly out of focus, the rooftops of Kadıköy. Composition: wide landscape, the man seen from mid-thigh up, his face around 33 percent from the left and 35 percent from the top, with generous headroom; the right 45 percent of the frame is the bright window and calm wall; the lower third is quiet floor and soft shadow. Style: natural, candid, believable, premium architecture-and-people magazine photography, real skin texture, correct hands, shallow depth of field on the background. Colour: warm ivory walls, honey oak, navy, soft green-grey shadows; restrained, not orange. No text, no logos, no readable screens, no UI, no watermark, no measuring tape on the floor, no hard hat, no clipboard, no smiling at the camera, no other people.
```

Re-set the same day: the first version stood in a pre-war room with an ornate cornice and an open balcony door, which is not the 2004 flat in the sample file, whose balcony was joined to a room. The file now holds the second of two edits on the same flow, made from that image (node `tKYwtl6RLtcAWRFBAZuP`) and the photo page's living room (`intelval-rooms/3-living.jpg`, node `ZQjoJESfM5oD10ZnNOAN`). The original is still on the flow.

```text
Edit the first image. Keep the man exactly as he is: the same face, beard, hair, navy overshirt, light grey knit, dark trousers, the black smartphone he dictates into, the closed graphite tablet in his other hand, the same pose, size and position in the frame, the same camera height and lens. Replace only the room around him with the living room in the second image, the room of the same flat: a modern 2004 Istanbul apartment, plain smooth white walls with a simple narrow cornice line (no ornate moulding), warm herringbone oak parquet, a wide modern window with slim light-grey aluminium frames and sheer white curtains on the right half of the frame, a slim white panel radiator under it, green tree tops and the facades of other mid-rise apartment blocks outside, soft afternoon daylight. The window is closed and has no balcony, no railing, no balcony door, no sea view, no minarets, no domes. The right 45 percent of the frame stays the bright window and calm white wall, the lower third quiet floor. Keep the wide 16:9 landscape framing, natural candid premium editorial photography, real skin texture, correct hands. No text, no logos, no readable screens, no UI, no watermark, no furniture, no other people.
```

### intelval photo page

Source: `src/assets/editorial/intelval-rooms/1-facade.jpg` … `8-bathroom.jpg`, cut along the white gutters of the second of two generated contact sheets (310–312 × 352 px each). Used by the photo page in `FieldNoteMock.astro`; the order matches `photos` in the copy.

```text
A contact sheet of eight real-estate inspection photographs of the SAME apartment, arranged as a precise grid of 4 columns and 2 rows of equal rectangular photos separated by thin uniform pure white gutters, no captions, no text, no numbers, no frame around the sheet. The apartment: a renovated 3-bedroom flat on the 4th floor of a 2004 mid-rise residential building in Göztepe, Istanbul. Row 1, left to right: (1) the building's exterior seen from the street, a cream and light-grey 6-storey apartment block with balconies and trees; (2) the building entrance, a glass and aluminium door with a small lobby and mailboxes; (3) the living room, herringbone oak parquet, white walls, tall window with sheer curtain, empty; (4) the kitchen, renovated, white lower cabinets, light stone worktop, built-in oven. Row 2: (5) bedroom 1, empty, parquet, one window; (6) bedroom 2, empty, a small room with a built-in white wardrobe; (7) bedroom 3, the room that was joined to the former balcony, with a slight step in the floor and a wide window; (8) the bathroom, renovated, light grey tiles, glass shower, a faint damp stain on the white ceiling. Style: realistic, natural daylight, straight verticals, typical professional valuation-report photos taken with a phone, consistent colour across all eight, not staged, no people, no furniture except built-ins. No text anywhere, no watermarks, no logos.
```

### intelval comparables map

Source: `src/assets/editorial/intelval-map-goztepe.png` (second of two variations). A label-free map under the comparables pins in `CompsMock.astro`; it is not a real street plan.

```text
A minimal flat cartographic street map, seen straight from above, of a dense residential neighbourhood on the Asian side of Istanbul near the sea: an irregular grid of small streets, two wider avenues crossing diagonally, building blocks as soft rounded shapes, one small park, and the Marmara sea coastline along the bottom-left corner. Style: modern product-UI map tile, very calm and muted, monochrome greys: building blocks slightly lighter than the background, streets slightly darker thin lines, the sea a flat slightly cooler grey, no colours except a barely-there grey-green for the park. Absolutely no text, no street names, no labels, no numbers, no pins, no icons, no compass, no scale bar, no legend, no shadows, no 3D, no buildings in perspective. Even detail across the whole frame so it can be cropped anywhere.
```

## Added 2026-10-07 for /fountible

Screenshots, not generated images. Fountible is a GBO Vision product, and these are its own site's product visuals, which are hand-built recreations of the app's UI. They show sample files only (Wander, Pavilion 04, Launch card), with no real customer or user. Captured on 2026-10-07 from https://fountible.com/ in its dark theme. We used headless Chrome (puppeteer-core) at a 1440 px viewport and device scale 2, then cropped each image with `sips` to the visual's bezel plus about 10 px of the page around it. No headings, navigation or body copy from fountible.com are in the crops. Used by `src/components/FountiblePage.astro`. Every caption says "screenshot from fountible.com".

- `fountible-hero.png` (2372 × 1304): from the home page, section 01 "Bro", the editor under "They gave us design tools…". It shows the Wander · iOS file with its layer tree, two phone screens (Explore and Trip detail), the Title layer selected (350 × 41), Mia's cursor and the inspector. Captured in its settled state, the still the site shows to visitors who turn motion off. The home page's top hero is an abstract animated slab, not the app, so we did not use it.
- `fountible-code.png` (2452 × 720): from the home page, section 04 "A real design tool that speaks code.", tiles 04.1 Canvas and 04.2 Export side by side. On the left, a selected "Hero" frame ("Ship as real code.", Stack · gap 16, display: flex). On the right, the same frame as `Hero.tsx` React and Tailwind code. Both tiles are static.
- `fountible-bro.png` (2424 × 1866): from the home page, section 02 "Multiple Bro AI chats. One live canvas.", the "Landing page" demo (`#bro-parallel`). The run was frozen 740 ms after chat 2's product copy lands, so that every transition has settled. It shows "2 on canvas · 1 queued safely", chat 1 finishing Hero / Campaign while chat 2 generates Product imagery, the Campaign hero chat and both cursors. To freeze it, we stubbed `Date.now`, which anime.js reads, and paused CSS transitions through `document.getAnimations()`.
- `fountible-motion.png` (2424 × 1446): from the home page, section 06 "Design the frame. Direct the movement.", the Motion mode demo for Campaign / Launch card, with the timeline (Rotate Y, Rotate X, Layer blur, Opacity) and the Animation panel. Its 6 s CSS loop was frozen at 2760 ms, on a Rotate Y keyframe, where the card has fully landed and is in focus.

To re-capture, load the same sections in the dark theme. Wait for the demo to settle, or freeze it as described above.
