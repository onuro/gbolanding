# Editorial imagery

Generated for the landing page with the built-in image generation tool on 2026-09-14. These are illustrative scenes, not photographs of the GBO team, offices, or clients.

Astro's Image component produces responsive WebP variants. The source assets stay local, below-fold images are lazy-loaded, and fixed-height frames reserve layout space. Empty alt text is intentional: these decorative images accompany product and process descriptions and add no additional factual content.

## Source files and prompts

### kollektor — current

Source: `src/assets/editorial/kollektor-human-conversation-final-2x.png`

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
