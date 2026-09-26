/**
 * GLSL ES 3.00 sources for the digicam pipeline.
 *
 * Pipeline order (see README):
 *   source -> bright pass -> blur H -> blur V  (bloom chain, quarter res)
 *   source -> PASS A: optics + colour character + bloom + grain  -> FBO
 *   FBO    -> PASS B: JPEG simulation + vignette + output dither -> canvas
 */

export const VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const COMMON = `
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 hash32(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}
`;

/** Bright pass: isolates highlights for the bloom chain. */
export const FRAG_BRIGHT = `#version 300 es
${COMMON}
uniform sampler2D u_tex;
void main() {
  vec3 c = texture(u_tex, v_uv).rgb;
  float l = luma(c);
  float w = smoothstep(0.62, 1.0, l);
  fragColor = vec4(c * w, 1.0);
}`;

/** Separable 9 tap gaussian, direction supplied in texel units. */
export const FRAG_BLUR = `#version 300 es
${COMMON}
uniform sampler2D u_tex;
uniform vec2 u_dir;
void main() {
  vec3 sum = texture(u_tex, v_uv).rgb * 0.2270270270;
  sum += (texture(u_tex, v_uv + u_dir * 1.3846153846).rgb +
          texture(u_tex, v_uv - u_dir * 1.3846153846).rgb) * 0.3162162162;
  sum += (texture(u_tex, v_uv + u_dir * 3.2307692308).rgb +
          texture(u_tex, v_uv - u_dir * 3.2307692308).rgb) * 0.0702702703;
  fragColor = vec4(sum, 1.0);
}`;

/**
 * PASS A - lens, sensor and colour character.
 */
export const FRAG_MAIN = `#version 300 es
${COMMON}
uniform sampler2D u_tex;
uniform sampler2D u_bloom;
uniform vec2 u_texel;      // 1 / source size
uniform float u_scale;     // render width / 1280, keeps effects resolution independent
uniform float u_seed;

uniform float u_softness;
uniform float u_sharpen;
uniform float u_aberration;
uniform float u_bloom;
uniform float u_flash;
uniform float u_colorShift;
uniform float u_temperature;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_saturation;
uniform float u_fade;
uniform float u_grain;

vec3 blurSample(vec2 uv, float radius) {
  if (radius < 0.01) return texture(u_tex, uv).rgb;
  vec2 r = u_texel * radius;
  vec3 c = texture(u_tex, uv).rgb * 0.36;
  c += texture(u_tex, uv + vec2(r.x, 0.0)).rgb * 0.115;
  c += texture(u_tex, uv - vec2(r.x, 0.0)).rgb * 0.115;
  c += texture(u_tex, uv + vec2(0.0, r.y)).rgb * 0.115;
  c += texture(u_tex, uv - vec2(0.0, r.y)).rgb * 0.115;
  c += texture(u_tex, uv + r * 0.75).rgb * 0.045;
  c += texture(u_tex, uv - r * 0.75).rgb * 0.045;
  c += texture(u_tex, uv + vec2(r.x, -r.y) * 0.75).rgb * 0.045;
  c += texture(u_tex, uv + vec2(-r.x, r.y) * 0.75).rgb * 0.045;
  return c;
}

void main() {
  vec2 uv = v_uv;
  vec2 centered = uv - 0.5;
  float rad = length(centered * vec2(1.0, 1.0));

  // ---- lateral chromatic aberration (grows towards the corners) ----
  float ca = u_aberration * 0.0035 * u_scale;
  vec2 dir = centered * rad;
  float soft = u_softness * 3.2 * u_scale;

  vec3 base;
  if (ca > 0.00001) {
    base.r = blurSample(uv + dir * ca, soft).r;
    base.g = blurSample(uv, soft).g;
    base.b = blurSample(uv - dir * ca, soft).b;
  } else {
    base = blurSample(uv, soft);
  }

  // ---- in camera sharpening (unsharp mask with visible halos) ----
  if (u_sharpen > 0.001) {
    vec3 wide = blurSample(uv, (1.6 + u_softness * 2.0) * u_scale);
    vec3 hi = base - wide;
    base += hi * u_sharpen * 1.5;
  }

  vec3 c = clamp(base, 0.0, 1.5);

  // ---- flash: hot centre with fast falloff ----
  if (u_flash > 0.001) {
    float fall = 1.0 - smoothstep(0.05, 0.78, rad);
    float gain = mix(1.0, 1.0 + 0.55 * fall, u_flash);
    c *= gain;
    c *= mix(1.0, 0.62 + 0.38 * fall, u_flash * 0.85);
    // flash tubes run slightly cool and clip the near field
    c = mix(c, c * vec3(0.99, 1.0, 1.05), u_flash * 0.5);
  }

  // ---- exposure ----
  c *= pow(2.0, u_exposure * 1.1);

  // ---- white balance ----
  float t = u_temperature;
  c *= vec3(1.0 + t * 0.14, 1.0 + abs(t) * -0.012, 1.0 - t * 0.15);

  // ---- CCD colour character: channel crosstalk + non linear response ----
  float s = u_colorShift;
  if (s > 0.001) {
    mat3 xtalk = mat3(
      1.0 + 0.10 * s, -0.045 * s,     -0.020 * s,
      -0.060 * s,      1.0 + 0.05 * s, 0.045 * s,
      -0.015 * s,     -0.070 * s,      1.0 + 0.13 * s
    );
    vec3 shifted = xtalk * c;
    // channels respond with slightly different gammas, like a cheap sensor
    shifted = pow(max(shifted, 0.0), vec3(1.0 - 0.10 * s, 1.0, 1.0 + 0.09 * s));
    // shadows drift cyan-green, highlights drift warm
    float l = luma(shifted);
    vec3 shadowTint = vec3(-0.012, 0.012, 0.028) * s;
    vec3 highTint = vec3(0.030, 0.010, -0.026) * s;
    shifted += mix(shadowTint, highTint, smoothstep(0.15, 0.85, l));
    c = mix(c, shifted, 1.0);
  }

  // ---- contrast with crushed blacks and a soft clipped shoulder ----
  float k = u_contrast;
  c = (c - 0.5) * (1.0 + k * 0.55) + 0.5;
  c = max(c, 0.0);
  float crush = 0.012 + max(k, 0.0) * 0.045;
  c = max(c - crush, 0.0) / (1.0 - crush);
  // highlight shoulder: a short digital compression then a hard clip
  vec3 over = max(c - 0.86, 0.0);
  c = min(c - over * 0.4, 1.05);

  // ---- saturation ----
  float lum = luma(c);
  c = mix(vec3(lum), c, clamp(1.0 + u_saturation * 0.85, 0.0, 2.5));

  // ---- fade: lifted blacks of an 8 bit JPEG pipeline ----
  c = mix(c, c * (1.0 - 0.14 * u_fade) + 0.075 * u_fade, 1.0);

  // ---- bloom (screen blend over highlights) ----
  if (u_bloom > 0.001) {
    vec3 b = texture(u_bloom, uv).rgb;
    c = 1.0 - (1.0 - clamp(c, 0.0, 1.0)) * (1.0 - clamp(b * u_bloom * 1.25, 0.0, 1.0));
  }

  c = clamp(c, 0.0, 1.0);

  // ---- sensor noise: fine luma speckle + coarser chroma blotches ----
  if (u_grain > 0.001) {
    vec2 np = v_uv / max(u_texel.x, 0.000001) * vec2(1.0, u_texel.x / u_texel.y);
    np /= max(u_scale, 0.25);
    vec3 n = hash32(floor(np) + u_seed) - 0.5;
    vec3 nc = hash32(floor(np * 0.34) + u_seed * 1.7) - 0.5;
    float shadowWeight = 1.0 - smoothstep(0.0, 0.85, luma(c));
    float amt = u_grain * (0.35 + 0.65 * shadowWeight);
    c += (n.x) * 0.105 * amt;                      // luma noise
    c += nc * vec3(0.9, 0.7, 1.0) * 0.085 * amt;   // chroma noise
    c = clamp(c, 0.0, 1.0);
  }

  fragColor = vec4(c, 1.0);
}`;

/**
 * PASS B - JPEG simulation and vignette.
 */
export const FRAG_POST = `#version 300 es
${COMMON}
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform vec2 u_size;
uniform float u_scale;
uniform float u_jpeg;
uniform float u_vignette;

const mat3 RGB2YCC = mat3(
  0.299, -0.168736,  0.5,
  0.587, -0.331264, -0.418688,
  0.114,  0.5,      -0.081312
);
const mat3 YCC2RGB = mat3(
  1.0,      1.0,       1.0,
  0.0,     -0.344136,  1.772,
  1.402,   -0.714136,  0.0
);

vec3 sampleYcc(vec2 uv) {
  return RGB2YCC * texture(u_tex, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
}

void main() {
  vec3 ycc = sampleYcc(v_uv);
  float j = u_jpeg;

  if (j > 0.001) {
    float block = max(4.0, 8.0 * u_scale);
    vec2 px = v_uv * u_size;
    vec2 blockOrigin = floor(px / block) * block;

    // block statistics from four spread taps (cheap DC estimate)
    vec3 acc = vec3(0.0);
    acc += sampleYcc((blockOrigin + block * vec2(0.25, 0.25)) * u_texel);
    acc += sampleYcc((blockOrigin + block * vec2(0.75, 0.25)) * u_texel);
    acc += sampleYcc((blockOrigin + block * vec2(0.25, 0.75)) * u_texel);
    acc += sampleYcc((blockOrigin + block * vec2(0.75, 0.75)) * u_texel);
    vec3 dc = acc * 0.25;

    // chroma is subsampled hard and bleeds across the whole block
    float chromaMix = smoothstep(0.0, 0.7, j);
    ycc.yz = mix(ycc.yz, dc.yz, chromaMix);
    // coarse chroma quantisation -> colour banding
    float cq = 0.02 + j * 0.10;
    ycc.yz = floor(ycc.yz / cq + 0.5) * cq;

    // luma: quantise the AC part around the block DC -> blocking + banding
    float ac = ycc.x - dc.x;
    float q = 0.012 + j * j * 0.16;
    float qac = floor(ac / q + 0.5) * q;
    // ringing overshoot near hard edges
    float ring = (ac - qac) * j * 1.3;
    ycc.x = dc.x + qac + ring;

    // faint block edge seams
    vec2 f = fract(px / block);
    float seam = (smoothstep(0.0, 0.06, f.x) * smoothstep(0.0, 0.06, f.y));
    ycc.x *= mix(1.0, 0.985 + 0.015 * seam, j * 0.8);
  }

  vec3 c = clamp(YCC2RGB * ycc, 0.0, 1.0);

  // ---- vignette ----
  if (u_vignette > 0.001) {
    vec2 d = (v_uv - 0.5) * vec2(1.0, 1.0);
    float r = length(d) * 1.414;
    float v = 1.0 - u_vignette * 0.75 * smoothstep(0.38, 1.02, r);
    c *= v;
  }

  // ---- output dither, hides 8 bit banding ----
  c += (hash12(v_uv * u_size) - 0.5) * (1.0 / 255.0);

  fragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
