// 服务端天气获取（Open-Meteo，无需密钥）+ 智能出行建议。在 Cloudflare Worker 内于
// 请求时调用，模块级缓存 30 分钟以降低外部请求频率。不可用时优雅降级（返回 null）。

export interface WeatherNow {
  temperature: number;
  apparent: number;
  humidity: number;
  windSpeed: number;
  precip: number;
  code: number;
  time: string;
}

export interface WeatherDay {
  date: string;
  code: number;
  tMax: number;
  tMin: number;
  precipProb: number;
  uvMax: number;
}

export interface WeatherData {
  now: WeatherNow;
  days: WeatherDay[];
  alerts: string[];
  fetchedAt: number;
}

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const ALERTS_ENDPOINT = 'https://alerts.open-meteo.com/v1/alerts';

function buildUrl(lat: number, lon: number): string {
  const p = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max',
    timezone: 'Asia/Kolkata',
    forecast_days: '7',
    wind_speed_unit: 'kmh'
  });
  return `${ENDPOINT}?${p.toString()}`;
}

async function getAlerts(lat: number, lon: number): Promise<string[]> {
  try {
    const r = await fetch(`${ALERTS_ENDPOINT}?latitude=${lat}&longitude=${lon}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const j = await r.json();
    const feats = (j.features ?? []) as Array<{ properties?: { event?: string } }>;
    const out: string[] = [];
    for (const f of feats) {
      const ev = f?.properties?.event;
      if (ev) out.push(`【⚠️气象预警】${ev} 已发布，建议调整行程，尽量不要前往山区、河谷等危险区域，密切关注天气变化。`);
    }
    return out;
  } catch {
    return [];
  }
}

let cache: { data: WeatherData; ts: number } | null = null;
const TTL = 30 * 60 * 1000;

export async function getWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL) return cache.data;
  try {
    const [res, alerts] = await Promise.all([fetch(buildUrl(lat, lon), { signal: AbortSignal.timeout(5000) }), getAlerts(lat, lon)]);
    if (!res.ok) throw new Error('weather_http_' + res.status);
    const j = await res.json();
    const c = j.current;
    const days: WeatherDay[] = (j.daily.time as string[]).map((d: string, i: number) => ({
      date: d,
      code: Number(j.daily.weather_code[i]),
      tMax: Number(j.daily.temperature_2m_max[i]),
      tMin: Number(j.daily.temperature_2m_min[i]),
      precipProb: Number(j.daily.precipitation_probability_max[i] ?? 0),
      uvMax: Number(j.daily.uv_index_max[i] ?? 0)
    }));
    const data: WeatherData = {
      now: {
        temperature: Number(c.temperature_2m),
        apparent: Number(c.apparent_temperature),
        humidity: Number(c.relative_humidity_2m),
        windSpeed: Number(c.wind_speed_10m),
        precip: Number(c.precipitation),
        code: Number(c.weather_code),
        time: String(c.time)
      },
      days,
      alerts,
      fetchedAt: now
    };
    cache = { data, ts: now };
    return data;
  } catch {
    return cache?.data ?? null;
  }
}

// WMO 天气代码 → 本地化描述（马拉雅拉姆语为主，含图标）。
const WMO: Record<number, { ml: string; icon: string }> = {
  0: { ml: 'വ്യക്തം', icon: '☀️' },
  1: { ml: 'ഭാഗികമായി വ്യക്തം', icon: '🌤️' },
  2: { ml: 'പാതി മേഘാവൃതം', icon: '⛅' },
  3: { ml: 'മേഘാവൃതം', icon: '☁️' },
  45: { ml: 'മൂടൽമഞ്ഞ്', icon: '🌫️' },
  48: { ml: 'മഞ്ഞ്', icon: '🌫️' },
  51: { ml: 'നേരിയ മഞ്ഞുവെള്ളം', icon: '🌦️' },
  53: { ml: 'മഞ്ഞുവെള്ളം', icon: '🌦️' },
  55: { ml: 'കനത്ത മഞ്ഞുവെള്ളം', icon: '🌧️' },
  56: { ml: 'ഐസ് മഞ്ഞുവെള്ളം', icon: '🌧️' },
  57: { ml: 'കനത്ത ഐസ് മഞ്ഞുവെള്ളം', icon: '🌧️' },
  61: { ml: 'നേരിയ മഴ', icon: '🌦️' },
  63: { ml: 'മഴ', icon: '🌧️' },
  65: { ml: 'കനത്ത മഴ', icon: '🌧️' },
  66: { ml: 'ഐസ് മഴ', icon: '🌧️' },
  67: { ml: 'കനത്ത ഐസ് മഴ', icon: '🌧️' },
  71: { ml: 'നേരിയ മഞ്ഞ്', icon: '🌨️' },
  73: { ml: 'മഞ്ഞ്', icon: '🌨️' },
  75: { ml: 'കനത്ത മഞ്ഞ്', icon: '❄️' },
  77: { ml: 'മഞ്ഞ് കണങ്ങൾ', icon: '🌨️' },
  80: { ml: 'മഴ ഒഴുക്കുകൾ', icon: '🌦️' },
  81: { ml: 'മഴ ഒഴുക്കുകൾ', icon: '🌧️' },
  82: { ml: 'കനത്ത മഴ ഒഴുക്ക്', icon: '⛈️' },
  85: { ml: 'മഞ്ഞ് ഒഴുക്കുകൾ', icon: '🌨️' },
  86: { ml: 'കനത്ത മഞ്ഞ് ഒഴുക്ക്', icon: '❄️' },
  95: { ml: 'ഇടിമിന്നൽ മഴ', icon: '⛈️' },
  96: { ml: 'ഐസ് കല്ലുള്ള ഇടിമിന്നൽ മഴ', icon: '⛈️' },
  99: { ml: 'കനത്ത ഐസ് കല്ലുള്ള ഇടിമിന്നൽ മഴ', icon: '⛈️' }
};

export function describeCode(code: number): { ml: string; icon: string } {
  return WMO[code] ?? { ml: 'മറ്റത്', icon: '🌡️' };
}

// —— 风级与紫外线标签（面向游客，口语化） ——
function beaufort(kmh: number): number {
  const t = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  let l = 0;
  for (let i = 0; i < t.length; i++) if (kmh > t[i]) l = i + 1;
  return l;
}

export function windLevelLabel(kmh: number): string {
  const l = beaufort(kmh);
  return l >= 7 ? '大风' : l >= 5 ? '风力偏大' : l >= 3 ? '和风' : '微风';
}

export function uvIndexLabel(uv: number): string {
  return uv >= 5 ? '强' : uv >= 3 ? '中等' : '弱';
}

function rainLevel(code: number): 'none' | 'light' | 'moderate' | 'heavy' | 'thunder' {
  if (code === 95 || code === 96 || code === 99) return 'thunder';
  if (code === 65 || code === 82) return 'heavy';
  if (code === 63 || code === 81) return 'moderate';
  if (code === 51 || code === 53 || code === 55 || code === 61 || code === 80) return 'light';
  return 'none';
}

function isFog(code: number): boolean {
  return code === 45 || code === 48;
}

export interface Advice {
  travel: string[];
  play: string[];
  items: string[];
  risk: string[];
}

// 基于天气数据直接输出游客可执行的建议（多选、条件触发、不满足则隐藏）。
// 文案面向普通游客，避免气象术语；地理情境按山地景点（Munnar / 西高止山脉）优化。
export function buildAdvice(w: WeatherData): Advice {
  const travel: string[] = [];
  const play: string[] = [];
  const items: string[] = [];
  const risk: string[] = [];

  const now = w.now;
  const today = w.days[0];
  const code = now.code;
  const rain = rainLevel(code);
  const fog = isFog(code);
  const wind = beaufort(now.windSpeed);
  const uv = today.uvMax;
  const tMax = today.tMax;
  const tMin = today.tMin;
  const diff = tMax - tMin;
  const precip = today.precipProb;

  // 官方气象预警（置顶红色）
  for (const a of w.alerts) risk.push(a);

  // 降水概率（当前未下雨时）
  if (precip >= 60 && rain === 'none' && !fog) {
    travel.push(`今日降水概率约 ${precip}%，大概率会下雨，尽量携带雨具`);
    play.push('户外登山、游船行程建议留弹性，关注临近预报');
    items.push('雨伞 / 雨衣');
  }

  // 降雨强度
  if (rain === 'light') {
    travel.push('有小雨，路面与台阶湿滑，走路注意防滑');
    play.push('露天项目体验较差，拍照请注意器材防雨');
    items.push('折叠伞');
  } else if (rain === 'moderate' || rain === 'heavy') {
    risk.push('降雨较强，山区谨防山洪与滑坡，避开山谷、低洼与溪流地带；湖面游船可能停运');
    play.push('不建议长时间户外游玩，优先室内展馆或茶园休息');
    items.push('雨衣（风大时不建议长柄伞）');
  } else if (rain === 'thunder') {
    risk.push('谨防雷电：不要登山、不要在树下或空旷高处避雨，水上项目大概率关闭');
    play.push('暂停水上与户外高空项目，及时进入室内');
  }

  // 高温
  if (tMax >= 32) {
    travel.push('气温较高，尽量避开正午（11:00–15:00）外出');
    play.push('缩短正午户外时长，多停留阴凉与室内');
    items.push('防晒、充足饮用水、防暑用品');
  }

  // 紫外线
  if (uv >= 5) {
    travel.push('紫外线较强，注意防晒');
    items.push('防晒霜、墨镜、遮阳帽');
  }

  // 低温 / 昼夜温差
  if (diff > 8) {
    travel.push(`昼夜温差大（约 ${Math.round(diff)}℃），建议备一件外套方便增减`);
    items.push('薄外套');
  }
  if (tMax <= 10) {
    travel.push('气温偏低，注意保暖防寒');
    items.push('厚外套、围巾');
  }

  // 风力
  if (wind >= 7) {
    risk.push('大风天气，远离广告牌与山体边坡，湖面项目大概率关闭');
    play.push('户外水上与高地项目暂停，注意防风保暖');
  } else if (wind >= 5) {
    travel.push(`风力偏大（${wind} 级），注意防风`);
    play.push('山顶与湖面游船、部分露天项目可能停航停运');
    items.push('帽子易吹落，不建议穿宽松长裙');
  }

  // 晴 / 阴
  if (code === 0 || code === 1) {
    travel.push('天气晴好，适合户外游览');
    play.push('适合看日出、云海与远山风景');
    items.push('记得防晒');
  } else if (code === 2 || code === 3) {
    travel.push('光线柔和，很适合拍照');
    play.push('无暴晒，适合长时间户外漫步');
  }

  // 雾
  if (fog) {
    risk.push('能见度较差，山区道路谨慎驾驶，观景（云海/远景）可能受限');
    play.push('不适合远距离观景，注意行车安全');
    items.push('如需长时间户外可备口罩');
  }

  return { travel, play, items, risk };
}
