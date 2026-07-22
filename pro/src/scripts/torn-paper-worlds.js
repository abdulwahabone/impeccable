// Torn paper that tears open to reveal a world from the deck.
//
// The shader is adapted from the "Torn Paper" study in pbakaus/radiant (MIT),
// https://radiant-shaders.com/shader/torn-paper. Two changes here:
//
//  1. What shows through the tear is a world card sampled from a texture, lit by
//     the shader's own plasma field, instead of the procedural nebula alone. The
//     nebula stays as the light source and as the fallback before the image
//     loads or when a card is unavailable.
//  2. Reduced-motion holds the cycle at the fully open phase instead of t=0, so
//     the world is still visible when the animation is stilled. Freezing at zero
//     would leave nothing but closed paper.
//
// WebGL1 on purpose: one full-screen triangle, no dependencies.

const CYCLE_DURATION = 7.0;
// Mid "open" phase (calm 0 to 1.5, tear to 3.0, open to 5.0, reform to 7.0).
const REDUCED_MOTION_TIME = 4.0;

// How long the card takes to come up once decoded.
const WORLD_FADE_MS = 600;

const VERT_SRC = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG_SRC = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform float u_tearSpeed;
uniform float u_glowIntensity;
uniform float u_openBias;
uniform float u_lineOffset;
uniform vec2 u_mouse;
uniform sampler2D u_world;
// 0 before a card is ready, ramps to 1 as it fades in.
uniform float u_worldFade;
uniform float u_worldAspect;

#define PI 3.14159265359
#define CYCLE_DURATION 7.0

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p, int octaves) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    v += a * vnoise(p);
    p = rot * p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float fibrousFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 7; i++) {
    v += a * vnoise(p);
    p = rot * p * 2.0 + vec2(3.1, 7.4);
    a *= 0.52;
  }
  return v;
}

// x = progress within the phase, y = phase index
// (0 calm, 1 tear, 2 open, 3 reform)
vec2 getPhase(float t, float speed) {
  float cycle = CYCLE_DURATION / speed;
  float norm = mod(t, cycle) / cycle;
  float p0 = 1.5 / 7.0;
  float p1 = p0 + 1.5 / 7.0;
  float p2 = p1 + 2.0 / 7.0;
  if (norm < p0) return vec2(norm / p0, 0.0);
  if (norm < p1) return vec2((norm - p0) / (p1 - p0), 1.0);
  if (norm < p2) return vec2((norm - p1) / (p2 - p1), 2.0);
  return vec2((norm - p2) / (1.0 - p2), 3.0);
}

float easeInQuad(float t) { return t * t; }
float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

// Jagged tear path across the frame, reshuffled per cycle.
//
// u_lineOffset moves the whole rip up the frame. The across coordinate grows
// upward, so subtracting a positive offset puts the tear above centre. (No
// backticks in here: this comment lives inside the GLSL template literal, and a
// backtick would end the string.) This is the vertical
// counterpart to u_openBias: on a phone there is no horizontal room to bias the
// opening into, because the copy spans nearly the full width, so the rip is
// lifted clear of it instead. Left at 0 on wide screens, where the horizontal
// bias already does the work.
float tearLine(vec2 uv, float progress, float cycleIndex) {
  vec2 rnd = hash2(vec2(cycleIndex * 17.31, cycleIndex * 43.71));
  float angle = (rnd.x - 0.5) * 0.5;
  vec2 dir = vec2(cos(angle), sin(angle));
  vec2 perp = vec2(-dir.y, dir.x);
  float along = dot(uv, dir);
  float across = dot(uv, perp) - u_lineOffset;
  float wobble = fbm(vec2(along * 2.2 + rnd.y * 31.0, cycleIndex * 3.7), 4) - 0.5;
  float fibres = (fibrousFbm(vec2(along * 26.0, cycleIndex * 11.3)) - 0.5) * 0.06;
  return across - (wobble * 0.42 + fibres) * min(progress * 3.0, 1.0);
}

// The tear direction for this cycle. Shared so the gap, the taper and the glow
// all agree on which way the rip runs.
vec2 tearDir(float cycleIndex) {
  vec2 rnd = hash2(vec2(cycleIndex * 17.31, cycleIndex * 43.71));
  float angle = (rnd.x - 0.5) * 0.5;
  return vec2(cos(angle), sin(angle));
}

// How open the rip is at a point along its own length. 1 at the widest point,
// tapering to 0 at both ends.
//
// Measured along the tear axis, not in screen x. Screen x looks like the obvious
// choice for lining the opening up with the copy column, but its contours are
// vertical while the tear runs at an angle, so the taper cuts across the rip
// instead of following it and the whole thing stops reading as torn.
//
// The taper is asymmetric on purpose, and that is what keeps the right-side-only
// opening looking natural: it shuts quickly on the left so the sheet stays whole
// over the headline, and runs out slowly to the right so the rip carries off the
// edge of the frame the way a real one would. A short symmetric taper around an
// off-centre point reads as a lens or an eye, which is what it looked like.
float tearTaper(float along, float bias) {
  // bias arrives as a fraction of frame width. uv is scaled by the short side,
  // so convert it into along units to stay correct at any viewport shape.
  float biasAlong = (bias - 0.5) * u_res.x / min(u_res.x, u_res.y);
  float d = along - biasAlong;
  return d < 0.0
    ? 1.0 - smoothstep(0.0, 0.52, -d)
    : 1.0 - smoothstep(0.0, 1.15, d);
}

float tearGap(vec2 uv, float progress, float cycleIndex, float bias) {
  float along = dot(uv, tearDir(cycleIndex));
  float ragged = 0.75 + 0.5 * fibrousFbm(vec2(along * 14.0, cycleIndex * 5.1));
  // 0.26 is the study's amplitude. Widening it to 0.30 for a bigger reveal is
  // what tipped the shape from a rip toward a hole.
  return progress * 0.26 * tearTaper(along, bias) * ragged;
}

// Black paper, not cream. The values are the brand's own darks: --ks-graphite
// for the sheet, drifting toward --ks-graphite-2 in the warm patches, laid over
// the deeper --ks-lacquer ground. Cream paper is what forced a heavy scrim under
// the copy, because near-white paper and a near-black tear flip text between
// readable and invisible every cycle. Dark paper needs no scrim at all.
//
// The grain amplitudes are absolute, not proportional, and they are tuned to
// stay legible on a near-black sheet: too low and the paper reads as flat black,
// too high and it reads as video noise. Tooth is the coarse surface, fibre the
// directional grain of the stock, blotch the slow unevenness across the sheet.
vec3 paperSurface(vec2 uv, float t) {
  vec3 paperBase = vec3(0.0471, 0.0431, 0.0314);
  vec3 paperWarm = vec3(0.0824, 0.0784, 0.0627);
  float tooth = fibrousFbm(uv * 220.0) - 0.5;
  float fibre = fbm(uv * vec2(90.0, 14.0), 4) - 0.5;
  float speck = fibrousFbm(uv * 620.0) - 0.5;
  float blotch = fbm(uv * 3.4 + 4.2, 4);
  float warmPatch = smoothstep(0.35, 0.75, blotch);
  vec3 col = mix(paperBase, paperWarm, warmPatch)
           + tooth * 0.030
           + fibre * 0.018
           + speck * 0.014;
  col -= smoothstep(0.55, 0.95, fbm(uv * 1.6 + 9.1, 3)) * 0.014;
  return max(col, vec3(0.0));
}

// The light field is split in two on purpose.
//
// underGlowBase is the low-frequency part: the deep ground, the domain-warped
// nebula, and the soft glow centres. underGlowDetail is the high-frequency part:
// flowing veins and sparkles. Only the base lights the world card. The detail
// carries fine structure of its own, and laying that over a photograph made the
// card look like it had a second image floating on it, drifting at a different
// parallax rate. The full sum is still what shows when no card is loaded.
vec3 underGlowBase(vec2 uv, float t, float intensity) {
  vec3 deep = vec3(0.04, 0.01, 0.06);

  vec2 warp1 = vec2(
    fbm(uv * 2.0 + vec2(t * 0.06, t * 0.04), 4),
    fbm(uv * 2.0 + vec2(t * 0.05 + 5.2, t * 0.03 + 1.3), 4)
  );
  vec2 warp2 = vec2(
    fbm(uv * 3.0 + warp1 * 1.8 + vec2(t * 0.04 + 1.7, 0.0), 4),
    fbm(uv * 3.0 + warp1 * 1.8 + vec2(0.0, t * 0.035 + 9.2), 4)
  );
  float plasma = fbm(uv * 2.5 + warp2 * 1.5, 5);

  vec3 c1 = vec3(0.12, 0.02, 0.18);
  vec3 c2 = vec3(0.55, 0.05, 0.45);
  vec3 c3 = vec3(0.95, 0.25, 0.35);
  vec3 c4 = vec3(1.0, 0.60, 0.12);
  vec3 c5 = vec3(1.0, 0.90, 0.50);
  float p = clamp(plasma, 0.0, 1.0);
  vec3 nebula = p < 0.25 ? mix(c1, c2, p / 0.25)
    : p < 0.5 ? mix(c2, c3, (p - 0.25) / 0.25)
    : p < 0.75 ? mix(c3, c4, (p - 0.5) / 0.25)
    : mix(c4, c5, (p - 0.75) / 0.25);

  vec2 glowUV = uv + vec2(sin(t * 0.15) * 0.12, cos(t * 0.12) * 0.1);
  float g1 = exp(-dot(glowUV, glowUV) * 1.5);
  vec2 g2uv = glowUV - vec2(0.25 + sin(t * 0.1) * 0.05, -0.2);
  float g2 = exp(-dot(g2uv, g2uv) * 3.0);
  vec2 g3uv = glowUV + vec2(0.3, 0.25 + cos(t * 0.08) * 0.05);
  float g3 = exp(-dot(g3uv, g3uv) * 4.0);
  vec3 glowCenters = vec3(1.0, 0.6, 0.15) * g1 * 0.5
                   + vec3(0.75, 0.15, 0.55) * g2 * 0.4
                   + vec3(0.4, 0.1, 0.5) * g3 * 0.3;

  float pulse = sin(t * 0.9) * 0.06;

  vec3 glow = deep;
  glow += nebula * 0.7;
  glow += glowCenters;
  glow *= (1.0 + pulse) * intensity;
  return glow;
}

// Veins and sparkles. Not used over a card, only in the procedural reveal.
vec3 underGlowDetail(vec2 uv, float t, float intensity) {
  float vein = smoothstep(0.42, 0.5, fbm(uv * 5.0 + vec2(t * 0.08, 0.0), 4));
  float vein2 = smoothstep(0.45, 0.52, fbm(uv * 8.0 - vec2(0.0, t * 0.06), 3));
  vec3 veinCol = vec3(1.0, 0.45, 0.6) * vein * 0.7
               + vec3(1.0, 0.7, 0.2) * vein2 * 0.5;

  // A sparkle is a soft round point inside its cell, not the whole cell. The
  // original took floor(uv * 40) and lit the entire cell uniformly, which drew
  // hard-edged squares: invisible enough over plasma, obvious over a photo.
  vec2 sparkleUV = uv * 40.0;
  vec2 cell = floor(sparkleUV);
  float lit = step(0.985, hash(cell));
  // Jittered centre so the points do not sit on a visible grid.
  vec2 centre = 0.25 + 0.5 * hash2(cell + 7.3);
  float falloff = 1.0 - smoothstep(0.0, 0.34, length(fract(sparkleUV) - centre));
  float twinkle = 0.5 + 0.5 * sin(t * 3.0 + hash(cell) * 40.0);
  vec3 sparkleCol = mix(vec3(1.0, 0.85, 0.95), vec3(1.0, 0.95, 0.7), hash(cell + 1.0));

  return (veinCol * 0.8 + sparkleCol * lit * falloff * twinkle * 0.8) * intensity;
}

/** The full procedural field, for when there is no card to reveal. */
vec3 underGlow(vec2 uv, float t, float intensity) {
  return underGlowBase(uv, t, intensity) + underGlowDetail(uv, t, intensity);
}

// A torn edge, not a burning one.
//
// The original study lit the tear like an ember: a bright amber core, a wide
// warm bleed, and a purple far bleed, which on black paper read as scorched
// rather than ripped. Real torn stock shows its core along the cut, so the edge
// here is a thin pale fibre line barely above the sheet, plus a short and weak
// warm bleed where light from the gap catches the lifted fibres. The world in
// the tear is the bright thing on this page; the edge is not a light source.
vec3 edgeGlow(float tearDist, float gapWidth, float tearProgress, float intensity) {
  float d = max(abs(tearDist) - gapWidth * 0.5, 0.0);

  // Exposed core. Tight falloff so it stays a line rather than a halo.
  float fibre = exp(-d * 520.0);
  vec3 edge = vec3(0.20, 0.185, 0.155) * fibre;

  // Ragged fibres just off the cut, slightly cooler and much fainter.
  float frayed = exp(-d * 190.0);
  edge += vec3(0.075, 0.068, 0.058) * frayed;

  // The only warm note left, and it is short range.
  float bleed = exp(-d * 85.0);
  edge += vec3(0.055, 0.034, 0.014) * bleed;

  return edge * tearProgress * intensity;
}

// On black paper the highlight carries the curl, not the shadow: there is only
// 0.047 of headroom below the sheet before it clips to the ground, but plenty
// above. The cream values inverted this and the curl read as a flat dark band.
vec3 paperCurl(vec3 paperCol, float tearDist, float gapWidth, float tearProgress) {
  float absDist = abs(tearDist);
  float curlZone = smoothstep(gapWidth * 3.0, gapWidth * 0.5, absDist);
  float side = sign(tearDist);
  float shadow = curlZone * smoothstep(gapWidth * 2.0, gapWidth * 0.8, absDist) * 0.030;
  float highlight = curlZone * smoothstep(gapWidth * 1.5, gapWidth * 0.6, absDist) * 0.075;
  paperCol -= shadow * (0.5 + 0.5 * side) * tearProgress;
  paperCol += highlight * (0.5 - 0.5 * side) * tearProgress;
  // Light from the gap grazing the lifted edge. Kept near neutral and low: the
  // strong gold version made the curl look lit from inside the sheet.
  paperCol += vec3(0.085, 0.062, 0.035) * curlZone * tearProgress * 0.5;
  return paperCol;
}

// Cover-fit the card into the viewport, the CSS object-fit: cover equivalent,
// so a 16:9 card never stretches on a tall phone screen.
vec2 coverUV(vec2 fragUV, float imgAspect, float viewAspect) {
  vec2 uv = fragUV;
  if (viewAspect > imgAspect) {
    float s = imgAspect / viewAspect;
    uv.y = (uv.y - 0.5) * s + 0.5;
  } else {
    float s = viewAspect / imgAspect;
    uv.x = (uv.x - 0.5) * s + 0.5;
  }
  return vec2(uv.x, 1.0 - uv.y);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_res * 0.5) / min(u_res.x, u_res.y);

  // Parallax. The paper is the screen plane and stays put; everything behind it
  // drifts AGAINST the pointer, and the deeper the layer the further it drifts.
  // Move the pointer up and the world sinks, the way scenery outside a train
  // window falls behind the direction you are travelling.
  //
  // Worth stating because it is a trap: treating the pointer as an eye moving
  // past a fixed aperture gives the opposite sign, and it looks wrong. Under
  // that model the visible patch of the far layer slides one way and its
  // features appear to follow the eye. Correct on paper, backwards to look at.
  //
  // Two things beyond the sign that were also wrong here once:
  //
  //  1. Depth ordering. The world card is the deepest layer, so it shifts MORE
  //     than the glow sitting just behind the paper, not less.
  //  2. The vertical sign in texture space. u_mouse and uv are y-up, but
  //     coverUV flips v, so an offset computed in uv space has to have its y
  //     negated before it is added to a texture coordinate. Miss that and the
  //     vertical runs one way while the horizontal runs the other, which reads
  //     as the image sliding diagonally against the tear.
  //
  // pointer is the offset from the centre of the frame, in uv space.
  vec2 pointer = vec2(0.0);
  if (u_mouse.x > 0.0) {
    pointer = (u_mouse / u_res) - 0.5;
  }
  vec2 viewShift = pointer * 0.16;
  float t = u_time;
  float speed = u_tearSpeed;
  float glowInt = u_glowIntensity;

  float cycle = CYCLE_DURATION / speed;
  float cycleIndex = floor(t / cycle);
  vec2 phase = getPhase(t, speed);
  float phaseT = phase.x;
  float phaseId = phase.y;

  float tearProgress = 0.0;
  if (phaseId < 0.5) {
    tearProgress = 0.0;
  } else if (phaseId < 1.5) {
    tearProgress = easeInQuad(phaseT);
  } else if (phaseId < 2.5) {
    tearProgress = 1.0;
  } else {
    tearProgress = 1.0 - easeInOutCubic(phaseT);
  }

  float tearDist = tearLine(uv, tearProgress, cycleIndex);
  float gapWidth = tearGap(uv, tearProgress, cycleIndex, u_openBias);

  float inGap = smoothstep(gapWidth * 0.5 + 0.003, gapWidth * 0.5 - 0.003, abs(tearDist));
  inGap *= step(0.01, tearProgress);

  float separationAmount = tearProgress * 0.03;
  float side = sign(tearDist);
  if (phaseId > 1.5 && phaseId < 2.5) {
    separationAmount += sin(phaseT * PI) * 0.005;
  }
  vec2 rnd = hash2(vec2(cycleIndex * 17.31, cycleIndex * 43.71));
  float tearAngle = (rnd.x - 0.5) * 0.5;
  vec2 tearPerp = vec2(-sin(tearAngle * 0.3), cos(tearAngle * 0.3));
  vec2 paperOffset = tearPerp * side * separationAmount;

  vec3 paper = paperSurface(uv + paperOffset, t);
  paper = paperCurl(paper, tearDist, max(gapWidth, 0.01), tearProgress);

  // The light field behind the paper, and the world it falls on.
  // The glow sits just behind the paper, so it is the shallow layer and moves
  // least. uv space, so viewShift needs no sign correction here.
  vec3 lightField = underGlow(uv + viewShift * 0.45, t, glowInt);
  vec3 revealed = lightField;

  if (u_worldFade > 0.001) {
    // The world layer parallaxes less than the light field, which reads as the
    // card sitting further back than the glow.
    // The card is the deepest layer, so it takes the largest shift. The y is
    // negated because coverUV has already flipped v: without this the vertical
    // parallax runs the wrong way while the horizontal runs the right way, which
    // reads as the image sliding diagonally against the tear.
    vec2 worldShift = vec2(viewShift.x, -viewShift.y) * 1.0;
    vec2 wuv = coverUV(gl_FragCoord.xy / u_res, u_worldAspect, u_res.x / u_res.y)
             + worldShift;
    vec3 world = texture2D(u_world, clamp(wuv, 0.001, 0.999)).rgb;

    // Light the card from the low-frequency field only, sampled at the card's
    // own parallax offset. Two reasons, both learned the hard way: the detail
    // layer draws structure that reads as a second image floating on the photo,
    // and sampling the light at a different offset than the card makes that
    // structure slide across it as the pointer moves.
    vec3 cardLight = underGlowBase(wuv * 2.0 - 1.0, t, glowInt);

    // The plasma lights the card, it does not tint it. Using luminance rather
    // than color is what keeps a teal and ochre poster from turning into generic
    // magenta haze: the world has to stay recognizable as itself, since showing
    // one is the entire argument of this page. Clamped because the field is
    // additive and unbounded, and an unclamped multiplier blows it out to white.
    float lightLum = clamp(dot(cardLight, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
    vec3 litWorld = world * (0.62 + 0.62 * lightLum);
    // A trace of color survives as bloom, so the tear still reads as lit from
    // within rather than as a plain cutout.
    litWorld += cardLight * 0.07;
    revealed = mix(lightField, litWorld, u_worldFade);
  }

  // The crack still runs edge to edge, but its glow tapers with the same
  // falloff as the gap. At full strength it burns straight across the copy;
  // holding it to a quarter over the text keeps the fibre visible without
  // competing with the words.
  vec3 eGlow = edgeGlow(tearDist, max(gapWidth, 0.005), tearProgress, glowInt)
             * mix(0.25, 1.0, tearTaper(dot(uv, tearDir(cycleIndex)), u_openBias));
  vec3 col = mix(paper + eGlow, revealed, inGap);

  if (phaseId < 0.5) {
    float breathe = sin(phaseT * PI * 2.0) * 0.02 + 0.01;
    float centerGlow = exp(-dot(uv, uv) * 4.0);
    float creak = sin(phaseT * PI) * 0.003;
    col = paperSurface(uv + vec2(creak, 0.0), t);
    col += vec3(0.15, 0.06, 0.08) * centerGlow * breathe * glowInt;
  }

  if (phaseId < 0.5 && phaseT > 0.7) {
    float crackHint = easeInQuad((phaseT - 0.7) / 0.3);
    float crackLine = tearLine(uv, 0.01, cycleIndex);
    float crackVis = smoothstep(0.008, 0.0, abs(crackLine)) * crackHint * 0.3;
    // A shallow subtraction on dark paper: the cream value clipped straight to
    // the ground and read as a hard black line rather than a splitting fibre.
    col -= crackVis * 0.030;
    col += vec3(0.4, 0.15, 0.1) * crackVis * glowInt;
  }

  float vig = length(uv * vec2(0.8, 0.9));
  float vignette = (1.0 - smoothstep(0.5, 1.3, vig)) * 0.8 + 0.2;
  col *= vignette;

  // Halved from the cream original: the same amplitude over a near-black sheet
  // is a quarter of the base value and reads as sensor noise.
  col += (hash(gl_FragCoord.xy + fract(t * 43.0) * 1000.0) - 0.5) * 0.012;

  col = max(col, vec3(0.0));
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, col * vec3(1.05, 0.95, 0.9), smoothstep(0.1, 0.0, lum) * 0.3);

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * A shuffled play order for the deck, with `first` removed because it is already
 * on screen. Shuffled rather than sequential so the rotation does not walk the
 * catalog alphabetically, and so two visits do not show the same run.
 */
function buildQueue(worlds, first) {
  const rest = (worlds || []).filter(w => w.id !== first?.id);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return rest;
}

function compile(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('torn-paper: shader compile failed', gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Boot the torn paper background.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas
 * @param {{id: string, name: string, tier: string, v: string}|null} options.world
 *   The world to reveal, already chosen by the caller. Null renders the
 *   procedural glow alone.
 * @param {string} options.cardsBase URL prefix the hero card is served from.
 * @returns {boolean} false when WebGL is unavailable, so the caller can style a
 *   static fallback instead.
 */
export function initTornPaper({ canvas, world, worlds, cardsBase, rotate = true }) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return false;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const vert = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vert || !frag) return false;

  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('torn-paper: program link failed', gl.getProgramInfoLog(prog));
    return false;
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = name => gl.getUniformLocation(prog, name);
  const uTime = u('u_time');
  const uRes = u('u_res');
  const uTearSpeed = u('u_tearSpeed');
  const uGlowIntensity = u('u_glowIntensity');
  const uMouse = u('u_mouse');
  const uWorld = u('u_world');
  const uWorldFade = u('u_worldFade');
  const uWorldAspect = u('u_worldAspect');
  const uOpenBias = u('u_openBias');
  const uLineOffset = u('u_lineOffset');

  gl.uniform1f(uTearSpeed, 1.0);
  gl.uniform1f(uGlowIntensity, 1.0);
  gl.uniform1i(uWorld, 0);
  gl.uniform1f(uWorldFade, 0.0);
  gl.uniform1f(uWorldAspect, 16 / 9);
  gl.uniform1f(uOpenBias, 0.0);
  gl.uniform1f(uLineOffset, 0.0);

  // Card textures are arbitrary sizes, so no mipmaps and clamped wrapping.
  // The fade is driven by elapsed time, not a per-frame increment: a per-frame
  // ramp runs at whatever rate the display or the tab happens to give it, so it
  // finishes in a quarter second at 120Hz and never finishes at all in a
  // throttled background tab.
  let worldLoadedAt = 0;
  let worldAspect = 16 / 9;
  let texture = null;
  let currentWorld = null;
  // The decoded card waiting to be swapped in at the next cycle boundary.
  let staged = null;
  let queue = [];
  let lastCycle = -1;

  function cardUrl(w) {
    return `${cardsBase}/${w.id}-hero.webp${w.v ? `?v=${w.v}` : ''}`;
  }

  function upload(image) {
    if (!texture) {
      texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    // One texture object reused for every card, so rotating does not leak.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    worldAspect = image.naturalWidth / image.naturalHeight;
  }

  // Decode ahead of time. The swap has to be instant at the cycle boundary,
  // because the paper is only shut for the 1.5s calm phase.
  function preload(w) {
    if (!w) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => { staged = { world: w, image }; };
    image.onerror = () => {
      console.warn(`torn-paper: card failed for ${w.id}, keeping the previous reveal`);
      // Skip it and line up another, so one bad card cannot stall the rotation.
      preload(queue.shift());
    };
    image.src = cardUrl(w);
  }

  function reveal(entry) {
    upload(entry.image);
    currentWorld = entry.world;
    worldLoadedAt = performance.now();
    staged = null;
    canvas.dispatchEvent(new CustomEvent('worldrevealed', { detail: entry.world }));
  }

  if (world) {
    queue = rotate ? buildQueue(worlds, world) : [];
    preload(world);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let needsResize = true;
  let mouseX = -1;
  let mouseY = -1;
  let running = true;

  // Where across the frame the tear opens widest, as a fraction of width.
  // Wide screens put the copy in a left column, so the sheet opens right of it.
  // Below the CSS breakpoint the copy sits at the bottom instead and the tear
  // clears it vertically, so the opening returns to centre.
  const NARROW_BREAKPOINT = 820;
  function isNarrow() {
    return window.innerWidth <= NARROW_BREAKPOINT;
  }

  function openBias() {
    return isNarrow() ? 0.5 : 0.74;
  }

  // How far up the frame the rip sits, in uv units (uv is scaled by the short
  // side, so on a portrait phone the frame runs to about +/-1.05 vertically).
  //
  // Narrow screens need this because the horizontal bias has nothing to work
  // with: the copy spans the full width, so there is no side to open away from.
  // The copy is bottom-aligned there, so the rip moves into the empty upper half
  // instead. Zero on wide screens, where openBias already keeps it clear.
  //
  // Keep in step with the .pro-stage rules under the same breakpoint in pro.css:
  // if the copy stops being bottom-aligned, this offset stops being right.
  function lineOffset() {
    return isNarrow() ? 0.42 : 0.0;
  }

  function resize() {
    needsResize = false;
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(uRes, canvas.width, canvas.height);
  }

  window.addEventListener('resize', () => { needsResize = true; });
  window.addEventListener('pointermove', event => {
    mouseX = event.clientX * dpr;
    mouseY = (canvas.clientHeight - event.clientY) * dpr;
  }, { passive: true });
  window.addEventListener('pointerleave', () => { mouseX = -1; mouseY = -1; });
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  function render(now) {
    requestAnimationFrame(render);
    if (!running) return;
    if (needsResize) resize();

    const seconds = prefersReduced ? REDUCED_MOTION_TIME : now * 0.001;

    // A new world for every tear. The swap lands on the cycle boundary, which is
    // the start of the calm phase: the paper is shut for the first 1.5s of the
    // 7s cycle, so the card is exchanged while nothing is showing and the fade
    // is finished long before the sheet opens again.
    const cycle = Math.floor(seconds / CYCLE_DURATION);
    if (staged && (cycle !== lastCycle || !texture)) {
      lastCycle = cycle;
      reveal(staged);
      // Line up the next one immediately, and wrap when the deck runs out.
      if (queue.length === 0 && rotate) queue = buildQueue(worlds, currentWorld);
      preload(queue.shift());
    } else if (cycle !== lastCycle) {
      // Nothing decoded yet: hold the current card and try again next cycle.
      lastCycle = cycle;
    }

    const fade = worldLoadedAt
      ? Math.min(1, (performance.now() - worldLoadedAt) / WORLD_FADE_MS)
      : 0;

    gl.uniform1f(uTime, seconds);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uWorldFade, fade);
    gl.uniform1f(uWorldAspect, worldAspect);
    gl.uniform1f(uOpenBias, openBias());
    gl.uniform1f(uLineOffset, lineOffset());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  resize();
  requestAnimationFrame(render);
  return true;
}

/**
 * Pick the world to reveal. Random per load, unless `?world=<id>` names one,
 * which makes a specific card reproducible for a look or a bug report.
 * Exported so the page can name what it revealed.
 */
export function pickWorld(worlds) {
  if (!Array.isArray(worlds) || worlds.length === 0) return null;
  const requested = new URLSearchParams(window.location.search).get('world');
  if (requested) {
    const match = worlds.find(world => world.id === requested);
    if (match) return match;
  }
  return worlds[Math.floor(Math.random() * worlds.length)];
}
