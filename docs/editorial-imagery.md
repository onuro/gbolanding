# Editorial imagery

Generated for the landing page with the built-in image generation tool on 2026-09-14. These are illustrative scenes, not photographs of the GBO team, offices, or clients.

Astro's Image component produces responsive WebP variants. The source assets stay local, below-fold images are lazy-loaded, and fixed-height frames reserve layout space. Empty alt text is intentional: these decorative images accompany product and process descriptions and add no additional factual content.

## Source files and prompts

### kollektor — current

Source: `src/assets/editorial/kollektor-human-conversation-particles-refined-2x.png`

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
