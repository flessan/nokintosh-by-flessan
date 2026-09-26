import { FRAG_BLUR, FRAG_BRIGHT, FRAG_MAIN, FRAG_POST, VERT } from "./shaders";
import type { EffectParams } from "./types";

interface Target {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  width: number;
  height: number;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("shader compile failed: " + log);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, fragSrc: string): WebGLProgram {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "a_pos");
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error("program link failed: " + log);
  }
  return p;
}

/** WebGL2 implementation of the digicam pipeline. */
export class GLRenderer {
  private gl: WebGL2RenderingContext;
  private progBright: WebGLProgram;
  private progBlur: WebGLProgram;
  private progMain: WebGLProgram;
  private progPost: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private srcTex: WebGLTexture;
  private main: Target | null = null;
  private bloomA: Target | null = null;
  private bloomB: Target | null = null;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  readonly kind = "webgl2" as const;
  readonly canvas: HTMLCanvasElement;
  srcWidth = 0;
  srcHeight = 0;

  private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.progBright = link(gl, FRAG_BRIGHT);
    this.progBlur = link(gl, FRAG_BLUR);
    this.progMain = link(gl, FRAG_MAIN);
    this.progPost = link(gl, FRAG_POST);

    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.vao = vao;

    this.srcTex = this.makeTexture();
  }

  static create(canvas: HTMLCanvasElement): GLRenderer | null {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (!gl) return null;
    try {
      return new GLRenderer(canvas, gl);
    } catch {
      return null;
    }
  }

  get maxTextureSize(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  private loc(prog: WebGLProgram, name: string): WebGLUniformLocation | null {
    let m = this.uniforms.get(prog);
    if (!m) {
      m = new Map();
      this.uniforms.set(prog, m);
    }
    if (!m.has(name)) m.set(name, this.gl.getUniformLocation(prog, name));
    return m.get(name)!;
  }

  private makeTexture(): WebGLTexture {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  private makeTarget(width: number, height: number): Target {
    const gl = this.gl;
    const tex = this.makeTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fbo, tex, width, height };
  }

  private freeTarget(t: Target | null) {
    if (!t) return;
    this.gl.deleteFramebuffer(t.fbo);
    this.gl.deleteTexture(t.tex);
  }

  /** Upload a decoded image. Only needs to run when the photo changes. */
  setSource(source: TexImageSource, width: number, height: number) {
    const gl = this.gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    this.srcWidth = width;
    this.srcHeight = height;
  }

  /** Set the output resolution (canvas + intermediate targets). */
  resize(width: number, height: number) {
    width = Math.max(1, Math.round(width));
    height = Math.max(1, Math.round(height));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    if (!this.main || this.main.width !== width || this.main.height !== height) {
      this.freeTarget(this.main);
      this.freeTarget(this.bloomA);
      this.freeTarget(this.bloomB);
      this.main = this.makeTarget(width, height);
      const bw = Math.max(1, Math.round(width / 4));
      const bh = Math.max(1, Math.round(height / 4));
      this.bloomA = this.makeTarget(bw, bh);
      this.bloomB = this.makeTarget(bw, bh);
    }
  }

  private draw(prog: WebGLProgram, target: Target | null) {
    const gl = this.gl;
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.viewport(0, 0, target.width, target.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    gl.useProgram(prog);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  private bind(unit: number, tex: WebGLTexture, prog: WebGLProgram, name: string) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.loc(prog, name), unit);
  }

  render(p: EffectParams) {
    const gl = this.gl;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!this.main || !this.bloomA || !this.bloomB) return;
    const scale = Math.max(0.25, w / 1280);

    // --- bloom chain (quarter resolution) ---
    if (p.bloom > 0.001) {
      gl.useProgram(this.progBright);
      this.bind(0, this.srcTex, this.progBright, "u_tex");
      this.draw(this.progBright, this.bloomA);

      const radius = 1.0;
      gl.useProgram(this.progBlur);
      this.bind(0, this.bloomA.tex, this.progBlur, "u_tex");
      gl.uniform2f(this.loc(this.progBlur, "u_dir"), radius / this.bloomA.width, 0);
      this.draw(this.progBlur, this.bloomB);

      this.bind(0, this.bloomB.tex, this.progBlur, "u_tex");
      gl.uniform2f(this.loc(this.progBlur, "u_dir"), 0, radius / this.bloomA.height);
      this.draw(this.progBlur, this.bloomA);
    }

    // --- pass A: optics, colour, grain ---
    const pm = this.progMain;
    gl.useProgram(pm);
    this.bind(0, this.srcTex, pm, "u_tex");
    this.bind(1, this.bloomA.tex, pm, "u_bloomTex");
    gl.uniform2f(this.loc(pm, "u_texel"), 1 / w, 1 / h);
    gl.uniform1f(this.loc(pm, "u_scale"), scale);
    gl.uniform1f(this.loc(pm, "u_seed"), 11.37);
    gl.uniform1f(this.loc(pm, "u_softness"), p.softness);
    gl.uniform1f(this.loc(pm, "u_sharpen"), p.sharpen);
    gl.uniform1f(this.loc(pm, "u_aberration"), p.aberration);
    gl.uniform1f(this.loc(pm, "u_bloom"), p.bloom);
    gl.uniform1f(this.loc(pm, "u_flash"), p.flash);
    gl.uniform1f(this.loc(pm, "u_colorShift"), p.colorShift);
    gl.uniform1f(this.loc(pm, "u_temperature"), p.temperature);
    gl.uniform1f(this.loc(pm, "u_exposure"), p.exposure);
    gl.uniform1f(this.loc(pm, "u_contrast"), p.contrast);
    gl.uniform1f(this.loc(pm, "u_saturation"), p.saturation);
    gl.uniform1f(this.loc(pm, "u_fade"), p.fade);
    gl.uniform1f(this.loc(pm, "u_grain"), p.grain);
    this.draw(pm, this.main);

    // --- pass B: JPEG simulation + vignette -> canvas ---
    const pp = this.progPost;
    gl.useProgram(pp);
    this.bind(0, this.main.tex, pp, "u_tex");
    gl.uniform2f(this.loc(pp, "u_texel"), 1 / w, 1 / h);
    gl.uniform2f(this.loc(pp, "u_size"), w, h);
    gl.uniform1f(this.loc(pp, "u_scale"), scale);
    gl.uniform1f(this.loc(pp, "u_jpeg"), p.jpeg);
    gl.uniform1f(this.loc(pp, "u_vignette"), p.vignette);
    this.draw(pp, null);
    gl.flush();
  }

  dispose() {
    const gl = this.gl;
    this.freeTarget(this.main);
    this.freeTarget(this.bloomA);
    this.freeTarget(this.bloomB);
    gl.deleteTexture(this.srcTex);
    gl.deleteProgram(this.progBright);
    gl.deleteProgram(this.progBlur);
    gl.deleteProgram(this.progMain);
    gl.deleteProgram(this.progPost);
    gl.deleteVertexArray(this.vao);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
