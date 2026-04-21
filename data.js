// ============================================================
//  策划组荣誉系统 · 数据源
//  —— 所有策划 & 荣誉数据通过后端 API 加载，支持管理员编辑
// ============================================================

// ========= 品质定义 =========
export const QUALITY = {
  legend:  { name: '传说', color: '#f5c242', border: '#ff4d4d', score: 100 },
  epic:    { name: '史诗', color: '#b266ff', border: '#b266ff', score: 60 },
  rare:    { name: '稀有', color: '#4da6ff', border: '#4da6ff', score: 30 },
  common:  { name: '普通', color: '#9ca3af', border: '#9ca3af', score: 10 }
};

// ========= 荣誉分类 =========
export const CATEGORY = {
  design:      '设计奖',
  popularity:  '人气奖',
  team:        '团队奖',
  achievement: '成就',
  innovation:  '创新奖'
};

// ========= 策划列表（运行时从后端加载） =========
export const people = [];

// ========= 登录用户 =========
export const currentUser = {
  // 企业身份（/tauth/info）
  engName: '',
  chnName: '',
  dept: '',
  role: '',
  // 账号体系
  username: '',
  accountRole: '',     // 'admin' | 'user' | ''
  token: '',
  // 关联的策划档案 id
  personId: null,
  isLoggedIn: false    // 账号登录
};

// ========= 工具函数 =========
function calcScore(honors) {
  return honors.reduce((s, h) => s + (QUALITY[h.quality]?.score || 0), 0);
}

export function getPersonById(id) {
  return people.find(p => p.id === Number(id));
}

export function isSelf(personId) {
  return currentUser.isLoggedIn && currentUser.personId === Number(personId);
}

export function isAdmin() {
  return currentUser.isLoggedIn && currentUser.accountRole === 'admin';
}

// ========= 本地 Token 持久化 =========
const TOKEN_KEY = 'wz_auth_token_v1';
function getStoredToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}
function setStoredToken(tk) {
  try {
    if (tk) localStorage.setItem(TOKEN_KEY, tk);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

// ========= 通用请求 =========
async function apiJson(url, options = {}) {
  const opt = Object.assign({ headers: {} }, options);
  opt.headers = Object.assign({ 'Accept': 'application/json' }, opt.headers || {});
  if (currentUser.token) {
    opt.headers['Authorization'] = 'Bearer ' + currentUser.token;
  }
  if (opt.body && typeof opt.body !== 'string') {
    opt.body = JSON.stringify(opt.body);
    opt.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, Object.assign({ cache: 'no-store' }, opt));
  const text = await res.text();
  let data = null;
  if (text && !/^\s*</.test(text)) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || (/<title>([^<]+)<\/title>/i.test(text) ? RegExp.$1 : '') || ('请求失败: ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ========= 账号：登录 / 登出 / 改密 / 获取自身 =========
export async function apiLogin(username, password) {
  // 优先 POST；失败回退 GET（绕网关）
  let data = null;
  try {
    data = await apiJson('/api/auth/login', { method: 'POST', body: { username, password } });
  } catch (e) {
    if (e.status === 405 || e.status === 404) {
      const q = new URLSearchParams({ username, password }).toString();
      data = await apiJson('/hof/auth/login?' + q, { method: 'GET' });
    } else {
      throw e;
    }
  }
  if (!data || !data.token) throw new Error('登录返回异常');
  currentUser.username = data.username || username;
  currentUser.accountRole = data.role || 'user';
  currentUser.chnName = data.chnName || currentUser.chnName || '';
  currentUser.dept = data.dept || currentUser.dept || '';
  currentUser.role = data.positionName || currentUser.role || '';
  currentUser.token = data.token;
  currentUser.isLoggedIn = true;
  setStoredToken(data.token);
  matchCurrentPerson();
  return data;
}

export async function apiLogout() {
  try { await apiJson('/api/auth/logout', { method: 'POST' }); } catch {}
  currentUser.username = '';
  currentUser.accountRole = '';
  currentUser.token = '';
  currentUser.isLoggedIn = false;
  currentUser.personId = null;
  setStoredToken('');
}

export async function apiChangePassword(oldPwd, newPwd) {
  try {
    await apiJson('/api/auth/change-password', {
      method: 'POST',
      body: { oldPassword: oldPwd, newPassword: newPwd }
    });
  } catch (e) {
    if (e.status === 405 || e.status === 404) {
      const q = new URLSearchParams({ oldPassword: oldPwd, newPassword: newPwd, token: currentUser.token || '' }).toString();
      await apiJson('/hof/auth/change-password?' + q, { method: 'GET' });
    } else {
      throw e;
    }
  }
  // 修改密码后后端会清理 session，要求重新登录
  currentUser.token = '';
  currentUser.isLoggedIn = false;
  currentUser.personId = null;
  setStoredToken('');
}

async function apiFetchMe() {
  if (!currentUser.token) return null;
  try {
    const me = await apiJson('/api/auth/me');
    if (me && me.username) {
      currentUser.username = me.username;
      currentUser.accountRole = me.role || 'user';
      currentUser.chnName = me.chnName || currentUser.chnName || '';
      currentUser.dept = me.dept || currentUser.dept || '';
      currentUser.role = me.positionName || currentUser.role || '';
      currentUser.isLoggedIn = true;
      return me;
    }
  } catch (e) {
    if (e.status === 401) {
      currentUser.token = '';
      currentUser.isLoggedIn = false;
      setStoredToken('');
    }
  }
  return null;
}

// ========= 企业网络自动登录（/tauth/info）=========
export async function loadCurrentUser() {
  // 先尝试本地 token
  const tk = getStoredToken();
  if (tk) {
    currentUser.token = tk;
    await apiFetchMe();
  }

  // 再尝试拉取企业员工信息（作为个人身份/头像用）
  try {
    const res = await fetch('/ts:auth/tauth/info.ashx', { credentials: 'include' });
    if (res.ok) {
      const info = await res.json();
      currentUser.engName = info.EngName || currentUser.engName || '';
      if (!currentUser.chnName) currentUser.chnName = info.ChnName || '';
      if (!currentUser.dept) currentUser.dept = info.DeptNameString || '';
      if (!currentUser.role) currentUser.role = info.PositionName || '';
    }
  } catch (_) {
    // 非公司网络忽略
  }

  matchCurrentPerson();
  return currentUser;
}

// 根据账号/员工信息匹配 people 数组里的一员
function matchCurrentPerson() {
  currentUser.personId = null;
  if (!people.length) return;
  let matched = null;
  // 1. 优先用账号 username 匹配 engName
  if (currentUser.username) {
    matched = people.find(p => p.engName === currentUser.username);
  }
  // 2. 用 tauth 的 EngName 匹配
  if (!matched && currentUser.engName) {
    matched = people.find(p => p.engName === currentUser.engName);
  }
  // 3. 用中文名匹配
  if (!matched && currentUser.chnName) {
    matched = people.find(p => p.name === currentUser.chnName);
  }
  if (matched) currentUser.personId = matched.id;
}

// ========= 策划 & 荣誉：从后端加载 =========
export async function loadAllPersons() {
  // 优先 /hof/persons，回退 /api/persons
  let list = null;
  for (const url of ['/hof/persons', '/api/persons']) {
    try {
      const data = await apiJson(url + '?_t=' + Date.now());
      if (Array.isArray(data)) { list = data; break; }
    } catch (_) {}
  }
  if (!Array.isArray(list)) return;
  // 重置 people 数组（保持引用稳定）
  people.length = 0;
  list.forEach(p => {
    const honors = Array.isArray(p.honors) ? p.honors : [];
    const person = {
      id: p.id,
      engName: p.engName || '',
      name: p.name || '',
      dept: p.dept || '',
      role: p.role || '',
      level: p.level || 1,
      sortOrder: p.sortOrder || 0,
      quote: p.quote || '',
      miniBadgeIds: Array.isArray(p.miniBadgeIds) ? p.miniBadgeIds.slice() : [],
      honors: honors.map(h => ({
        id: h.id,
        name: h.name || '',
        quality: h.quality || 'common',
        category: h.category || 'achievement',
        icon: h.icon || 'ri-medal-fill',
        date: h.date || '',
        desc: h.desc || '',
        reason: h.reason || ''
      }))
    };
    person.score = calcScore(person.honors);
    // 过滤掉无效的 miniBadgeIds
    const ids = new Set(person.honors.map(h => h.id));
    person.miniBadgeIds = person.miniBadgeIds.filter(id => ids.has(id));
    people.push(person);
  });
  rebuildRank();
  matchCurrentPerson();
}

// 兼容旧入口（其它模块仍调用 loadAllProfiles）
export async function loadAllProfiles() {
  await loadAllPersons();
}

// ========= 排行榜 =========
export const rankData = { year: [], half: [], total: [] };

function rebuildRank() {
  const allDates = people.flatMap(p => p.honors.map(h => h.date)).filter(Boolean).sort();
  const NOW_DATE = allDates.length ? new Date(allDates[allDates.length - 1]) : new Date();
  const NOW_YEAR = NOW_DATE.getFullYear();

  function buildRank(filterFn) {
    return people
      .map(p => {
        const filtered = p.honors.filter(filterFn);
        return {
          id: p.id,
          name: p.name,
          dept: p.dept,
          role: p.role,
          honors: filtered.length,
          score: calcScore(filtered)
        };
      })
      .filter(x => x.honors > 0)
      .sort((a, b) => b.score - a.score || b.honors - a.honors)
      .map((x, i) => ({ ...x, rank: i + 1 }));
  }

  rankData.year = buildRank(h => Number((h.date || '').slice(0, 4)) === NOW_YEAR);
  rankData.half = buildRank(h => {
    if (!h.date) return false;
    const diff = (NOW_DATE - new Date(h.date)) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 183;
  });
  rankData.total = buildRank(() => true);
}

// ========= 个人配置（签名、展示徽章）=========
function profileKey(person) {
  return person.engName || person.name;
}

async function postProfile(person, payload) {
  const key = profileKey(person);
  if (!key) throw new Error('缺少唯一标识（engName 或 name）');

  const params = new URLSearchParams();
  params.set('engName', key);
  if (person.name) params.set('chnName', person.name);
  if (payload && payload.quote !== undefined && payload.quote !== null) {
    params.set('quote', payload.quote);
  }
  if (payload && Array.isArray(payload.miniBadgeIds)) {
    params.set('miniBadgeIds', payload.miniBadgeIds.join(','));
  }
  params.set('_t', Date.now().toString());

  let saved = false;
  let lastErr = null;
  for (const url of ['/hof/save?' + params.toString(), '/api/save?' + params.toString()]) {
    try {
      const res = await fetch(url, {
        method: 'GET', headers: { 'Accept': 'application/json' }, cache: 'no-store'
      });
      if (res.ok) { saved = true; break; }
      lastErr = new Error('保存失败：' + res.status);
    } catch (e) { lastErr = e; }
  }
  if (!saved) {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ engName: key, chnName: person.name, ...payload })
      });
      if (res.ok) saved = true;
      else lastErr = new Error('保存失败：' + res.status);
    } catch (e) { lastErr = e; }
  }
  if (!saved) throw lastErr || new Error('保存失败');

  // 内存立即生效
  if (payload && payload.quote !== undefined && payload.quote !== null) {
    person.quote = payload.quote;
  }
  if (payload && Array.isArray(payload.miniBadgeIds)) {
    const own = new Set(person.honors.map(h => h.id));
    person.miniBadgeIds = payload.miniBadgeIds.filter(id => own.has(id));
  }
}

export async function saveQuote(person, quote) {
  await postProfile(person, { quote });
  person.quote = quote;
}

export async function saveMiniBadges(person, badgeIds) {
  const arr = (badgeIds || []).slice();
  await postProfile(person, { miniBadgeIds: arr });
  person.miniBadgeIds = arr;
}

export async function refreshProfile(/* person */) {
  // 保留兼容入口：由 loadAllPersons 统一刷新
  await loadAllPersons();
}

// ========= 管理员操作：策划 =========
export async function adminCreatePerson(payload) {
  return apiJson('/api/admin/person', { method: 'POST', body: payload });
}

export async function adminUpdatePerson(engName, payload) {
  return apiJson('/api/admin/person/' + encodeURIComponent(engName), { method: 'POST', body: payload });
}

export async function adminDeletePerson(engName) {
  return apiJson('/api/admin/person/' + encodeURIComponent(engName), { method: 'DELETE' });
}

// ========= 管理员操作：荣誉 =========
export async function adminCreateHonor(payload) {
  return apiJson('/api/admin/honor', { method: 'POST', body: payload });
}

export async function adminUpdateHonor(honorId, payload) {
  return apiJson('/api/admin/honor/' + honorId, { method: 'POST', body: payload });
}

export async function adminDeleteHonor(honorId) {
  return apiJson('/api/admin/honor/' + honorId, { method: 'DELETE' });
}

// ========= 管理员操作：账号 =========
export async function adminListAccounts() {
  return apiJson('/api/admin/accounts');
}

export async function adminCreateAccount(payload) {
  return apiJson('/api/admin/account', { method: 'POST', body: payload });
}

export async function adminResetPassword(username, newPassword) {
  return apiJson('/api/admin/reset-password', { method: 'POST', body: { username, newPassword } });
}
