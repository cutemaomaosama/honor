import {
  QUALITY, CATEGORY, people, getPersonById,
  currentUser, loadCurrentUser, isSelf, isAdmin, saveQuote,
  loadAllPersons,
  apiLogin, apiLogout, apiChangePassword,
  adminCreatePerson, adminUpdatePerson, adminDeletePerson,
  adminCreateHonor, adminUpdateHonor, adminDeleteHonor,
  adminListAccounts, adminCreateAccount, adminResetPassword, adminUpdateAccount,
  avatarUrl, uploadMyAvatar, fetchMyAvatarRequest,
  adminListAvatarRequests, adminReviewAvatar,
  fetchLikesSummary, togglePersonLike,
  fetchMessages, postMessage, deleteMessage
} from './data.js';

// ========= 状态 =========
const state = {
  search: '', quality: 'all', category: 'all', year: 'all',
  pSearch: '', pDept: 'all', pSort: 'score',
  currentPerson: null,
  adminTab: 'person',
  adminHonorPerson: '',
  formSubmit: null,
  likeCounts: {},
  likedToday: new Set(),
  avatarBust: {},
  avatarPickedDataUrl: '',
  adminAvatarStatus: 'pending'
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ========= 初始化 =========
async function init() {
  await loadCurrentUser();
  await loadAllPersons();
  await loadLikesSummary();
  updateLoginUI();
  populateDeptFilter();
  bindGlobalEvents();
  bindPeopleEvents();
  bindPersonEvents();
  bindEditEvents();
  bindAuthEvents();
  bindAdminEvents();
  bindMessageEvents();
  bindAvatarEvents();
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

async function loadLikesSummary() {
  try {
    const data = await fetchLikesSummary();
    state.likeCounts = data.counts || {};
    state.likedToday = new Set(data.likedToday || []);
  } catch (_) {
    state.likeCounts = {};
    state.likedToday = new Set();
  }
}

function updateLoginUI() {
  const loginBtn = $('#loginBtn');
  const wrap = $('#userMenuWrap');
  if (currentUser.isLoggedIn) {
    loginBtn.classList.add('hidden');
    wrap.classList.remove('hidden');
    const displayName = currentUser.chnName || currentUser.username;
    $('#currentUser').textContent = displayName;
    $('#umName').textContent = displayName;
    $('#umRole').textContent = currentUser.accountRole === 'admin' ? '管理员' : '普通用户';
    $('#loginIcon').className = 'ri-shield-user-fill ' + (currentUser.accountRole === 'admin' ? 'text-wz-gold' : 'text-green-400');
    const showAdmin = currentUser.accountRole === 'admin';
    $('#adminNavBtn').classList.toggle('hidden', !showAdmin);
    $('#umAdminEntry').classList.toggle('hidden', !showAdmin);
    if (showAdmin) refreshAvatarPendingBadge();
  } else {
    loginBtn.classList.remove('hidden');
    wrap.classList.add('hidden');
    $('#userMenuPanel').classList.add('hidden');
    $('#adminNavBtn').classList.add('hidden');
  }
  refreshMessageUI();
}

// 头像加载
function loadAvatar(engName) {
  const img = $('#avatarImg');
  const fallback = $('#avatarFallback');
  if (!img) return;
  img.classList.add('hidden');
  img.removeAttribute('src');
  fallback.classList.remove('hidden');
  if (!engName) return;
  const bust = state.avatarBust[engName] || '';
  const url = avatarUrl(engName) + (bust ? ('?t=' + bust) : '');
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
    loadAllPersons().then(async () => {
      await loadLikesSummary();
      const latest = getPersonById(p.id);
      if (latest && state.currentPerson && state.currentPerson.id === p.id) {
        state.currentPerson = latest;
        renderPerson();
      }
    });
  } else if (r1 === 'me') {
    if (!currentUser.isLoggedIn) {
      toast('请先登录');
      openLoginModal();
      location.hash = '#/people';
      return;
    }
    if (currentUser.personId) {
      location.hash = `#/person/${currentUser.personId}`;
    } else {
      toast('未匹配到您的策划档案');
      location.hash = '#/people';
    }
  } else if (r1 === 'admin') {
    if (!isAdmin()) {
      toast('需要管理员权限');
      location.hash = '#/people';
      return;
    }
    show('viewAdmin');
    renderAdmin();
  } else {
    show('viewPeople');
    renderTopThree();
    renderPeopleList();
    loadAllPersons().then(async () => {
      await loadLikesSummary();
      if (!$('#viewPeople').classList.contains('hidden')) {
        populateDeptFilter();
        renderTopThree();
        renderPeopleList();
      }
    });
  }
}

// ========= Top3（全员荣誉页顶部）=========
function renderTopThree() {
  const container = $('#topThree');
  if (!container) return;
  // 按荣誉值降序；并列时按荣誉数再姓名
  const ranked = people.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.honors.length !== a.honors.length) return b.honors.length - a.honors.length;
    return a.name.localeCompare(b.name, 'zh');
  });
  const top = ranked.slice(0, 3);
  // 视觉顺序：第2-第1-第3
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const posCls = ['podium-2', 'podium-1', 'podium-3'];
  const crown = ['ri-medal-2-fill', 'ri-vip-crown-fill', 'ri-medal-fill'];
  const rankNum = [2, 1, 3];
  container.innerHTML = order.map((item, i) => {
    if (!item) return '<div></div>';
    const cls = posCls[i];
    const bust = state.avatarBust[item.engName] || '';
    const av = avatarUrl(item.engName) + (bust ? ('?t=' + bust) : '');
    const legend = item.honors.filter(h => h.quality === 'legend').length;
    const likes = state.likeCounts[item.engName] || 0;
    return `
      <a href="#/person/${item.id}" class="podium ${cls} block hover:brightness-110 transition ${isSelf(item.id) ? 'is-self' : ''}">
        <div class="podium-crown"><i class="${crown[i]}"></i></div>
        <div class="podium-avatar">
          <img src="${av}" class="podium-avatar-img" alt=""
               onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex');" />
          <div class="podium-avatar-fallback" style="display:none;">
            <i class="ri-user-smile-fill text-4xl text-wz-gold/80"></i>
          </div>
        </div>
        <div class="podium-rank">${rankNum[i]}</div>
        <div class="font-bold text-base md:text-lg truncate text-wz-gold">${escapeHtml(item.name)}${isSelf(item.id) ? ' <span class=\"text-xs text-green-400\">(我)</span>' : ''}</div>
        <div class="text-[11px] text-white/50 mb-2 truncate font-mono">${escapeHtml(item.engName)}</div>
        <div class="text-[11px] text-white/60 italic truncate px-2 mb-2" title="${escapeHtml(item.quote || '')}">${item.quote ? '"' + escapeHtml(item.quote) + '"' : ''}</div>
        <div class="flex justify-center gap-2 text-xs flex-wrap">
          <span class="flex items-center gap-1 text-wz-gold"><i class="ri-medal-fill"></i> ${item.honors.length}</span>
          <span class="flex items-center gap-1 text-red-300"><i class="ri-vip-diamond-fill"></i> ${legend}</span>
          <span class="flex items-center gap-1 text-orange-400"><i class="ri-fire-fill"></i> ${item.score}</span>
          <span class="flex items-center gap-1 text-pink-300"><i class="ri-heart-3-fill"></i> ${likes}</span>
        </div>
      </a>
    `;
  }).join('');
}

// ========= 策划列表 =========
function populateDeptFilter() {
  const depts = [...new Set(people.map(p => p.dept))];
  const sel = $('#peopleDept');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">全部部门</option>';
  depts.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt);
  });
  if (cur && (cur === 'all' || depts.includes(cur))) sel.value = cur;
}

function renderPeopleList() {
  const grid = $('#peopleGrid');
  const kw = state.pSearch;
  // Top3 集合（按荣誉值排名）
  const ranked = people.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.honors.length !== a.honors.length) return b.honors.length - a.honors.length;
    return a.name.localeCompare(b.name, 'zh');
  });
  const topIds = new Set(ranked.slice(0, 3).map(p => p.id));
  // 过滤排除 top3
  let list = people.filter(p => {
    if (topIds.has(p.id)) return false;
    if (state.pDept !== 'all' && p.dept !== state.pDept) return false;
    if (kw) {
      const n = (p.name || '').toLowerCase();
      const d = (p.dept || '').toLowerCase();
      const e = (p.engName || '').toLowerCase();
      if (!n.includes(kw) && !d.includes(kw) && !e.includes(kw)) return false;
    }
    return true;
  });
  if (state.pSort === 'score') list.sort((a, b) => b.score - a.score);
  else if (state.pSort === 'count') list.sort((a, b) => b.honors.length - a.honors.length);
  else if (state.pSort === 'likes') list.sort((a, b) => (state.likeCounts[b.engName] || 0) - (state.likeCounts[a.engName] || 0));
  else if (state.pSort === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  if (list.length === 0) {
    grid.innerHTML = '';
    $('#peopleEmpty').classList.remove('hidden');
    return;
  }
  $('#peopleEmpty').classList.add('hidden');

  grid.innerHTML = list.map(p => personCardHTML(p)).join('');
  bindPersonCards(grid);
}

function personCardHTML(p) {
  const legend = p.honors.filter(h => h.quality === 'legend').length;
  const topBadges = p.honors.slice().sort((a, b) => {
    const order = { legend: 0, epic: 1, rare: 2, common: 3 };
    return order[a.quality] - order[b.quality];
  }).slice(0, 5);
  const selfTag = isSelf(p.id) ? '<span class="self-tag"><i class="ri-shield-check-fill"></i>本人</span>' : '';
  const likeCount = state.likeCounts[p.engName] || 0;
  const liked = state.likedToday.has(p.engName);
  const canLike = currentUser.isLoggedIn && currentUser.username !== p.engName;
  const likeTitle = !currentUser.isLoggedIn ? '登录后可点赞'
    : (currentUser.username === p.engName ? '不能给自己点赞'
    : (liked ? '今日已点赞，点击取消' : '点赞（每人每天一次）'));
  const bust = state.avatarBust[p.engName] || '';
  const avUrl = avatarUrl(p.engName) + (bust ? ('?t=' + bust) : '');
  const quote = p.quote ? `"${escapeHtml(p.quote)}"` : '<span class="text-white/30 italic">暂无签名</span>';
  return `
    <div class="person-card group ${isSelf(p.id) ? 'is-self' : ''}" data-pid="${p.id}" data-eng="${escapeHtml(p.engName)}">
      <a href="#/person/${p.id}" class="person-card-bg-link block absolute inset-0 z-0" aria-label="${escapeHtml(p.name)}"></a>
      <div class="person-card-bg"></div>
      <div class="relative pointer-events-none">
        <div class="flex items-center gap-3 mb-3">
          <div class="relative flex-shrink-0">
            <div class="w-16 h-16 rounded-full p-[2px] bg-gradient-to-br from-wz-gold via-yellow-200 to-wz-red">
              <div class="w-full h-full rounded-full bg-wz-dark2 overflow-hidden flex items-center justify-center">
                <img src="${avUrl}" alt="" class="card-avatar-img w-full h-full object-cover"
                  onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex');" />
                <div class="card-avatar-fallback w-full h-full flex items-center justify-center" style="display:none;">
                  <i class="ri-user-smile-fill text-3xl text-wz-gold"></i>
                </div>
              </div>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-base font-bold truncate group-hover:text-wz-gold transition">
              ${escapeHtml(p.name)}${selfTag}
            </div>
            <div class="text-xs text-white/50 truncate">${escapeHtml(p.dept)}</div>
            <div class="text-[11px] text-wz-gold/70 mt-0.5 font-mono truncate" title="${escapeHtml(p.engName)}">@${escapeHtml(p.engName)}</div>
          </div>
        </div>
        <div class="quote-strip text-[12px] text-white/70 mb-3 italic truncate px-1" title="${escapeHtml(p.quote || '')}">${quote}</div>
        <div class="flex gap-1.5 mb-3 min-h-[32px]">
          ${topBadges.map(h => `
            <div class="mini-badge-sm ${h.quality}" data-hid="${h.id}"><i class="${h.icon}"></i></div>
          `).join('')}
          ${p.honors.length > 5 ? `<div class="mini-badge-sm more">+${p.honors.length - 5}</div>` : ''}
          ${p.honors.length === 0 ? '<div class="text-xs text-white/30">暂无荣誉</div>' : ''}
        </div>
        <div class="grid grid-cols-4 gap-2 pt-3 border-t border-wz-gold/15">
          <div class="text-center"><div class="text-sm font-bold text-wz-gold">${p.honors.length}</div><div class="text-[10px] text-white/50">荣誉</div></div>
          <div class="text-center"><div class="text-sm font-bold text-red-400">${legend}</div><div class="text-[10px] text-white/50">传说</div></div>
          <div class="text-center"><div class="text-sm font-bold text-orange-400">${p.score}</div><div class="text-[10px] text-white/50">荣誉值</div></div>
          <div class="text-center">
            <button class="like-btn ${liked ? 'liked' : ''} ${canLike ? '' : 'disabled'}"
                    data-like-eng="${escapeHtml(p.engName)}"
                    title="${likeTitle}">
              <i class="${liked ? 'ri-heart-fill' : 'ri-heart-line'}"></i>
              <span class="like-count">${likeCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindPersonCards(grid) {
  grid.querySelectorAll('.person-card').forEach(card => {
    const pid = Number(card.dataset.pid);
    const person = people.find(x => x.id === pid);
    if (!person) return;
    card.querySelectorAll('.mini-badge-sm[data-hid]').forEach(el => {
      const hid = Number(el.dataset.hid);
      const honor = person.honors.find(h => h.id === hid);
      if (!honor) return;
      el.style.pointerEvents = 'auto';
      el.addEventListener('mouseenter', (e) => { e.stopPropagation(); showTooltip(e, honor); });
      el.addEventListener('mousemove', (e) => { e.stopPropagation(); moveTooltip(e); });
      el.addEventListener('mouseleave', hideTooltip);
    });
    const likeBtn = card.querySelector('.like-btn');
    if (likeBtn) {
      likeBtn.style.pointerEvents = 'auto';
      likeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await handleLikeClick(card.dataset.eng);
      });
    }
  });
}

async function handleLikeClick(engName) {
  if (!currentUser.isLoggedIn) { toast('请先登录后再点赞'); openLoginModal(); return; }
  if (currentUser.username === engName) { toast('不能给自己点赞'); return; }
  try {
    const res = await togglePersonLike(engName);
    state.likeCounts[engName] = res.total;
    if (res.liked) state.likedToday.add(engName);
    else state.likedToday.delete(engName);
    // 刷新所有同 engName 的点赞按钮（列表小按钮 + 个人页大按钮）
    syncLikeButtons(engName, res.liked, res.total);
    // 如果当前在个人页展示的就是这个人，同步大按钮和 stats
    if (state.currentPerson && state.currentPerson.engName === engName) {
      $('#statLikes').textContent = res.total;
    }
    // Top3 中可能包含此人，刷新一下 top3 计数显示
    if (!$('#viewPeople').classList.contains('hidden')) {
      renderTopThree();
    }
    toast(res.liked ? '点赞成功 ❤' : '已取消点赞');
  } catch (e) {
    toast(e.message || '点赞失败');
  }
}

function syncLikeButtons(engName, liked, total) {
  document.querySelectorAll(`.like-btn[data-like-eng="${cssEscape(engName)}"]`).forEach(btn => {
    btn.classList.toggle('liked', liked);
    const icon = btn.querySelector('i');
    if (icon) icon.className = liked ? 'ri-heart-fill' : 'ri-heart-line';
    const cnt = btn.querySelector('.like-count');
    if (cnt) cnt.textContent = total;
  });
  // 大按钮
  document.querySelectorAll(`.like-btn-lg[data-like-eng="${cssEscape(engName)}"]`).forEach(btn => {
    btn.classList.toggle('liked', liked);
    const icon = btn.querySelector('i');
    if (icon) icon.className = liked ? 'ri-heart-fill' : 'ri-heart-line';
    const cnt = btn.querySelector('.like-count-lg');
    if (cnt) cnt.textContent = total;
  });
}

function cssEscape(s) {
  return String(s).replace(/["\\]/g, '\\$&');
}

function bindPeopleEvents() {
  $('#peopleSearch').addEventListener('input', (e) => {
    state.pSearch = e.target.value.trim().toLowerCase();
    renderPeopleList();
  });
  $('#peopleDept').addEventListener('change', (e) => { state.pDept = e.target.value; renderPeopleList(); });
  $('#peopleSort').addEventListener('change', (e) => { state.pSort = e.target.value; renderPeopleList(); });
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
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
  $('#userEng').textContent = '@' + p.engName;
  $('#userQuote').textContent = `"${p.quote || ''}"`;
  loadAvatar(p.engName);

  const legend = p.honors.filter(h => h.quality === 'legend').length;
  const likes = state.likeCounts[p.engName] || 0;
  $('#statTotal').textContent = p.honors.length;
  $('#statLegend').textContent = legend;
  $('#statLikes').textContent = likes;
  $('#statScore').textContent = p.score;

  const self = isSelf(p.id);
  $('#selfBadge').classList.toggle('hidden', !self);
  $('#editQuoteBtn').classList.toggle('hidden', !self);
  $('#changeAvatarBtn').classList.toggle('hidden', !self);
  $('#avatarPendingTag').classList.add('hidden');
  if (self) {
    fetchMyAvatarRequest().then(r => {
      if (r && r.hasRequest && r.status === 'pending') {
        $('#avatarPendingTag').classList.remove('hidden');
      }
    }).catch(() => {});
  }
  $('#quoteView').classList.remove('hidden');
  $('#quoteEdit').classList.add('hidden');

  // 个人页点赞按钮
  const likeBtn = $('#personLikeBtn');
  if (likeBtn) {
    const liked = state.likedToday.has(p.engName);
    const canLike = currentUser.isLoggedIn && currentUser.username !== p.engName;
    likeBtn.dataset.likeEng = p.engName;
    likeBtn.classList.toggle('liked', liked);
    likeBtn.classList.toggle('disabled', !canLike);
    const icon = likeBtn.querySelector('i');
    if (icon) icon.className = liked ? 'ri-heart-fill' : 'ri-heart-line';
    const cnt = likeBtn.querySelector('.like-count-lg');
    if (cnt) cnt.textContent = likes;
    likeBtn.title = !currentUser.isLoggedIn ? '登录后可点赞'
      : (currentUser.username === p.engName ? '不能给自己点赞'
      : (liked ? '今日已点赞，点击取消' : '点赞（每人每天一次）'));
  }

  // 留言板 target 标题 & 加载
  $('#msgTargetName').textContent = p.name;
  loadMessages(p.engName);

  renderMiniBadges();
  populateYearFilter();
  renderHonors();
}

function renderMiniBadges() {
  const p = state.currentPerson;
  const container = $('#miniBadges');
  const empty = $('#miniBadgesEmpty');
  const order = { legend: 0, epic: 1, rare: 2, common: 3 };
  const badges = p.honors.slice().sort((a, b) => {
    if (order[a.quality] !== order[b.quality]) return order[a.quality] - order[b.quality];
    return (b.date || '').localeCompare(a.date || '');
  }).slice(0, 5);
  if (badges.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    empty.textContent = '暂未获得荣誉';
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
        <div class="font-bold text-wz-gold">${escapeHtml(honor.name)}</div>
        <div class="text-[10px] mt-0.5" style="color: ${q.color};">
          ${q.name} · ${CATEGORY[honor.category] || honor.category}
        </div>
      </div>
    </div>
    <p class="text-white/80 text-xs leading-relaxed mb-2">${escapeHtml(honor.desc)}</p>
    <div class="text-[11px] text-white/50 flex items-center gap-1 border-t border-white/10 pt-2">
      <i class="ri-time-line"></i> 获取时间：${escapeHtml(honor.date)}
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
  const years = [...new Set(p.honors.map(h => (h.date || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
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
    if (state.year !== 'all' && !(h.date || '').startsWith(state.year)) return false;
    if (state.search) {
      const s = state.search;
      if (!h.name.toLowerCase().includes(s) && !(h.desc || '').toLowerCase().includes(s)) return false;
    }
    return true;
  }).sort((a, b) => {
    const order = { legend: 0, epic: 1, rare: 2, common: 3 };
    if (order[a.quality] !== order[b.quality]) return order[a.quality] - order[b.quality];
    return (b.date || '').localeCompare(a.date || '');
  });
  if (filtered.length === 0) {
    grid.innerHTML = '';
    $('#emptyTip').classList.remove('hidden');
    return;
  }
  $('#emptyTip').classList.add('hidden');
  grid.innerHTML = filtered.map(h => {
    const q = QUALITY[h.quality] || QUALITY.common;
    return `
      <div class="honor-card ${h.quality}" data-id="${h.id}">
        <span class="quality-tag">${q.name}</span>
        <div class="honor-icon"><i class="${h.icon}"></i></div>
        <div class="font-semibold text-sm md:text-base mb-1 line-clamp-2">${escapeHtml(h.name)}</div>
        <div class="text-xs text-white/60 mb-1">${CATEGORY[h.category] || h.category}</div>
        <div class="text-[11px] text-white/40 mt-auto pt-2 flex items-center gap-1">
          <i class="ri-calendar-line"></i> ${escapeHtml(h.date)}
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
  const q = QUALITY[honor.quality] || QUALITY.common;
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
        ${q.name} · ${CATEGORY[honor.category] || honor.category}
      </div>
      <h3 class="text-2xl font-bold text-wz-gold mb-2">${escapeHtml(honor.name)}</h3>
      <div class="text-xs text-white/50 mb-4">
        <i class="ri-time-line"></i> 获取时间：${escapeHtml(honor.date)}
      </div>
      <div class="text-left bg-white/5 rounded-lg p-4 border border-white/10 mb-3">
        <div class="text-xs text-wz-gold mb-1"><i class="ri-information-line"></i> 荣誉描述</div>
        <p class="text-sm text-white/85 leading-relaxed">${escapeHtml(honor.desc)}</p>
      </div>
      ${honor.reason ? `
      <div class="text-left bg-white/5 rounded-lg p-4 border border-white/10">
        <div class="text-xs text-wz-gold mb-1"><i class="ri-flag-line"></i> 获得理由</div>
        <p class="text-sm text-white/85 leading-relaxed">${escapeHtml(honor.reason)}</p>
      </div>` : ''}
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
  // 个人页点赞大按钮
  const bigLike = $('#personLikeBtn');
  if (bigLike) {
    bigLike.addEventListener('click', async () => {
      const eng = bigLike.dataset.likeEng;
      if (eng) await handleLikeClick(eng);
    });
  }
}
function switchPerson(delta) {
  const p = state.currentPerson;
  if (!p) return;
  const idx = people.findIndex(x => x.id === p.id);
  const next = people[(idx + delta + people.length) % people.length];
  location.hash = `#/person/${next.id}`;
}

// ========= 编辑事件（仅个性签名）=========
function bindEditEvents() {
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
    toast(err.message || '保存失败');
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

// ========= 全局 =========
function bindGlobalEvents() {
  $('#closeModal').addEventListener('click', closeModal);
  $('#honorModal').addEventListener('click', (e) => { if (e.target.id === 'honorModal') closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSimpleModal('loginModal');
      closeSimpleModal('pwdModal');
      closeSimpleModal('formModal');
      closeSimpleModal('avatarModal');
    }
  });
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeSimpleModal(btn.dataset.close));
  });
  ['loginModal', 'pwdModal', 'formModal', 'avatarModal'].forEach(id => {
    const m = document.getElementById(id);
    if (m) m.addEventListener('click', e => { if (e.target === m) closeSimpleModal(id); });
  });
}

function openSimpleModal(id) {
  const m = $('#' + id);
  m.classList.remove('hidden'); m.classList.add('flex');
}
function closeSimpleModal(id) {
  const m = $('#' + id);
  if (!m) return;
  m.classList.add('hidden'); m.classList.remove('flex');
}

// ========= 登录 / 登出 / 改密 =========
function bindAuthEvents() {
  $('#loginBtn').addEventListener('click', openLoginModal);
  $('#doLoginBtn').addEventListener('click', doLogin);
  $('#loginPwd').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  $('#loginUser').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginPwd').focus(); });

  $('#userMenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#userMenuPanel').classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    $('#userMenuPanel').classList.add('hidden');
  });
  $('#userMenuPanel').addEventListener('click', e => {
    e.stopPropagation();
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const act = btn.dataset.action;
    $('#userMenuPanel').classList.add('hidden');
    if (act === 'changePwd') openChangePwd();
    else if (act === 'logout') doLogout();
    else if (act === 'adminPanel') location.hash = '#/admin';
  });

  $('#doPwdBtn').addEventListener('click', doChangePwd);
}

function openLoginModal() {
  $('#loginUser').value = '';
  $('#loginPwd').value = '';
  openSimpleModal('loginModal');
  setTimeout(() => $('#loginUser').focus(), 50);
}

async function doLogin() {
  const u = $('#loginUser').value.trim();
  const p = $('#loginPwd').value;
  if (!u || !p) { toast('请输入账号和密码'); return; }
  const btn = $('#doLoginBtn');
  btn.disabled = true;
  try {
    await apiLogin(u, p);
    closeSimpleModal('loginModal');
    toast('登录成功 ✨');
    updateLoginUI();
    await loadAllPersons();
    await loadLikesSummary();
    handleRoute();
  } catch (e) {
    toast(e.message || '登录失败');
  } finally {
    btn.disabled = false;
  }
}

async function doLogout() {
  await apiLogout();
  updateLoginUI();
  toast('已退出登录');
  state.likedToday = new Set();
  await loadLikesSummary();
  if (location.hash.startsWith('#/admin') || location.hash.startsWith('#/me')) {
    location.hash = '#/people';
  } else {
    handleRoute();
  }
}

function openChangePwd() {
  $('#oldPwd').value = ''; $('#newPwd').value = ''; $('#newPwd2').value = '';
  openSimpleModal('pwdModal');
}

async function doChangePwd() {
  const o = $('#oldPwd').value;
  const n = $('#newPwd').value;
  const n2 = $('#newPwd2').value;
  if (!o || !n) { toast('请填写完整'); return; }
  if (n.length < 4) { toast('新密码至少 4 位'); return; }
  if (n !== n2) { toast('两次输入的新密码不一致'); return; }
  const btn = $('#doPwdBtn');
  btn.disabled = true;
  try {
    await apiChangePassword(o, n);
    closeSimpleModal('pwdModal');
    toast('密码已修改 ✨');
  } catch (e) {
    toast(e.message || '修改失败');
  } finally {
    btn.disabled = false;
  }
}

// ========= 管理台 =========
function bindAdminEvents() {
  $('#adminTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.rank-tab'); if (!btn) return;
    $$('#adminTabs .rank-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.adminTab = btn.dataset.t;
    renderAdmin();
  });
  $('#addPersonBtn').addEventListener('click', () => openPersonForm(null));
  $('#addHonorBtn').addEventListener('click', () => openHonorForm(null));
  $('#adminHonorPerson').addEventListener('change', e => {
    state.adminHonorPerson = e.target.value;
    $('#addHonorBtn').disabled = !state.adminHonorPerson;
    renderAdminHonors();
  });
  $('#addAccountBtn').addEventListener('click', openAccountForm);
  $('#doFormSubmit').addEventListener('click', async () => {
    if (typeof state.formSubmit === 'function') {
      const btn = $('#doFormSubmit');
      btn.disabled = true;
      try { await state.formSubmit(); }
      catch (e) { toast(e.message || '保存失败'); }
      finally { btn.disabled = false; }
    }
  });
  const aft = $('#avatarFilterTabs');
  if (aft) {
    aft.addEventListener('click', (e) => {
      const btn = e.target.closest('.rank-tab'); if (!btn) return;
      $$('#avatarFilterTabs .rank-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.adminAvatarStatus = btn.dataset.s || 'pending';
      renderAdminAvatars();
    });
  }
}

function renderAdmin() {
  if (!isAdmin()) return;
  $$('#adminTabs .rank-tab').forEach(b => b.classList.toggle('active', b.dataset.t === state.adminTab));
  $$('.admin-panel').forEach(p => p.classList.add('hidden'));
  if (state.adminTab === 'person') {
    $('#adminPersonPanel').classList.remove('hidden');
    renderAdminPersons();
  } else if (state.adminTab === 'honor') {
    $('#adminHonorPanel').classList.remove('hidden');
    populateAdminHonorPersonSelect();
    renderAdminHonors();
  } else if (state.adminTab === 'account') {
    $('#adminAccountPanel').classList.remove('hidden');
    renderAdminAccounts();
  } else if (state.adminTab === 'avatar') {
    $('#adminAvatarPanel').classList.remove('hidden');
    renderAdminAvatars();
  }
  refreshAvatarPendingBadge();
}

async function refreshAvatarPendingBadge() {
  if (!isAdmin()) return;
  try {
    const list = await adminListAvatarRequests('pending');
    const badge = $('#avatarPendingBadge');
    if (!badge) return;
    if (Array.isArray(list) && list.length > 0) {
      badge.textContent = list.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (_) {}
}

async function renderAdminAvatars() {
  const container = $('#adminAvatarList');
  if (!container) return;
  container.innerHTML = '<div class="col-span-full p-6 text-center text-white/50 text-sm">加载中...</div>';
  try {
    const list = await adminListAvatarRequests(state.adminAvatarStatus || 'pending');
    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = '<div class="col-span-full p-6 text-center text-white/50 text-sm">暂无相关头像请求</div>';
      return;
    }
    container.innerHTML = list.map(r => {
      const statusMap = {
        pending: { label: '待审核', cls: 'bg-orange-500/20 text-orange-300 border-orange-400/40' },
        approved: { label: '已通过', cls: 'bg-green-500/20 text-green-300 border-green-400/40' },
        rejected: { label: '已拒绝', cls: 'bg-red-500/20 text-red-300 border-red-400/40' }
      };
      const st = statusMap[r.status] || statusMap.pending;
      const showActions = r.status === 'pending';
      return `
        <div class="bg-white/5 border border-wz-gold/20 rounded-xl p-4 flex gap-3" data-id="${r.id}">
          <img src="${escapeHtml(r.previewUrl)}" alt="预览"
               class="w-24 h-24 rounded-xl object-cover border-2 border-wz-gold/40 flex-shrink-0 bg-white/5"
               onerror="this.style.opacity=0.3;" />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold text-wz-gold truncate">${escapeHtml(r.chnName || r.engName)}</span>
              <span class="text-xs text-white/40 truncate">(${escapeHtml(r.engName)})</span>
            </div>
            <div class="text-[11px] text-white/50 mb-1">提交时间：${escapeHtml((r.createdAt || '').replace('T', ' ').slice(0, 16))}</div>
            <span class="inline-block px-2 py-0.5 rounded-full text-[11px] border ${st.cls}">${st.label}</span>
            ${r.reason ? `<div class="text-[11px] text-red-300 mt-1">拒绝原因：${escapeHtml(r.reason)}</div>` : ''}
            ${showActions ? `
              <div class="flex gap-2 mt-3">
                <button class="action-btn" data-act="approve"><i class="ri-check-line"></i>通过</button>
                <button class="action-btn danger" data-act="reject"><i class="ri-close-line"></i>拒绝</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
    container.querySelectorAll('[data-id]').forEach(card => {
      const id = Number(card.dataset.id);
      card.querySelectorAll('[data-act]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const act = btn.dataset.act;
          if (act === 'approve') {
            if (!confirm('通过该头像？')) return;
            try {
              await adminReviewAvatar(id, 'approve');
              toast('已通过 ✔');
              renderAdminAvatars();
              refreshAvatarPendingBadge();
            } catch (e) { toast(e.message || '操作失败'); }
          } else if (act === 'reject') {
            const reason = prompt('拒绝原因（可选）', '') || '';
            try {
              await adminReviewAvatar(id, 'reject', reason);
              toast('已拒绝');
              renderAdminAvatars();
              refreshAvatarPendingBadge();
            } catch (e) { toast(e.message || '操作失败'); }
          }
        });
      });
    });
  } catch (e) {
    container.innerHTML = `<div class="col-span-full p-6 text-center text-red-300 text-sm">加载失败: ${escapeHtml(e.message || '')}</div>`;
  }
}

function renderAdminPersons() {
  const list = $('#adminPersonList');
  if (!people.length) {
    list.innerHTML = '<div class="p-6 text-center text-white/50 text-sm">暂无策划数据</div>';
    return;
  }
  list.innerHTML = people.map(p => `
    <div class="admin-row" data-eng="${escapeHtml(p.engName)}">
      <div class="col-span-3 truncate-cell text-wz-gold font-mono">${escapeHtml(p.engName)}</div>
      <div class="col-span-3 truncate-cell">${escapeHtml(p.name)}</div>
      <div class="col-span-4 truncate-cell text-white/70">${escapeHtml(p.dept)}</div>
      <div class="col-span-2 text-right">
        <button class="action-btn" data-act="editP"><i class="ri-edit-line"></i>编辑</button>
        <button class="action-btn danger" data-act="delP"><i class="ri-delete-bin-line"></i>删除</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.admin-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const eng = row.dataset.eng;
      const person = people.find(x => x.engName === eng);
      if (!person) return;
      if (btn.dataset.act === 'editP') openPersonForm(person);
      else if (btn.dataset.act === 'delP') confirmDelPerson(person);
    });
  });
}

function populateAdminHonorPersonSelect() {
  const sel = $('#adminHonorPerson');
  const cur = state.adminHonorPerson || sel.value;
  sel.innerHTML = '<option value="">-- 请选择 --</option>';
  people.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.engName;
    opt.textContent = `${p.name} (${p.engName})`;
    sel.appendChild(opt);
  });
  if (cur && people.some(p => p.engName === cur)) {
    sel.value = cur;
    state.adminHonorPerson = cur;
  } else {
    state.adminHonorPerson = '';
  }
  $('#addHonorBtn').disabled = !state.adminHonorPerson;
}

function renderAdminHonors() {
  const list = $('#adminHonorList');
  const eng = state.adminHonorPerson;
  if (!eng) {
    list.innerHTML = '<div class="p-6 text-center text-white/50 text-sm">请先选择一位策划</div>';
    return;
  }
  const person = people.find(p => p.engName === eng);
  if (!person || !person.honors.length) {
    list.innerHTML = '<div class="p-6 text-center text-white/50 text-sm">该策划暂无荣誉，点击右上角新增</div>';
    return;
  }
  const sorted = person.honors.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  list.innerHTML = sorted.map(h => `
    <div class="admin-row" data-id="${h.id}">
      <div class="col-span-3 truncate-cell text-wz-gold">${escapeHtml(h.name)}</div>
      <div class="col-span-1 text-center"><span class="quality-pill ${h.quality}">${(QUALITY[h.quality] || QUALITY.common).name}</span></div>
      <div class="col-span-2 text-center text-white/70">${CATEGORY[h.category] || h.category}</div>
      <div class="col-span-2 text-center text-white/70">${escapeHtml(h.date)}</div>
      <div class="col-span-2 truncate-cell text-white/50 text-xs"><i class="${h.icon}"></i> ${escapeHtml(h.icon)}</div>
      <div class="col-span-2 text-right">
        <button class="action-btn" data-act="editH"><i class="ri-edit-line"></i>编辑</button>
        <button class="action-btn danger" data-act="delH"><i class="ri-delete-bin-line"></i>删除</button>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.admin-row').forEach(row => {
    row.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const hid = Number(row.dataset.id);
      const honor = person.honors.find(x => x.id === hid);
      if (!honor) return;
      if (btn.dataset.act === 'editH') openHonorForm(honor);
      else if (btn.dataset.act === 'delH') confirmDelHonor(honor);
    });
  });
}

async function renderAdminAccounts() {
  const list = $('#adminAccountList');
  list.innerHTML = '<div class="p-6 text-center text-white/50 text-sm">加载中...</div>';
  try {
    const accs = await adminListAccounts();
    if (!accs.length) {
      list.innerHTML = '<div class="p-6 text-center text-white/50 text-sm">暂无账号</div>';
      return;
    }
    list.innerHTML = accs.map(a => `
      <div class="admin-row" data-user="${escapeHtml(a.username)}">
        <div class="col-span-3 truncate-cell text-wz-gold">${escapeHtml(a.username)}</div>
        <div class="col-span-2 truncate-cell">${escapeHtml(a.chnName)}</div>
        <div class="col-span-3 truncate-cell text-white/70">${escapeHtml(a.dept)}</div>
        <div class="col-span-1 text-center"><span class="role-pill ${a.role}">${a.role === 'admin' ? '管理员' : '用户'}</span></div>
        <div class="col-span-3 text-right">
          <button class="action-btn" data-act="editAcc"><i class="ri-edit-line"></i>编辑</button>
          <button class="action-btn" data-act="resetPwd"><i class="ri-lock-password-line"></i>重置密码</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('.admin-row').forEach(row => {
      row.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const username = row.dataset.user;
        const acc = accs.find(x => x.username === username);
        if (!acc) return;
        if (btn.dataset.act === 'resetPwd') openResetPwdForm(username);
        else if (btn.dataset.act === 'editAcc') openEditAccountForm(acc);
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="p-6 text-center text-red-300 text-sm">加载失败: ${escapeHtml(e.message || '')}</div>`;
  }
}

// ========= 管理表单 =========
function openFormModal(title, body, submit) {
  $('#formTitle').querySelector('span').textContent = title;
  $('#formBody').innerHTML = body;
  state.formSubmit = submit;
  openSimpleModal('formModal');
}

function field(label, id, type = 'text', value = '', attrs = '') {
  return `
    <div class="form-field">
      <label>${label}</label>
      <input id="${id}" type="${type}" value="${escapeHtml(value)}" ${attrs} />
    </div>`;
}
function selectField(label, id, options, value = '') {
  return `
    <div class="form-field">
      <label>${label}</label>
      <select id="${id}">
        ${options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === value ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
      </select>
    </div>`;
}
function textareaField(label, id, value = '', rows = 2) {
  return `
    <div class="form-field">
      <label>${label}</label>
      <textarea id="${id}" rows="${rows}">${escapeHtml(value)}</textarea>
    </div>`;
}

function openPersonForm(person) {
  const isEdit = !!person;
  const body = isEdit ? `
    ${field('英文名 (唯一)', 'fEng', 'text', person?.engName || '', 'disabled')}
    ${field('中文名', 'fName', 'text', person?.name || '')}
    ${field('部门', 'fDept', 'text', person?.dept || '')}
  ` : `
    ${field('英文名 (唯一)', 'fEng', 'text', '')}
    ${field('中文名', 'fName', 'text', '')}
    ${field('部门', 'fDept', 'text', '')}
  `;
  openFormModal(isEdit ? '编辑策划' : '新增策划', body, async () => {
    if (isEdit) {
      const payload = {
        name: $('#fName').value.trim(),
        dept: $('#fDept').value.trim(),
      };
      if (!payload.name) { toast('中文名必填'); return; }
      await adminUpdatePerson(person.engName, payload);
    } else {
      const payload = {
        engName: $('#fEng').value.trim(),
        name: $('#fName').value.trim(),
        dept: $('#fDept').value.trim(),
      };
      if (!payload.engName || !payload.name) { toast('英文名和中文名必填'); return; }
      await adminCreatePerson(payload);
    }
    closeSimpleModal('formModal');
    toast('保存成功');
    await loadAllPersons();
    renderAdmin();
  });
}

function confirmDelPerson(person) {
  if (!confirm(`确定删除策划 "${person.name}" 吗？\n该操作会级联删除其所有荣誉，不可恢复。`)) return;
  adminDeletePerson(person.engName).then(async () => {
    toast('已删除');
    await loadAllPersons();
    renderAdmin();
  }).catch(e => toast(e.message || '删除失败'));
}

function openHonorForm(honor) {
  const isEdit = !!honor;
  const personEng = isEdit ? honor._personEngName || state.adminHonorPerson : state.adminHonorPerson;
  const person = people.find(p => p.engName === state.adminHonorPerson);
  const qualityOpts = Object.keys(QUALITY).map(k => ({ value: k, label: QUALITY[k].name }));
  const catOpts = Object.keys(CATEGORY).map(k => ({ value: k, label: CATEGORY[k] }));
  const reasonField = isEdit ? textareaField('获得理由', 'fHReason', honor?.reason || '', 2) : '';
  const body = `
    <div class="text-xs text-white/50 mb-1">所属策划：<span class="text-wz-gold">${escapeHtml(person ? person.name : '')}</span> (${escapeHtml(personEng)})</div>
    ${field('荣誉名称', 'fHName', 'text', honor?.name || '')}
    ${selectField('品质', 'fHQuality', qualityOpts, honor?.quality || 'common')}
    ${selectField('分类', 'fHCategory', catOpts, honor?.category || 'achievement')}
    ${field('图标 (RemixIcon class)', 'fHIcon', 'text', honor?.icon || 'ri-medal-fill')}
    ${field('获取日期', 'fHDate', 'date', honor?.date || '')}
    ${textareaField('荣誉描述', 'fHDesc', honor?.desc || '', 2)}
    ${reasonField}
  `;
  openFormModal(isEdit ? '编辑荣誉' : '新增荣誉', body, async () => {
    const payload = {
      name: $('#fHName').value.trim(),
      quality: $('#fHQuality').value,
      category: $('#fHCategory').value,
      icon: $('#fHIcon').value.trim() || 'ri-medal-fill',
      date: $('#fHDate').value,
      description: $('#fHDesc').value.trim(),
    };
    if (isEdit) {
      payload.reason = $('#fHReason') ? $('#fHReason').value.trim() : '';
    }
    if (!payload.name) { toast('荣誉名称必填'); return; }
    if (isEdit) {
      await adminUpdateHonor(honor.id, payload);
    } else {
      await adminCreateHonor({ personEngName: personEng, ...payload });
    }
    closeSimpleModal('formModal');
    toast('保存成功');
    await loadAllPersons();
    renderAdmin();
  });
}

function confirmDelHonor(honor) {
  if (!confirm(`确定删除荣誉 "${honor.name}" 吗？`)) return;
  adminDeleteHonor(honor.id).then(async () => {
    toast('已删除');
    await loadAllPersons();
    renderAdmin();
  }).catch(e => toast(e.message || '删除失败'));
}

function openAccountForm() {
  const body = `
    ${field('用户名（英文，唯一）', 'aUser', 'text', '')}
    ${field('密码（至少 4 位）', 'aPwd', 'password', '')}
    ${field('中文名', 'aChn', 'text', '')}
    ${field('部门', 'aDept', 'text', '')}
    ${selectField('角色', 'aRole', [
      { value: 'user', label: '普通用户' },
      { value: 'admin', label: '管理员' }
    ], 'user')}
  `;
  openFormModal('新增账号', body, async () => {
    const payload = {
      username: $('#aUser').value.trim(),
      password: $('#aPwd').value,
      chnName: $('#aChn').value.trim(),
      dept: $('#aDept').value.trim(),
      positionName: '',
      role: $('#aRole').value
    };
    if (!payload.username || !payload.password) { toast('用户名和密码必填'); return; }
    if (payload.password.length < 4) { toast('密码至少 4 位'); return; }
    await adminCreateAccount(payload);
    closeSimpleModal('formModal');
    toast('账号已创建');
    renderAdminAccounts();
  });
}

function openEditAccountForm(acc) {
  const body = `
    ${field('用户名', 'eUser', 'text', acc.username, 'disabled')}
    ${field('中文名', 'eChn', 'text', acc.chnName || '')}
    ${field('部门', 'eDept', 'text', acc.dept || '')}
    ${selectField('角色', 'eRole', [
      { value: 'user', label: '普通用户' },
      { value: 'admin', label: '管理员' }
    ], acc.role || 'user')}
  `;
  openFormModal('编辑账号', body, async () => {
    const payload = {
      chnName: $('#eChn').value.trim(),
      dept: $('#eDept').value.trim(),
      role: $('#eRole').value
    };
    await adminUpdateAccount(acc.username, payload);
    closeSimpleModal('formModal');
    toast('已更新');
    renderAdminAccounts();
  });
}

function openResetPwdForm(username) {
  const body = `
    <div class="text-xs text-white/50 mb-1">目标账号：<span class="text-wz-gold">${escapeHtml(username)}</span></div>
    ${field('新密码（至少 4 位）', 'rNew', 'password', '')}
    ${field('确认新密码', 'rNew2', 'password', '')}
  `;
  openFormModal('重置密码', body, async () => {
    const n = $('#rNew').value;
    const n2 = $('#rNew2').value;
    if (!n || n.length < 4) { toast('密码至少 4 位'); return; }
    if (n !== n2) { toast('两次密码不一致'); return; }
    await adminResetPassword(username, n);
    closeSimpleModal('formModal');
    toast('密码已重置');
  });
}

// ========= 留言板 =========
function bindMessageEvents() {
  const input = $('#msgInput');
  const submitBtn = $('#msgSubmitBtn');
  const lenEl = $('#msgLen');
  if (input) {
    input.addEventListener('input', () => {
      lenEl.textContent = input.value.length;
    });
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        doSubmitMessage();
      }
    });
  }
  if (submitBtn) submitBtn.addEventListener('click', doSubmitMessage);
}

function refreshMessageUI() {
  const loginTip = $('#msgLoginTip');
  const inputWrap = $('#msgInputWrap');
  if (!loginTip || !inputWrap) return;
  if (currentUser.isLoggedIn) {
    loginTip.classList.add('hidden');
    inputWrap.classList.remove('hidden');
  } else {
    loginTip.classList.remove('hidden');
    inputWrap.classList.add('hidden');
  }
}

async function loadMessages(targetEng) {
  refreshMessageUI();
  const list = $('#msgList');
  const empty = $('#msgEmpty');
  const cnt = $('#msgCount');
  if (!list) return;
  try {
    const msgs = await fetchMessages(100, targetEng || '');
    cnt && (cnt.textContent = msgs.length);
    if (!msgs.length) {
      list.innerHTML = '';
      empty && empty.classList.remove('hidden');
      return;
    }
    empty && empty.classList.add('hidden');
    list.innerHTML = msgs.map(m => {
      const canDel = currentUser.isLoggedIn && (currentUser.accountRole === 'admin' || currentUser.username === m.author);
      const t = (m.createdAt || '').replace('T', ' ').slice(0, 16);
      const bust = state.avatarBust[m.author] || '';
      const av = avatarUrl(m.author) + (bust ? ('?t=' + bust) : '');
      return `
        <div class="msg-item flex gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-wz-gold/30 transition" data-mid="${m.id}">
          <div class="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-wz-dark2 flex items-center justify-center">
            <img src="${av}" class="msg-avatar w-full h-full object-cover"
                 onerror="this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex');" />
            <div class="w-full h-full items-center justify-center" style="display:none;">
              <i class="ri-user-smile-fill text-wz-gold"></i>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-wz-gold text-sm truncate">${escapeHtml(m.authorName || m.author)}</span>
              <span class="text-[11px] text-white/40">${escapeHtml(t)}</span>
              ${canDel ? `<button class="ml-auto text-xs text-red-300 hover:text-red-400" data-del="${m.id}" title="删除"><i class="ri-delete-bin-line"></i></button>` : ''}
            </div>
            <p class="text-sm text-white/85 whitespace-pre-wrap break-words">${escapeHtml(m.content)}</p>
          </div>
        </div>
      `;
    }).join('');
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.del);
        if (!confirm('确定删除这条留言？')) return;
        try {
          await deleteMessage(id);
          toast('已删除');
          if (state.currentPerson) loadMessages(state.currentPerson.engName);
        } catch (e) { toast(e.message || '删除失败'); }
      });
    });
  } catch (e) {
    list.innerHTML = `<div class="p-3 text-center text-red-300 text-xs">留言加载失败：${escapeHtml(e.message || '')}</div>`;
  }
}

async function doSubmitMessage() {
  if (!currentUser.isLoggedIn) { toast('请先登录'); openLoginModal(); return; }
  if (!state.currentPerson) { toast('目标不明'); return; }
  const input = $('#msgInput');
  const content = (input.value || '').trim();
  if (!content) { toast('留言内容不能为空'); return; }
  if (content.length > 500) { toast('留言最多 500 字'); return; }
  const btn = $('#msgSubmitBtn');
  btn.disabled = true;
  try {
    await postMessage(content, state.currentPerson.engName);
    input.value = '';
    $('#msgLen').textContent = '0';
    toast('留言已发布 ✨');
    loadMessages(state.currentPerson.engName);
  } catch (e) {
    toast(e.message || '发布失败');
  } finally {
    btn.disabled = false;
  }
}

// ========= 头像上传 =========
function bindAvatarEvents() {
  const btn = $('#changeAvatarBtn');
  if (btn) btn.addEventListener('click', openAvatarModal);
  const drop = $('#avatarDrop');
  const file = $('#avatarFile');
  if (drop && file) {
    drop.addEventListener('click', () => file.click());
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('border-wz-gold');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('border-wz-gold'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('border-wz-gold');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleAvatarFile(f);
    });
    file.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) handleAvatarFile(f);
    });
  }
  const submit = $('#avatarSubmitBtn');
  if (submit) submit.addEventListener('click', doSubmitAvatar);
  const modal = $('#avatarModal');
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSimpleModal('avatarModal');
  });
}

function openAvatarModal() {
  state.avatarPickedDataUrl = '';
  const preview = $('#avatarPreview');
  const wrap = $('#avatarPreviewWrap');
  const name = $('#avatarFileName');
  const tip = $('#avatarStatusTip');
  const submit = $('#avatarSubmitBtn');
  if (preview) preview.src = '';
  if (wrap) wrap.classList.add('hidden');
  if (name) name.textContent = '';
  if (tip) tip.classList.add('hidden');
  if (submit) submit.disabled = true;
  fetchMyAvatarRequest().then(r => {
    if (!tip) return;
    if (r && r.hasRequest) {
      if (r.status === 'pending') {
        tip.className = 'mt-3 p-2 rounded-lg text-xs bg-orange-500/10 border border-orange-400/40 text-orange-300';
        tip.innerHTML = '<i class="ri-time-line"></i> 你已有头像在审核中，新提交会覆盖旧请求。';
        tip.classList.remove('hidden');
      } else if (r.status === 'rejected') {
        tip.className = 'mt-3 p-2 rounded-lg text-xs bg-red-500/10 border border-red-400/40 text-red-300';
        tip.innerHTML = `<i class="ri-error-warning-line"></i> 上次审核被拒绝${r.reason ? '：' + escapeHtml(r.reason) : ''}，可重新上传。`;
        tip.classList.remove('hidden');
      }
    }
  }).catch(() => {});
  openSimpleModal('avatarModal');
}

function handleAvatarFile(f) {
  if (!/^image\//.test(f.type)) { toast('请选择图片文件'); return; }
  if (f.size > 3 * 1024 * 1024) { toast('图片大小不能超过 3MB'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    state.avatarPickedDataUrl = reader.result || '';
    const preview = $('#avatarPreview');
    const wrap = $('#avatarPreviewWrap');
    const name = $('#avatarFileName');
    if (preview) preview.src = state.avatarPickedDataUrl;
    if (wrap) wrap.classList.remove('hidden');
    if (name) name.textContent = f.name;
    $('#avatarSubmitBtn').disabled = !state.avatarPickedDataUrl;
  };
  reader.readAsDataURL(f);
}

async function doSubmitAvatar() {
  if (!currentUser.isLoggedIn) { toast('请先登录'); return; }
  if (!state.avatarPickedDataUrl) { toast('请选择图片'); return; }
  const btn = $('#avatarSubmitBtn');
  btn.disabled = true;
  try {
    await uploadMyAvatar(state.avatarPickedDataUrl);
    toast('已提交，等待管理员审核 ⏳');
    closeSimpleModal('avatarModal');
    $('#avatarPendingTag').classList.remove('hidden');
  } catch (e) {
    toast(e.message || '上传失败');
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', init);
