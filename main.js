import {
  QUALITY, CATEGORY, people, rankData, getPersonById,
  currentUser, loadCurrentUser, isSelf, saveQuote, saveMiniBadges,
  loadAllProfiles, refreshProfile
} from './data.js';

// ========= 状态 =========
const state = {
  search: '', quality: 'all', category: 'all', year: 'all',
  pSearch: '', pDept: 'all', pSort: 'score',
  currentPerson: null,
  rankTab: 'year',
  // 徽章管理临时选中集合
  tmpBadges: new Set()
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ========= 初始化 =========
async function init() {
  await loadCurrentUser();
  // 从后端拉取所有策划的签名和展示徽章（共享数据）
  await loadAllProfiles();
  updateLoginUI();
  renderPeopleStats();
  populateDeptFilter();
  bindGlobalEvents();
  bindPeopleEvents();
  bindPersonEvents();
  bindRankEvents();
  bindEditEvents();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

function updateLoginUI() {
  if (currentUser.isLoggedIn) {
    $('#currentUser').textContent = currentUser.chnName || currentUser.engName;
    $('#loginIcon').className = 'ri-shield-user-fill text-green-400';
    $('#loginStatus').classList.add('logged-in');
  } else {
    $('#currentUser').textContent = '游客模式';
    $('#loginIcon').className = 'ri-user-3-line text-white/50';
  }
}

// 头像加载（在真实环境可用；无法访问则保持默认图标）
function loadAvatar(engName) {
  const img = $('#avatarImg');
  const fallback = $('#avatarFallback');
  img.classList.add('hidden');
  img.removeAttribute('src');
  fallback.classList.remove('hidden');
  if (!engName) return;
  const url = `https://r.hrc.woa.com/photo/150/${encodeURIComponent(engName)}.png?default_when_absent=true`;
  const probe = new Image();
  probe.onload = () => {
    if (probe.naturalWidth > 1 && probe.naturalHeight > 1) {
      img.src = url;
      img.classList.remove('hidden');
      fallback.classList.add('hidden');
    }
  };
  probe.onerror = () => {};
  probe.src = url;
}

// ========= 路由 =========
function handleRoute() {
  const hash = location.hash || '#/people';
  const parts = hash.replace(/^#\/?/, '').split('/');
  const [r1, r2] = parts;

  $$('header .nav-btn').forEach(a => {
    a.classList.toggle('active', a.dataset.route === r1 || (r1 === 'person' && a.dataset.route === 'people'));
  });

  const show = (id) => {
    $$('.route-view').forEach(v => v.classList.toggle('hidden', v.id !== id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (r1 === 'person' && r2) {
    const p = getPersonById(r2);
    if (!p) { location.hash = '#/people'; return; }
    state.currentPerson = p;
    show('viewPerson');
    renderPerson();
    // 异步刷新该策划的最新 profile，拿到后如果还在当前页就重新渲染
    refreshProfile(p).then(() => {
      if (state.currentPerson && state.currentPerson.id === p.id) {
        $('#userQuote').textContent = `"${p.quote}"`;
        renderMiniBadges();
      }
    });
  } else if (r1 === 'rank') {
    show('viewRank');
    renderRanking();
  } else if (r1 === 'me') {
    if (!currentUser.isLoggedIn) {
      toast('未检测到登录，请在企业网络下访问');
      location.hash = '#/people';
      return;
    }
    if (currentUser.personId) {
      location.hash = `#/person/${currentUser.personId}`;
    } else {
      location.hash = '#/people';
    }
  } else {
    show('viewPeople');
    renderPeopleList();
    // 后台刷新全员 profile，完成后若仍在列表页则重绘
    loadAllProfiles().then(() => {
      if (!$('#viewPeople').classList.contains('hidden')) {
        renderPeopleStats();
        renderPeopleList();
      }
    });
  }
}

// ========= 策划列表 =========
function renderPeopleStats() {
  $('#peopleCount').textContent = people.length;
  const totalH = people.reduce((s, p) => s + p.honors.length, 0);
  const totalL = people.reduce((s, p) => s + p.honors.filter(h => h.quality === 'legend').length, 0);
  $('#totalHonors').textContent = totalH;
  $('#totalLegend').textContent = totalL;
}

function populateDeptFilter() {
  const depts = [...new Set(people.map(p => p.dept))];
  const sel = $('#peopleDept');
  // 清空多余（保留首项"全部部门"）
  sel.innerHTML = '<option value="all">全部部门</option>';
  depts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
}

function renderPeopleList() {
  const grid = $('#peopleGrid');
  const kw = state.pSearch;
  let list = people.filter(p => {
    if (state.pDept !== 'all' && p.dept !== state.pDept) return false;
    if (kw && !p.name.toLowerCase().includes(kw) && !p.dept.toLowerCase().includes(kw)) return false;
    return true;
  });
  if (state.pSort === 'score') list.sort((a, b) => b.score - a.score);
  else if (state.pSort === 'count') list.sort((a, b) => b.honors.length - a.honors.length);
  else if (state.pSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  if (list.length === 0) {
    grid.innerHTML = '';
    $('#peopleEmpty').classList.remove('hidden');
    return;
  }
  $('#peopleEmpty').classList.add('hidden');

  grid.innerHTML = list.map(p => {
    const legend = p.honors.filter(h => h.quality === 'legend').length;
    const topBadges = p.honors
      .slice()
      .sort((a, b) => {
        const order = { legend: 0, epic: 1, rare: 2, common: 3 };
        return order[a.quality] - order[b.quality];
      })
      .slice(0, 5);
    const selfTag = isSelf(p.id)
      ? '<span class="self-tag"><i class="ri-shield-check-fill"></i>本人</span>' : '';
    return `
      <a href="#/person/${p.id}" class="person-card group ${isSelf(p.id) ? 'is-self' : ''}">
        <div class="person-card-bg"></div>
        <div class="relative">
          <div class="flex items-center gap-3 mb-3">
            <div class="relative flex-shrink-0">
              <div class="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-wz-gold to-wz-red">
                <div class="w-full h-full rounded-full bg-wz-dark2 flex items-center justify-center">
                  <i class="ri-user-smile-fill text-3xl text-wz-gold"></i>
                </div>
              </div>
              <div class="absolute -bottom-1 -right-1 bg-wz-gold text-wz-dark text-[10px] font-bold px-1.5 py-0 rounded-full">
                Lv.${p.level}
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-base font-bold truncate group-hover:text-wz-gold transition">
                ${p.name}${selfTag}
              </div>
              <div class="text-xs text-white/50 truncate">${p.dept}</div>
              <div class="text-[11px] text-wz-gold/70 mt-0.5">${p.role}</div>
            </div>
          </div>
          <div class="flex gap-1.5 mb-3 min-h-[32px]">
            ${topBadges.map(h => `
              <div class="mini-badge-sm ${h.quality}" title="${h.name}"><i class="${h.icon}"></i></div>
            `).join('')}
            ${p.honors.length > 5 ? `<div class="mini-badge-sm more">+${p.honors.length - 5}</div>` : ''}
            ${p.honors.length === 0 ? '<div class="text-xs text-white/30">暂无荣誉</div>' : ''}
          </div>
          <div class="grid grid-cols-3 gap-2 pt-3 border-t border-white/10">
            <div class="text-center"><div class="text-sm font-bold text-wz-gold">${p.honors.length}</div><div class="text-[10px] text-white/50">荣誉</div></div>
            <div class="text-center"><div class="text-sm font-bold text-red-400">${legend}</div><div class="text-[10px] text-white/50">传说</div></div>
            <div class="text-center"><div class="text-sm font-bold text-orange-400">${p.score}</div><div class="text-[10px] text-white/50">荣誉值</div></div>
          </div>
        </div>
      </a>
    `;
  }).join('');
}

function bindPeopleEvents() {
  $('#peopleSearch').addEventListener('input', (e) => {
    state.pSearch = e.target.value.trim().toLowerCase();
    renderPeopleList();
  });
  $('#peopleDept').addEventListener('change', (e) => { state.pDept = e.target.value; renderPeopleList(); });
  $('#peopleSort').addEventListener('change', (e) => { state.pSort = e.target.value; renderPeopleList(); });
}

// ========= 个人荣誉墙 =========
function renderPerson() {
  const p = state.currentPerson;
  if (!p) return;
  state.search = ''; state.quality = 'all'; state.category = 'all'; state.year = 'all';
  $('#searchInput').value = '';
  $$('#qualityFilter .quality-chip').forEach(b => b.classList.toggle('active', b.dataset.q === 'all'));
  $$('#categoryFilter .cat-chip').forEach(b => b.classList.toggle('active', b.dataset.c === 'all'));

  $('#userName').textContent = p.name;
  $('#userDept').textContent = p.dept;
  $('#userRole').textContent = p.role;
  $('#userLevel').textContent = p.level;
  $('#userQuote').textContent = `"${p.quote}"`;
  loadAvatar(p.engName);

  const legend = p.honors.filter(h => h.quality === 'legend').length;
  const epic = p.honors.filter(h => h.quality === 'epic').length;
  $('#statTotal').textContent = p.honors.length;
  $('#statLegend').textContent = legend;
  $('#statEpic').textContent = epic;
  $('#statScore').textContent = p.score;

  // 权限：是否为本人
  const self = isSelf(p.id);
  $('#selfBadge').classList.toggle('hidden', !self);
  $('#editQuoteBtn').classList.toggle('hidden', !self);
  $('#manageBadgesBtn').classList.toggle('hidden', !self || p.honors.length === 0);
  // 取消任何编辑态
  $('#quoteView').classList.remove('hidden');
  $('#quoteEdit').classList.add('hidden');

  renderMiniBadges();
  populateYearFilter();
  renderHonors();
}

function renderMiniBadges() {
  const p = state.currentPerson;
  const container = $('#miniBadges');
  const empty = $('#miniBadgesEmpty');
  const badges = p.miniBadgeIds.map(id => p.honors.find(h => h.id === id)).filter(Boolean);
  if (badges.length === 0) {
    container.innerHTML = '';
    empty.classList.toggle('hidden', !isSelf(p.id));
    if (!isSelf(p.id)) {
      container.innerHTML = '<div class="text-xs text-white/30">该策划暂未挑选展示徽章</div>';
    }
    return;
  }
  empty.classList.add('hidden');
  container.innerHTML = badges.map(h => `
    <div class="mini-badge ${h.quality}" data-id="${h.id}" tabindex="0">
      <i class="${h.icon}"></i>
    </div>
  `).join('');
  container.querySelectorAll('.mini-badge').forEach(el => {
    const honor = p.honors.find(h => h.id === Number(el.dataset.id));
    el.addEventListener('mouseenter', (e) => showTooltip(e, honor));
    el.addEventListener('mousemove', moveTooltip);
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('click', () => openModal(honor));
  });
}

function showTooltip(e, honor) {
  const tip = $('#tooltip');
  const q = QUALITY[honor.quality];
  tip.innerHTML = `
    <div class="flex items-start gap-2 mb-2">
      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
           style="background: ${q.color}; box-shadow: 0 0 8px ${q.color}88;">
        <i class="${honor.icon}"></i>
      </div>
      <div class="flex-1">
        <div class="font-bold text-wz-gold">${honor.name}</div>
        <div class="text-[10px] mt-0.5" style="color: ${q.color};">
          ${q.name} · ${CATEGORY[honor.category]}
        </div>
      </div>
    </div>
    <p class="text-white/80 text-xs leading-relaxed mb-2">${honor.desc}</p>
    <div class="text-[11px] text-white/50 flex items-center gap-1 border-t border-white/10 pt-2">
      <i class="ri-time-line"></i> 获取时间：${honor.date}
    </div>`;
  tip.classList.remove('hidden');
  moveTooltip(e);
}

function moveTooltip(e) {
  const tip = $('#tooltip');
  const pad = 14;
  let x = e.clientX + pad, y = e.clientY + pad;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - pad;
  if (y + h > window.innerHeight - 8) y = e.clientY - h - pad;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function hideTooltip() { $('#tooltip').classList.add('hidden'); }

function populateYearFilter() {
  const p = state.currentPerson;
  const sel = $('#yearFilter');
  sel.innerHTML = '<option value="all">全部年份</option>';
  const years = [...new Set(p.honors.map(h => h.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y + '年';
    sel.appendChild(opt);
  });
}

function renderHonors() {
  const p = state.currentPerson;
  if (!p) return;
  const grid = $('#honorGrid');
  if (p.honors.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-16 text-white/40">
        <i class="ri-seedling-line text-5xl mb-2"></i>
        <p class="text-base mb-1">${isSelf(p.id) ? '你' : 'TA'} 还没有获得荣誉</p>
        <p class="text-xs">期待未来在这里看到闪耀的奖杯 ✨</p>
      </div>`;
    $('#emptyTip').classList.add('hidden');
    return;
  }
  const filtered = p.honors.filter(h => {
    if (state.quality !== 'all' && h.quality !== state.quality) return false;
    if (state.category !== 'all' && h.category !== state.category) return false;
    if (state.year !== 'all' && !h.date.startsWith(state.year)) return false;
    if (state.search) {
      const s = state.search;
      if (!h.name.toLowerCase().includes(s) && !h.desc.toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const order = { legend: 0, epic: 1, rare: 2, common: 3 };
    if (order[a.quality] !== order[b.quality]) return order[a.quality] - order[b.quality];
    return b.date.localeCompare(a.date);
  });
  if (filtered.length === 0) {
    grid.innerHTML = '';
    $('#emptyTip').classList.remove('hidden');
    return;
  }
  $('#emptyTip').classList.add('hidden');
  grid.innerHTML = filtered.map(h => {
    const q = QUALITY[h.quality];
    return `
      <div class="honor-card ${h.quality}" data-id="${h.id}">
        <span class="quality-tag">${q.name}</span>
        <div class="honor-icon"><i class="${h.icon}"></i></div>
        <div class="font-semibold text-sm md:text-base mb-1 line-clamp-2">${h.name}</div>
        <div class="text-xs text-white/60 mb-1">${CATEGORY[h.category]}</div>
        <div class="text-[11px] text-white/40 mt-auto pt-2 flex items-center gap-1">
          <i class="ri-calendar-line"></i> ${h.date}
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.honor-card').forEach(el => {
    const honor = p.honors.find(h => h.id === Number(el.dataset.id));
    el.addEventListener('click', () => openModal(honor));
    el.addEventListener('mouseenter', (e) => showTooltip(e, honor));
    el.addEventListener('mousemove', moveTooltip);
    el.addEventListener('mouseleave', hideTooltip);
  });
}

function openModal(honor) {
  const q = QUALITY[honor.quality];
  hideTooltip();
  $('#modalContent').innerHTML = `
    <div class="text-center">
      <div class="honor-icon mx-auto"
           style="width: 96px; height: 96px; font-size: 3rem;
                  background: radial-gradient(circle, ${q.color}, ${q.border}88);
                  border-radius: 50%; display: flex; align-items: center; justify-content: center;
                  box-shadow: 0 0 30px ${q.color}99; color: #fff; margin-bottom: 1rem;">
        <i class="${honor.icon}"></i>
      </div>
      <div class="inline-block px-3 py-0.5 rounded-full text-xs mb-2 font-semibold"
           style="background: ${q.color}; color: #0b1020;">
        ${q.name} · ${CATEGORY[honor.category]}
      </div>
      <h3 class="text-2xl font-bold text-wz-gold mb-2">${honor.name}</h3>
      <div class="text-xs text-white/50 mb-4">
        <i class="ri-time-line"></i> 获取时间：${honor.date}
      </div>
      <div class="text-left bg-white/5 rounded-lg p-4 border border-white/10 mb-3">
        <div class="text-xs text-wz-gold mb-1"><i class="ri-information-line"></i> 荣誉描述</div>
        <p class="text-sm text-white/85 leading-relaxed">${honor.desc}</p>
      </div>
      <div class="text-left bg-white/5 rounded-lg p-4 border border-white/10">
        <div class="text-xs text-wz-gold mb-1"><i class="ri-flag-line"></i> 获得理由</div>
        <p class="text-sm text-white/85 leading-relaxed">${honor.reason}</p>
      </div>
    </div>`;
  $('#honorModal').classList.remove('hidden');
  $('#honorModal').classList.add('flex', 'open');
}
function closeModal() {
  const m = $('#honorModal');
  m.classList.add('hidden'); m.classList.remove('flex', 'open');
}

function bindPersonEvents() {
  $('#searchInput').addEventListener('input', (e) => { state.search = e.target.value.trim().toLowerCase(); renderHonors(); });
  $('#yearFilter').addEventListener('change', (e) => { state.year = e.target.value; renderHonors(); });
  $('#qualityFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('.quality-chip'); if (!btn) return;
    $$('#qualityFilter .quality-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); state.quality = btn.dataset.q; renderHonors();
  });
  $('#categoryFilter').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-chip'); if (!btn) return;
    $$('#categoryFilter .cat-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); state.category = btn.dataset.c; renderHonors();
  });
  $('#prevPerson').addEventListener('click', () => switchPerson(-1));
  $('#nextPerson').addEventListener('click', () => switchPerson(1));
}
function switchPerson(delta) {
  const p = state.currentPerson;
  if (!p) return;
  const idx = people.findIndex(x => x.id === p.id);
  const next = people[(idx + delta + people.length) % people.length];
  location.hash = `#/person/${next.id}`;
}

// ========= 编辑事件（签名 + 徽章管理） =========
function bindEditEvents() {
  // 签名
  $('#editQuoteBtn').addEventListener('click', () => {
    const p = state.currentPerson;
    if (!p || !isSelf(p.id)) return;
    $('#quoteInput').value = p.quote || '';
    $('#quoteView').classList.add('hidden');
    $('#quoteEdit').classList.remove('hidden');
    $('#quoteInput').focus();
  });
  $('#cancelQuoteBtn').addEventListener('click', () => {
    $('#quoteView').classList.remove('hidden');
    $('#quoteEdit').classList.add('hidden');
  });
  $('#saveQuoteBtn').addEventListener('click', doSaveQuote);
  $('#quoteInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSaveQuote();
    if (e.key === 'Escape') {
      $('#quoteView').classList.remove('hidden');
      $('#quoteEdit').classList.add('hidden');
    }
  });

  // 徽章管理
  $('#manageBadgesBtn').addEventListener('click', openBadgeManager);
  $('#closeBadgeModal').addEventListener('click', closeBadgeManager);
  $('#cancelBadgeMgr').addEventListener('click', closeBadgeManager);
  $('#saveBadgeMgr').addEventListener('click', doSaveBadges);
  $('#badgeModal').addEventListener('click', (e) => {
    if (e.target.id === 'badgeModal') closeBadgeManager();
  });
}

function doSaveQuote() {
  const p = state.currentPerson;
  if (!p || !isSelf(p.id)) return;
  const val = $('#quoteInput').value.trim();
  if (!val) { toast('签名不能为空'); return; }
  const btn = $('#saveQuoteBtn');
  if (btn) btn.disabled = true;
  saveQuote(p, val).then(() => {
    $('#userQuote').textContent = `"${val}"`;
    $('#quoteView').classList.remove('hidden');
    $('#quoteEdit').classList.add('hidden');
    toast('个性签名已更新 ✨');
  }).catch(err => {
    toast(err.message || '保存失败，请稍后再试');
  }).finally(() => {
    if (btn) btn.disabled = false;
  });
}

function openBadgeManager() {
  const p = state.currentPerson;
  if (!p || !isSelf(p.id)) return;
  state.tmpBadges = new Set(p.miniBadgeIds);
  renderBadgeManager();
  $('#badgeModal').classList.remove('hidden');
  $('#badgeModal').classList.add('flex');
}
function closeBadgeManager() {
  $('#badgeModal').classList.add('hidden');
  $('#badgeModal').classList.remove('flex');
}
function renderBadgeManager() {
  const p = state.currentPerson;
  const grid = $('#badgeMgrGrid');
  const sorted = p.honors.slice().sort((a, b) => {
    const order = { legend: 0, epic: 1, rare: 2, common: 3 };
    if (order[a.quality] !== order[b.quality]) return order[a.quality] - order[b.quality];
    return b.date.localeCompare(a.date);
  });
  grid.innerHTML = sorted.map(h => {
    const checked = state.tmpBadges.has(h.id);
    return `
      <label class="badge-pick ${h.quality} ${checked ? 'picked' : ''}" data-id="${h.id}">
        <input type="checkbox" ${checked ? 'checked' : ''} class="sr-only" />
        <div class="pick-icon"><i class="${h.icon}"></i></div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold truncate">${h.name}</div>
          <div class="text-[11px] text-white/50 truncate">${QUALITY[h.quality].name} · ${CATEGORY[h.category]}</div>
        </div>
        <i class="ri-check-line check-icon"></i>
      </label>
    `;
  }).join('');
  $('#selectedCount').textContent = state.tmpBadges.size;
  grid.querySelectorAll('.badge-pick').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const id = Number(el.dataset.id);
      if (state.tmpBadges.has(id)) {
        state.tmpBadges.delete(id);
      } else {
        if (state.tmpBadges.size >= 8) {
          toast('最多只能展示 8 枚徽章');
          return;
        }
        state.tmpBadges.add(id);
      }
      renderBadgeManager();
    });
  });
}
function doSaveBadges() {
  const p = state.currentPerson;
  if (!p || !isSelf(p.id)) return;
  // 按品质优先 + 日期排序后保存
  const sorted = p.honors
    .filter(h => state.tmpBadges.has(h.id))
    .sort((a, b) => {
      const order = { legend: 0, epic: 1, rare: 2, common: 3 };
      if (order[a.quality] !== order[b.quality]) return order[a.quality] - order[b.quality];
      return b.date.localeCompare(a.date);
    })
    .map(h => h.id);
  const btn = $('#saveBadgeMgr');
  if (btn) btn.disabled = true;
  saveMiniBadges(p, sorted).then(() => {
    renderMiniBadges();
    closeBadgeManager();
    toast('展示徽章已更新 🛡');
  }).catch(err => {
    toast(err.message || '保存失败，请稍后再试');
  }).finally(() => {
    if (btn) btn.disabled = false;
  });
}

// ========= Toast =========
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// ========= 排行榜 =========
function renderRanking() {
  const list = rankData[state.rankTab];
  const top = list.slice(0, 3);
  const rest = list.slice(3);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const posCls = ['podium-2', 'podium-1', 'podium-3'];
  const crown = ['ri-medal-2-fill', 'ri-vip-crown-fill', 'ri-medal-fill'];
  const rankNum = [2, 1, 3];

  $('#topThree').innerHTML = order.map((item, i) => {
    if (!item) return '<div></div>';
    const cls = posCls[i];
    return `
      <a href="#/person/${item.id}" class="podium ${cls} block hover:brightness-110 transition ${isSelf(item.id) ? 'is-self' : ''}">
        <div class="podium-crown"><i class="${crown[i]}"></i></div>
        <div class="podium-avatar">
          <i class="ri-user-smile-fill text-4xl text-white/70"></i>
        </div>
        <div class="podium-rank">${rankNum[i]}</div>
        <div class="font-bold text-base md:text-lg truncate">${item.name}${isSelf(item.id) ? ' <span class=\"text-xs text-green-400\">(我)</span>' : ''}</div>
        <div class="text-[11px] text-white/50 mb-2 truncate">${item.dept}</div>
        <div class="flex justify-center gap-3 text-xs">
          <span class="flex items-center gap-1 text-wz-gold"><i class="ri-medal-fill"></i> ${item.honors}</span>
          <span class="flex items-center gap-1 text-red-300"><i class="ri-fire-fill"></i> ${item.score}</span>
        </div>
      </a>
    `;
  }).join('');

  $('#rankList').innerHTML = rest.map(item => `
    <a href="#/person/${item.id}" class="rank-row block ${isSelf(item.id) ? 'is-self' : ''}">
      <div class="col-span-1 text-white/50 font-semibold">#${item.rank}</div>
      <div class="col-span-5 md:col-span-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-gradient-to-br from-wz-gold/30 to-wz-purple/30 flex items-center justify-center flex-shrink-0">
          <i class="ri-user-smile-fill text-white/80"></i>
        </div>
        <div class="min-w-0">
          <div class="text-sm font-medium truncate">${item.name}${isSelf(item.id) ? ' <span class=\"text-xs text-green-400\">(我)</span>' : ''}</div>
          <div class="text-xs text-white/40 truncate md:hidden">${item.dept}</div>
        </div>
      </div>
      <div class="col-span-3 text-sm text-white/60 hidden md:block truncate">${item.dept}</div>
      <div class="col-span-3 md:col-span-2 text-center text-sm text-wz-gold font-semibold">${item.honors}</div>
      <div class="col-span-3 md:col-span-2 text-right text-sm text-red-300 font-semibold">${item.score}</div>
    </a>
  `).join('');
}
function bindRankEvents() {
  $('#rankTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.rank-tab'); if (!btn) return;
    $$('#rankTabs .rank-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); state.rankTab = btn.dataset.r; renderRanking();
  });
}

// ========= 全局 =========
function bindGlobalEvents() {
  $('#closeModal').addEventListener('click', closeModal);
  $('#honorModal').addEventListener('click', (e) => { if (e.target.id === 'honorModal') closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeBadgeManager(); }
  });
}

document.addEventListener('DOMContentLoaded', init);