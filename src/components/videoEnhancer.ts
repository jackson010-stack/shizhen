/**
 * 浏览器端画质增强渲染器。
 *
 * 片元着色器移植自 MIT 协议的 redphx/better-xcloud（src/modules/player/webgl2/shaders/clarity-boost.fs），
 * 内含 USM 反锐化掩模与 AMD FidelityFX CAS 两种锐化算法。
 * 与原项目的差异：分片着色器提升到 highp，并对全黑像素的除零做了保护。
 */

export type Fit = 'contain' | 'cover' | 'fill';

export type EnhancePresetId = 'off' | 'light' | 'standard' | 'strong';

export interface EnhanceParams {
  /** 1 = USM 反锐化掩模，2 = AMD FidelityFX CAS */
  filterId: 1 | 2;
  /** CAS 质量档：8 抽样而非 4 抽样 */
  qualityMode: boolean;
  sharpen: number;
  contrast: number;
  saturation: number;
  brightness: number;
}

export interface EnhancePreset {
  id: EnhancePresetId;
  label: string;
  hint: string;
  params: EnhanceParams;
}

export const ENHANCE_PRESETS: EnhancePreset[] = [
  {
    id: 'off',
    label: '关闭',
    hint: '原始画面',
    params: { filterId: 2, qualityMode: false, sharpen: 0, contrast: 1, saturation: 1, brightness: 1 },
  },
  {
    id: 'light',
    label: '轻量',
    hint: 'CSS 锐化',
    params: { filterId: 1, qualityMode: false, sharpen: 0.9, contrast: 1.04, saturation: 1.08, brightness: 1.02 },
  },
  {
    id: 'standard',
    label: '标准',
    hint: 'WebGL · USM',
    params: { filterId: 1, qualityMode: false, sharpen: 1.8, contrast: 1.04, saturation: 1.08, brightness: 1.02 },
  },
  {
    id: 'strong',
    label: '增强',
    hint: 'WebGL · CAS',
    params: { filterId: 2, qualityMode: true, sharpen: 1.3, contrast: 1.05, saturation: 1.1, brightness: 1.02 },
  },
];

export function enhanceLabel(id: EnhancePresetId) {
  return ENHANCE_PRESETS.find((p) => p.id === id)?.label ?? '关闭';
}

export function presetParams(id: EnhancePresetId): EnhanceParams {
  return ENHANCE_PRESETS.find((p) => p.id === id)?.params ?? ENHANCE_PRESETS[0].params;
}

const VERT_SRC = `#version 300 es
layout(location = 0) in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform sampler2D data;
uniform vec2 iResolution;

const int FILTER_UNSHARP_MASKING = 1;
const int FILTER_CAS = 2;

// constrast = 0.8
const float CAS_CONTRAST_PEAK = 0.8 * -3.0 + 8.0;

// Luminosity factor: https://www.w3.org/TR/AERT/#color-contrast
const vec3 LUMINOSITY_FACTOR = vec3(0.299, 0.587, 0.114);

uniform int filterId;
uniform bool qualityMode;
uniform float sharpenFactor;
uniform float brightness;
uniform float contrast;
uniform float saturation;

out vec4 fragColor;

vec3 clarityBoost(sampler2D tex, vec2 coord, vec3 e) {
  vec2 texelSize = 1.0 / iResolution.xy;

  // 3x3 邻域，e 为当前像素
  // a b c
  // d e f
  // g h i
  vec3 b = texture(tex, coord + texelSize * vec2(0, 1)).rgb;
  vec3 d = texture(tex, coord + texelSize * vec2(-1, 0)).rgb;
  vec3 f = texture(tex, coord + texelSize * vec2(1, 0)).rgb;
  vec3 h = texture(tex, coord + texelSize * vec2(0, -1)).rgb;

  vec3 a;
  vec3 c;
  vec3 g;
  vec3 i;

  if (filterId == FILTER_UNSHARP_MASKING || qualityMode) {
    a = texture(tex, coord + texelSize * vec2(-1, 1)).rgb;
    c = texture(tex, coord + texelSize * vec2(1, 1)).rgb;
    g = texture(tex, coord + texelSize * vec2(-1, -1)).rgb;
    i = texture(tex, coord + texelSize * vec2(1, -1)).rgb;
  }

  // USM
  if (filterId == FILTER_UNSHARP_MASKING) {
    vec3 gaussianBlur = (a + c + g + i) * 1.0 + (b + d + f + h) * 2.0 + e * 4.0;
    gaussianBlur /= 16.0;
    return e + (e - gaussianBlur) * sharpenFactor / 3.0;
  }

  // CAS：十字邻域的软最小/最大值
  vec3 minRgb = min(min(min(d, e), min(f, b)), h);
  vec3 maxRgb = max(max(max(d, e), max(f, b)), h);

  if (qualityMode) {
    minRgb += min(min(a, c), min(g, i));
    maxRgb += max(max(a, c), max(g, i));
  }

  // 平滑最小距离除以平滑最大，全黑像素做除零保护
  vec3 reciprocalMaxRgb = 1.0 / max(maxRgb, vec3(1e-5));
  vec3 amplifyRgb = clamp(min(minRgb, 2.0 - maxRgb) * reciprocalMaxRgb, 0.0, 1.0);

  amplifyRgb = inversesqrt(amplifyRgb);

  vec3 weightRgb = -(1.0 / (amplifyRgb * CAS_CONTRAST_PEAK));
  vec3 reciprocalWeightRgb = 1.0 / (4.0 * weightRgb + 1.0);

  //     0 w 0
  //     w 1 w
  //     0 w 0
  vec3 window = b + d + f + h;
  vec3 outColor = clamp((window * weightRgb + e) * reciprocalWeightRgb, 0.0, 1.0);

  return mix(e, outColor, sharpenFactor / 2.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec3 color = texture(data, uv).rgb;

  if (sharpenFactor > 0.0) {
    color = clarityBoost(data, uv, color);
  }

  color = mix(vec3(dot(color, LUMINOSITY_FACTOR)), color, saturation);
  color = contrast * (color - 0.5) + 0.5;
  color = brightness * color;

  fragColor = vec4(color, 1.0);
}`;

/** 视频是否可被画布读取（未被跨域污染） */
export function isOriginClean(video: HTMLVideoElement): boolean {
  if (!video.videoWidth || !video.videoHeight) return false;
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(video, 0, 0, 1, 1);
    // 画布被污染时 drawImage 不报错，只有读取像素才会抛 SecurityError
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

export interface EnhancerHandle {
  canvas: HTMLCanvasElement;
  applyParams(p: EnhanceParams): void;
  setFit(fit: Fit): void;
  destroy(): void;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[enhancer] shader error:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function createEnhancer(
  video: HTMLVideoElement,
  container: HTMLElement,
  fit: Fit,
  params: EnhanceParams,
  onFail?: (err: unknown) => void,
): EnhancerHandle | null {
  // 每个实例使用独立画布：canvas 只能绑定一个上下文，销毁后再复用会拿到已丢失的上下文
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  video.insertAdjacentElement('afterend', canvas);

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    desynchronized: true,
    // 暂停时画面要留在画布上，否则会被合成器清空
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  }) as WebGL2RenderingContext | null;
  if (!gl) {
    canvas.remove();
    return null;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) {
    canvas.remove();
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    canvas.remove();
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[enhancer] link error:', gl.getProgramInfoLog(program));
    canvas.remove();
    return null;
  }
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // 覆盖整个视口的三角形
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, 'data'), 0);

  const uRes = gl.getUniformLocation(program, 'iResolution');
  const uFilter = gl.getUniformLocation(program, 'filterId');
  const uQuality = gl.getUniformLocation(program, 'qualityMode');
  const uSharpen = gl.getUniformLocation(program, 'sharpenFactor');
  const uBright = gl.getUniformLocation(program, 'brightness');
  const uContrast = gl.getUniformLocation(program, 'contrast');
  const uSat = gl.getUniformLocation(program, 'saturation');

  const applyUniforms = (p: EnhanceParams) => {
    gl.useProgram(program);
    gl.uniform1i(uFilter, p.filterId);
    gl.uniform1i(uQuality, p.qualityMode ? 1 : 0);
    gl.uniform1f(uSharpen, p.sharpen);
    gl.uniform1f(uBright, p.brightness);
    gl.uniform1f(uContrast, p.contrast);
    gl.uniform1f(uSat, p.saturation);
  };
  // uniform 默认值是 0，先给中性值，否则首帧会被乘成纯黑
  applyUniforms({ filterId: 2, qualityMode: false, sharpen: 0, contrast: 1, saturation: 1, brightness: 1 });

  let currentFit = fit;
  let destroyed = false;
  let frameHandle = 0;
  let rafHandle = 0;

  const layout = () => {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!cw || !ch || !vw || !vh) return;

    let dw = cw;
    let dh = ch;
    if (currentFit !== 'fill') {
      const scale =
        currentFit === 'cover' ? Math.max(cw / vw, ch / vh) : Math.min(cw / vw, ch / vh);
      dw = vw * scale;
      dh = vh * scale;
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(dw * dpr));
    const h = Math.max(1, Math.round(dh * dpr));
    if (canvas.width === w && canvas.height === h && canvas.style.width) return;

    canvas.style.width = `${Math.round(dw)}px`;
    canvas.style.height = `${Math.round(dh)}px`;
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  };

  const draw = () => {
    if (destroyed) return false;
    if (video.readyState >= 2 && video.videoWidth > 0) {
      layout();
      try {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } catch (e) {
        // 视频跨域污染，需要以 CORS 模式重新加载
        console.warn('[enhancer] texture upload failed:', e);
        destroyed = true;
        canvas.classList.remove('on');
        onFail?.(e);
        return false;
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    return true;
  };

  const schedule = () => {
    if (destroyed) return;
    const rvfc = (
      video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
        cancelVideoFrameCallback?: (h: number) => void;
      }
    ).requestVideoFrameCallback;
    if (typeof rvfc === 'function') {
      frameHandle = video.requestVideoFrameCallback!(() => {
        draw();
        schedule();
      });
    } else {
      rafHandle = requestAnimationFrame(() => {
        draw();
        schedule();
      });
    }
  };

  const onMeta = () => layout();
  const onPaint = () => draw();
  video.addEventListener('loadedmetadata', onMeta);
  video.addEventListener('resize', onMeta);
  // 暂停时不会再有新帧回调，需要主动重绘
  video.addEventListener('loadeddata', onPaint);
  video.addEventListener('seeked', onPaint);
  video.addEventListener('pause', onPaint);
  video.addEventListener('play', onPaint);

  const ro = new ResizeObserver(() => layout());
  ro.observe(container);
  layout();
  applyUniforms(params);
  canvas.classList.add('on');
  if (!draw()) {
    // 首帧就读取失败：像素根本拿不到，直接放弃这次渲染
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove();
    return null;
  }
  schedule();

  return {
    canvas,
    applyParams(p) {
      applyUniforms(p);
      // 暂停时不会自动出新帧，参数变化后必须主动重绘
      draw();
    },
    setFit(next) {
      currentFit = next;
      layout();
      draw();
    },
    destroy() {
      destroyed = true;
      const rvfc = video as HTMLVideoElement & { cancelVideoFrameCallback?: (h: number) => void };
      if (frameHandle && rvfc.cancelVideoFrameCallback) rvfc.cancelVideoFrameCallback(frameHandle);
      if (rafHandle) cancelAnimationFrame(rafHandle);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('resize', onMeta);
      video.removeEventListener('loadeddata', onPaint);
      video.removeEventListener('seeked', onPaint);
      video.removeEventListener('pause', onPaint);
      video.removeEventListener('play', onPaint);
      ro.disconnect();
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };
}
