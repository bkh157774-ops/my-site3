(function initLumaeMiniPlayerShared() {
  if (window.__lumaeMiniPlayerSharedInit) return;
  window.__lumaeMiniPlayerSharedInit = true;

  var NOW_PLAYING_KEY = 'lumae_now_playing';
  var RUNTIME_KEY = 'lumae_player_runtime_v1';
  var POS_KEY = 'lumae_mini_player_pos';
  var DESIGN_KEY = 'lumae_mini_player_design';
  var CLOSED_TRACK_KEY = 'lumae_mini_player_closed_track_v1';
  var PREVIEW_COVER = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17';
  var SONGS_DB_KEY = 'lumae_songs_db_v17_max';
  var TRACK_MEDIA_DB_NAME = 'lumae_track_media_v1';
  var TRACK_MEDIA_STORE_NAME = 'track_media_files';
  var TRACK_MEDIA_URL_PREFIX = 'idb:';
  var BACKEND_BASE_STORAGE_KEY = 'lumae_backend_base_url';
  var BACKEND_BASE_DEFAULT = 'http://127.0.0.1:8000';

  function readJson(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function isAbsoluteHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
  }

  function getBackendBaseUrl() {
    var fromWindow = typeof window.BACKEND_URL === 'string' ? window.BACKEND_URL : '';
    var fromStorage = localStorage.getItem(BACKEND_BASE_STORAGE_KEY) || '';
    var base = String(fromWindow || fromStorage || BACKEND_BASE_DEFAULT).trim();
    if (!base) base = BACKEND_BASE_DEFAULT;
    return base.replace(/\/+$/, '');
  }

  function toBackendUrl(pathOrUrl) {
    var raw = String(pathOrUrl || '').trim();
    if (!raw) return '';
    if (isAbsoluteHttpUrl(raw)) return raw;
    if (raw.indexOf('blob:') === 0 || raw.indexOf('data:') === 0) return raw;
    if (raw.charAt(0) === '/') return getBackendBaseUrl() + raw;
    return raw;
  }

  function openTrackMediaDB() {
    return new Promise(function(resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not available'));
        return;
      }
      var req = indexedDB.open(TRACK_MEDIA_DB_NAME, 1);
      req.onupgradeneeded = function(event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(TRACK_MEDIA_STORE_NAME)) {
          db.createObjectStore(TRACK_MEDIA_STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error || new Error('IndexedDB open failed')); };
    });
  }

  function loadTrackMediaBlob(trackId) {
    return openTrackMediaDB().then(function(db) {
      return new Promise(function(resolve, reject) {
        var tx = db.transaction([TRACK_MEDIA_STORE_NAME], 'readonly');
        var store = tx.objectStore(TRACK_MEDIA_STORE_NAME);
        var req = store.get(trackId);
        req.onsuccess = function() {
          var row = req.result;
          resolve(row && row.blob ? row.blob : null);
        };
        req.onerror = function() { reject(req.error || new Error('IndexedDB read failed')); };
        tx.oncomplete = function() { try { db.close(); } catch (e) {} };
        tx.onerror = function() { try { db.close(); } catch (e) {} };
      });
    });
  }

  function ensureStyles() {
    if (document.getElementById('lumae-mini-player-style')) return;
    var style = document.createElement('style');
    style.id = 'lumae-mini-player-style';
    style.textContent = [
      '.lumae-mini-player{width:300px;max-width:92vw;touch-action:none;position:fixed;z-index:9998;box-sizing:border-box;cursor:grab;user-select:none;display:none;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.lumae-mini-player .lumae-mini-inner{display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,.97);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(15,23,42,.08);border-radius:16px;box-shadow:0 8px 32px rgba(15,23,42,.1),0 1px 0 rgba(255,255,255,.8) inset;min-height:52px;position:relative;overflow:hidden}',
      '.lumae-mini-player .lumae-mini-row{display:flex;align-items:center;gap:10px;width:100%}',
      '.lumae-mini-player .lumae-mini-bg,.lumae-mini-player .lumae-mini-bg-overlay{display:none}',
      '.lumae-mini-player.compact{width:240px}',
      '.lumae-mini-player.compact .lumae-mini-inner{padding:6px 8px;min-height:40px;gap:8px;border-radius:14px}',
      '.lumae-mini-player.compact .lumae-mini-cover-wrap{width:30px;height:30px;border-radius:8px}',
      '.lumae-mini-player.compact .lumae-mini-title{font-size:11px}',
      '.lumae-mini-player.compact .lumae-mini-controls,.lumae-mini-player.compact .lumae-mini-progress-wrap,.lumae-mini-player.compact .lumae-mini-link,.lumae-mini-player.compact .lumae-mini-style-btn{display:none!important}',
      '.lumae-mini-player.cinema{width:min(360px,92vw)}',
      '.lumae-mini-player.cinema .lumae-mini-inner{padding:0;border:none;border-radius:18px;min-height:64px;background:#0f172a;box-shadow:0 12px 40px rgba(15,23,42,.28);display:block}',
      '.lumae-mini-player.cinema .lumae-mini-bg,.lumae-mini-player.cinema .lumae-mini-bg-overlay{display:block}',
      '.lumae-mini-player.cinema .lumae-mini-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(18px) saturate(1.2);transform:scale(1.15);opacity:.55}',
      '.lumae-mini-player.cinema .lumae-mini-bg-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,23,42,.82) 0%,rgba(15,23,42,.45) 55%,rgba(15,23,42,.72) 100%)}',
      '.lumae-mini-player.cinema .lumae-mini-row{position:relative;z-index:1;display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px}',
      '.lumae-mini-player.cinema .lumae-mini-cover-wrap{width:42px;height:42px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.35)}',
      '.lumae-mini-player.cinema .lumae-mini-title{color:#fff;font-size:13px}',
      '.lumae-mini-player.cinema .lumae-mini-ctrl{color:rgba(255,255,255,.82)}',
      '.lumae-mini-player.cinema .lumae-mini-ctrl:hover{background:rgba(255,255,255,.12);color:#fff}',
      '.lumae-mini-player.cinema .lumae-mini-play-btn{background:#fff;color:#0f172a;box-shadow:0 4px 14px rgba(0,0,0,.2)}',
      '.lumae-mini-player.cinema .lumae-mini-progress-wrap{height:3px;background:rgba(255,255,255,.18);border-radius:999px;margin-top:6px}',
      '.lumae-mini-player.cinema .lumae-mini-progress{background:linear-gradient(90deg,#f472b6,#fb7185);border-radius:999px}',
      '.lumae-mini-player.cinema .lumae-mini-link{color:rgba(255,255,255,.7)}',
      '.lumae-mini-player.cinema .lumae-mini-size-btn,.lumae-mini-player.cinema .lumae-mini-style-btn{border-color:rgba(255,255,255,.16);background:rgba(255,255,255,.1);color:#fff}',
      '.lumae-mini-cover-wrap{width:40px;height:40px;border-radius:10px;overflow:hidden;background:#e2e8f0;position:relative;flex-shrink:0;box-shadow:0 2px 8px rgba(15,23,42,.08)}',
      '.lumae-mini-cover-img{width:100%;height:100%;object-fit:cover;display:block}',
      '.lumae-mini-cover-play{position:absolute;inset:0;margin:auto;width:14px;height:14px;color:#64748b;pointer-events:none}',
      '.lumae-mini-info{flex:1;min-width:0}',
      '.lumae-mini-title{font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.01em}',
      '.lumae-mini-controls{display:flex;align-items:center;gap:2px;margin-top:3px}',
      '.lumae-mini-ctrl{font-size:14px;color:#64748b;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:50%;border:none;background:transparent;padding:0;transition:background .15s,color .15s}',
      '.lumae-mini-ctrl:hover{background:rgba(15,23,42,.06);color:#0f172a}',
      '.lumae-mini-play-btn{width:34px;height:34px;border-radius:50%;background:#0f172a;border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;transition:transform .15s,box-shadow .15s;box-shadow:0 4px 12px rgba(15,23,42,.18)}',
      '.lumae-mini-play-btn:hover{transform:scale(1.04)}',
      '.lumae-mini-play-btn svg{width:14px;height:14px}',
      '.lumae-mini-progress-wrap{height:3px;background:rgba(15,23,42,.08);border-radius:999px;margin-top:5px;overflow:hidden}',
      '.lumae-mini-progress{height:100%;width:0;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:999px;transition:width .15s}',
      '.lumae-mini-link{font-size:11px;color:#94a3b8;text-decoration:none;padding:4px 6px;white-space:nowrap;font-weight:500}',
      '.lumae-mini-size-btn,.lumae-mini-style-btn{width:26px;height:26px;border-radius:8px;border:1px solid rgba(15,23,42,.08);background:rgba(248,250,252,.9);color:#64748b;cursor:pointer;font-size:13px;line-height:1;padding:0;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s,color .15s}',
      '.lumae-mini-size-btn:hover,.lumae-mini-style-btn:hover{background:#fff;border-color:rgba(15,23,42,.14);color:#0f172a}',
      '.lumae-msm-overlay{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.42);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:lumaeMsmFade .2s ease}',
      '.lumae-msm-overlay.open{display:flex}',
      '@keyframes lumaeMsmFade{from{opacity:0}to{opacity:1}}',
      '@keyframes lumaeMsmPop{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}',
      '.lumae-msm-card{width:100%;max-width:420px;background:#fff;border-radius:24px;padding:22px 22px 18px;box-shadow:0 24px 80px rgba(15,23,42,.22),0 1px 0 rgba(255,255,255,.9) inset;border:1px solid rgba(15,23,42,.06);animation:lumaeMsmPop .28s cubic-bezier(.22,1,.36,1);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}',
      '.lumae-msm-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}',
      '.lumae-msm-header h2{margin:0;font-size:18px;font-weight:700;color:#0f172a;letter-spacing:-.02em}',
      '.lumae-msm-close{width:34px;height:34px;border-radius:50%;border:none;background:#f1f5f9;color:#64748b;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}',
      '.lumae-msm-close:hover{background:#e2e8f0;color:#0f172a}',
      '.lumae-msm-label{font-size:11px;font-weight:700;letter-spacing:.08em;color:#94a3b8;margin:0 0 12px}',
      '.lumae-msm-options{display:flex;flex-direction:column;gap:10px}',
      '.lumae-msm-option{border:1.5px solid #e2e8f0;border-radius:18px;padding:12px 14px 14px;background:#fafbfc;cursor:pointer;transition:border-color .18s,background .18s,box-shadow .18s,transform .18s}',
      '.lumae-msm-option:hover{border-color:#cbd5e1;background:#fff;box-shadow:0 6px 20px rgba(15,23,42,.06)}',
      '.lumae-msm-option.selected{border-color:#6366f1;background:linear-gradient(180deg,#f5f3ff 0%,#faf5ff 100%);box-shadow:0 0 0 1px rgba(99,102,241,.12),0 8px 24px rgba(99,102,241,.12)}',
      '.lumae-msm-option-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}',
      '.lumae-msm-option-title{font-size:14px;font-weight:700;color:#0f172a}',
      '.lumae-msm-badge{font-size:11px;font-weight:600;color:#6366f1;background:rgba(99,102,241,.12);padding:2px 8px;border-radius:999px}',
      '.lumae-msm-preview{pointer-events:none}',
      '.lumae-msm-preview-cinema{height:54px;border-radius:12px;overflow:hidden;position:relative;background:#0f172a;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}',
      '.lumae-msm-preview-cinema img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.65;filter:blur(1px)}',
      '.lumae-msm-preview-cinema .shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,23,42,.75),rgba(15,23,42,.25) 60%,rgba(15,23,42,.7))}',
      '.lumae-msm-preview-cinema .row{position:relative;z-index:1;display:flex;align-items:center;justify-content:flex-end;gap:8px;height:100%;padding:0 12px}',
      '.lumae-msm-dot{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.22)}',
      '.lumae-msm-preview-classic,.lumae-msm-preview-compact{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border-radius:12px;border:1px solid rgba(15,23,42,.06);box-shadow:0 2px 8px rgba(15,23,42,.04)}',
      '.lumae-msm-thumb{width:34px;height:34px;border-radius:8px;object-fit:cover;flex-shrink:0}',
      '.lumae-msm-preview-compact .lumae-msm-thumb{width:26px;height:26px}',
      '.lumae-msm-lines{flex:1;min-width:0}',
      '.lumae-msm-line{height:6px;border-radius:999px;background:#e2e8f0;margin-bottom:6px}',
      '.lumae-msm-line.short{width:58%}',
      '.lumae-msm-line.thin{height:3px;width:72%;margin-bottom:0;background:linear-gradient(90deg,#f472b6,#fb7185)}',
      '.lumae-msm-play{width:30px;height:30px;border-radius:50%;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}',
      '.lumae-msm-play svg{width:12px;height:12px}',
      '.lumae-msm-preview-compact .lumae-msm-line.thin{width:55%}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMarkup() {
    if (document.getElementById('lumae-mini-player')) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="lumae-mini-player" class="lumae-mini-player">' +
        '<div class="lumae-mini-inner">' +
          '<div class="lumae-mini-bg" id="lumae-mini-bg" aria-hidden="true"></div>' +
          '<div class="lumae-mini-bg-overlay" aria-hidden="true"></div>' +
          '<div class="lumae-mini-row">' +
            '<div class="lumae-mini-cover-wrap">' +
              '<img id="lumae-mini-cover" src="" alt="" class="lumae-mini-cover-img">' +
              '<svg class="lumae-mini-cover-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>' +
            '</div>' +
            '<div class="lumae-mini-info">' +
              '<div id="lumae-mini-title" class="lumae-mini-title">Untitled</div>' +
              '<div class="lumae-mini-controls">' +
                '<button type="button" id="lumae-mini-restart" class="lumae-mini-ctrl" aria-label="Restart">&#8635;</button>' +
                '<button type="button" id="lumae-mini-prev" class="lumae-mini-ctrl" aria-label="Previous">&#9198;</button>' +
                '<button type="button" id="lumae-mini-play" class="lumae-mini-play-btn" aria-label="Play/Pause">' +
                  '<svg id="lumae-mini-play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>' +
                '</button>' +
                '<button type="button" id="lumae-mini-next" class="lumae-mini-ctrl" aria-label="Next">&#9197;</button>' +
                '<button type="button" id="lumae-mini-heart" class="lumae-mini-ctrl" title="Like">&#9825;</button>' +
              '</div>' +
              '<div class="lumae-mini-progress-wrap"><div id="lumae-mini-progress" class="lumae-mini-progress"></div></div>' +
            '</div>' +
            '<a href="music.html" class="lumae-mini-link">Музыка</a>' +
            '<button type="button" id="lumae-mini-style" class="lumae-mini-style-btn" title="Сменить дизайн" aria-label="Сменить дизайн">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"></circle><circle cx="17.5" cy="10.5" r="2.5"></circle><circle cx="8.5" cy="7.5" r="2.5"></circle><circle cx="6.5" cy="12.5" r="2.5"></circle><path d="M12 22c4.418 0 8-3.582 8-8 0-1.2-.27-2.34-.75-3.36"></path></svg>' +
            '</button>' +
            '<button type="button" id="lumae-mini-size" class="lumae-mini-size-btn" title="Закрыть" aria-label="Закрыть">&times;</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="lumae-mini-style-modal" class="lumae-msm-overlay" aria-hidden="true">' +
        '<div class="lumae-msm-card" role="dialog" aria-modal="true" aria-labelledby="lumae-msm-title">' +
          '<div class="lumae-msm-header">' +
            '<h2 id="lumae-msm-title">Сменить мини-плеер</h2>' +
            '<button type="button" class="lumae-msm-close" id="lumae-msm-close" aria-label="Закрыть">&times;</button>' +
          '</div>' +
          '<div class="lumae-msm-label">ВЫБЕРИТЕ ДИЗАЙН</div>' +
          '<div class="lumae-msm-options" id="lumae-msm-options"></div>' +
        '</div>' +
      '</div>' +
      '<audio id="lumae-mini-audio" preload="metadata" style="display:none;"></audio>'
    );
  }

  function syncRuntimeFromNowPlaying(nowPlaying) {
    if (!nowPlaying || typeof nowPlaying !== 'object') return;
    var runtime = readJson(RUNTIME_KEY) || {};
    runtime.trackId = nowPlaying.trackId || runtime.trackId || '';
    if (Number.isFinite(Number(nowPlaying.trackIndex))) runtime.trackIndex = Math.floor(Number(nowPlaying.trackIndex));
    if (Number.isFinite(Number(nowPlaying.currentTime))) runtime.currentTime = Math.max(0, Number(nowPlaying.currentTime));
    if (Number.isFinite(Number(nowPlaying.duration))) runtime.duration = Math.max(0, Number(nowPlaying.duration));
    if (Number.isFinite(Number(nowPlaying.volume))) runtime.volume = Math.max(0, Math.min(1, Number(nowPlaying.volume)));
    if (typeof nowPlaying.muted === 'boolean') runtime.muted = !!nowPlaying.muted;
    runtime.paused = !nowPlaying.isPlaying;
    runtime.savedAt = Date.now();
    writeJson(RUNTIME_KEY, runtime);
  }

  function patchNowPlaying(patch) {
    var prev = readJson(NOW_PLAYING_KEY);
    if (!prev || !prev.url) return null;
    var next = Object.assign({}, prev, patch || {});
    next.savedAt = Date.now();
    writeJson(NOW_PLAYING_KEY, next);
    syncRuntimeFromNowPlaying(next);
    return next;
  }

  function readSongsFromStorage() {
    try {
      var raw = localStorage.getItem(SONGS_DB_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function(track) {
        return track && typeof track === 'object' && typeof track.url === 'string' && track.url.trim();
      });
    } catch (e) {
      return [];
    }
  }

  function findTrackIndexInList(trackList, nowState) {
    if (!Array.isArray(trackList) || !trackList.length) return -1;
    if (nowState && nowState.trackId) {
      var byId = trackList.findIndex(function(t) { return t && t.id === nowState.trackId; });
      if (byId >= 0) return byId;
    }
    if (nowState && Number.isFinite(Number(nowState.trackIndex))) {
      var idx = Math.floor(Number(nowState.trackIndex));
      if (idx >= 0 && idx < trackList.length) return idx;
    }
    if (nowState && nowState.url) {
      var byUrl = trackList.findIndex(function(t) { return String(t && t.url || '') === String(nowState.url); });
      if (byUrl >= 0) return byUrl;
    }
    return -1;
  }

  function buildNowPlayingFromTrack(track, trackIndex) {
    if (!track || !track.url) return null;
    var safeCover = track.cover || track.coverUrl || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17';
    return {
      v: 2,
      trackId: track.id || '',
      trackIndex: Number.isFinite(Number(trackIndex)) ? Number(trackIndex) : 0,
      title: track.title || 'Без названия',
      artist: track.artist || 'Неизвестный исполнитель',
      url: String(track.url || ''),
      cover: safeCover,
      coverUrl: safeCover,
      liked: !!track.liked,
      currentTime: 0,
      duration: Number.isFinite(Number(track.duration)) ? Math.max(0, Number(track.duration)) : 0,
      isPlaying: true,
      isVideo: !!track.isVideo,
      savedAt: Date.now()
    };
  }

  ensureStyles();
  ensureMarkup();

  var el = document.getElementById('lumae-mini-player');
  var coverEl = document.getElementById('lumae-mini-cover');
  var titleEl = document.getElementById('lumae-mini-title');
  var restartBtn = document.getElementById('lumae-mini-restart');
  var prevBtn = document.getElementById('lumae-mini-prev');
  var playBtn = document.getElementById('lumae-mini-play');
  var nextBtn = document.getElementById('lumae-mini-next');
  var playIcon = document.getElementById('lumae-mini-play-icon');
  var heartEl = document.getElementById('lumae-mini-heart');
  var progressEl = document.getElementById('lumae-mini-progress');
  var sizeBtn = document.getElementById('lumae-mini-size');
  var styleBtn = document.getElementById('lumae-mini-style');
  var bgEl = document.getElementById('lumae-mini-bg');
  var styleModal = document.getElementById('lumae-mini-style-modal');
  var styleModalClose = document.getElementById('lumae-msm-close');
  var styleOptionsEl = document.getElementById('lumae-msm-options');
  var audio = document.getElementById('lumae-mini-audio');
  if (!el || !audio) return;

  var state = null;
  var playerDesign = 'classic';
  var dragging = false;
  var startX = 0;
  var startY = 0;
  var startLeft = 0;
  var startTop = 0;
  var lastProgressSave = 0;
  var suspendPauseWrite = false;
  var refreshToken = 0;
  var activeBlobUrl = '';
  var pos = { x: 50, y: 85 };

  function setPauseWriteSuspended(ms) {
    suspendPauseWrite = true;
    setTimeout(function() {
      suspendPauseWrite = false;
    }, Math.max(100, Number(ms) || 280));
  }

  function updatePlayIcon() {
    if (!playIcon) return;
    if (audio.paused) playIcon.innerHTML = '<path d="M8 5v14l11-7z"></path>';
    else playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>';
  }

  function updateHeartIcon() {
    if (!heartEl) return;
    var liked = !!(state && state.liked);
    heartEl.textContent = liked ? '\u2665' : '\u2661';
    heartEl.style.color = liked ? '#e53935' : '';
  }

  function updateProgress() {
    if (!progressEl) return;
    var duration = Number(audio.duration);
    if (!Number.isFinite(duration) || duration <= 0) {
      progressEl.style.width = '0%';
      return;
    }
    var progress = Math.max(0, Math.min(100, (audio.currentTime / duration) * 100));
    progressEl.style.width = progress.toFixed(2) + '%';
  }

  function applyPos() {
    el.style.left = pos.x + '%';
    el.style.top = pos.y + '%';
    el.style.bottom = 'auto';
    el.style.transform = 'translate(-50%, -50%)';
  }

  function savePos() {
    writeJson(POS_KEY, { x: pos.x, y: pos.y });
  }

  function loadDesign() {
    try {
      var stored = localStorage.getItem(DESIGN_KEY);
      if (stored === 'cinema' || stored === 'classic' || stored === 'compact') return stored;
      if (localStorage.getItem('lumae_mini_player_compact') === '1') return 'compact';
    } catch (e) {}
    return 'classic';
  }

  function saveDesign(design) {
    try { localStorage.setItem(DESIGN_KEY, design); } catch (e) {}
    if (design === 'compact') {
      try { localStorage.setItem('lumae_mini_player_compact', '1'); } catch (e) {}
    } else {
      try { localStorage.setItem('lumae_mini_player_compact', '0'); } catch (e) {}
    }
  }

  function applyDesign(design) {
    playerDesign = design === 'cinema' || design === 'compact' ? design : 'classic';
    el.classList.remove('compact', 'cinema');
    if (playerDesign === 'compact') el.classList.add('compact');
    if (playerDesign === 'cinema') el.classList.add('cinema');
    updateCinemaBackground();
    refreshStyleModalSelection();
  }

  function updateCinemaBackground() {
    if (!bgEl) return;
    var cover = (coverEl && coverEl.src) || PREVIEW_COVER;
    bgEl.style.backgroundImage = 'url("' + String(cover).replace(/"/g, '') + '")';
  }

  function buildStyleModal() {
    if (!styleOptionsEl || styleOptionsEl.__built) return;
    styleOptionsEl.__built = true;
    var designs = [
      { id: 'cinema', title: 'Кино' },
      { id: 'classic', title: 'Классика' },
      { id: 'compact', title: 'Компакт' }
    ];
    styleOptionsEl.innerHTML = designs.map(function(item) {
      var preview = '';
      if (item.id === 'cinema') {
        preview =
          '<div class="lumae-msm-preview lumae-msm-preview-cinema">' +
            '<img src="' + PREVIEW_COVER + '" alt="">' +
            '<div class="shade"></div>' +
            '<div class="row"><div class="lumae-msm-dot"></div><div class="lumae-msm-dot"></div></div>' +
          '</div>';
      } else if (item.id === 'classic') {
        preview =
          '<div class="lumae-msm-preview lumae-msm-preview-classic">' +
            '<img class="lumae-msm-thumb" src="' + PREVIEW_COVER + '" alt="">' +
            '<div class="lumae-msm-lines">' +
              '<div class="lumae-msm-line"></div>' +
              '<div class="lumae-msm-line short"></div>' +
              '<div class="lumae-msm-line thin"></div>' +
            '</div>' +
            '<div class="lumae-msm-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg></div>' +
            '<div class="lumae-msm-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"></path></svg></div>' +
          '</div>';
      } else {
        preview =
          '<div class="lumae-msm-preview lumae-msm-preview-compact">' +
            '<img class="lumae-msm-thumb" src="' + PREVIEW_COVER + '" alt="">' +
            '<div class="lumae-msm-lines">' +
              '<div class="lumae-msm-line"></div>' +
              '<div class="lumae-msm-line thin"></div>' +
            '</div>' +
            '<div class="lumae-msm-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg></div>' +
          '</div>';
      }
      return (
        '<button type="button" class="lumae-msm-option" data-design="' + item.id + '">' +
          '<div class="lumae-msm-option-head">' +
            '<span class="lumae-msm-option-title">' + item.title + '</span>' +
            '<span class="lumae-msm-badge" hidden>Выбрано</span>' +
          '</div>' +
          preview +
        '</button>'
      );
    }).join('');

    styleOptionsEl.querySelectorAll('.lumae-msm-option').forEach(function(option) {
      option.addEventListener('click', function() {
        var next = option.getAttribute('data-design') || 'classic';
        saveDesign(next);
        applyDesign(next);
        closeStyleModal();
      });
    });
  }

  function refreshStyleModalSelection() {
    if (!styleOptionsEl) return;
    styleOptionsEl.querySelectorAll('.lumae-msm-option').forEach(function(option) {
      var active = option.getAttribute('data-design') === playerDesign;
      option.classList.toggle('selected', active);
      var badge = option.querySelector('.lumae-msm-badge');
      if (badge) badge.hidden = !active;
    });
  }

  function openStyleModal() {
    buildStyleModal();
    refreshStyleModalSelection();
    if (!styleModal) return;
    styleModal.classList.add('open');
    styleModal.setAttribute('aria-hidden', 'false');
  }

  function closeStyleModal() {
    if (!styleModal) return;
    styleModal.classList.remove('open');
    styleModal.setAttribute('aria-hidden', 'true');
  }

  function loadOverlaySettings() {
    var storedPos = readJson(POS_KEY);
    if (storedPos && Number.isFinite(Number(storedPos.x)) && Number.isFinite(Number(storedPos.y))) {
      pos.x = Number(storedPos.x);
      pos.y = Number(storedPos.y);
    }
    applyDesign(loadDesign());
    applyPos();
  }

  function getTrackToken(nowState) {
    if (!nowState || typeof nowState !== 'object') return '';
    var trackId = String(nowState.trackId || '').trim();
    if (trackId) return 'id:' + trackId;
    var url = String(nowState.url || '').trim();
    if (url) return 'url:' + url;
    return '';
  }

  function getClosedTrackToken() {
    try { return String(localStorage.getItem(CLOSED_TRACK_KEY) || ''); } catch (e) { return ''; }
  }

  function clearClosedTrackToken() {
    try { localStorage.removeItem(CLOSED_TRACK_KEY); } catch (e) {}
  }

  function hideMiniPlayerLocally() {
    el.style.display = 'none';
    setPauseWriteSuspended(200);
    try { audio.pause(); } catch (e) {}
    audio.removeAttribute('src');
    audio.removeAttribute('data-source-key');
    revokeActiveBlobUrl();
    updatePlayIcon();
    updateHeartIcon();
    updateProgress();
  }

  function closeMiniPlayerEverywhere() {
    var current = readJson(NOW_PLAYING_KEY) || state || null;
    var token = getTrackToken(current);
    if (token) {
      try { localStorage.setItem(CLOSED_TRACK_KEY, token); } catch (e) {}
    }
    hideMiniPlayerLocally();
  }

  function revokeActiveBlobUrl() {
    if (activeBlobUrl && activeBlobUrl.indexOf('blob:') === 0) {
      try { URL.revokeObjectURL(activeBlobUrl); } catch (e) {}
    }
    activeBlobUrl = '';
  }

  function resolveIdbTrackId(rawUrl, fallbackTrackId) {
    var fromUrl = String(rawUrl || '').slice(TRACK_MEDIA_URL_PREFIX.length).trim();
    if (fromUrl) return fromUrl;
    return String(fallbackTrackId || '').trim();
  }

  async function resolvePlayableSrc(nowState) {
    if (!nowState || !nowState.url) return '';
    var raw = String(nowState.url || '');
    if (raw.indexOf(TRACK_MEDIA_URL_PREFIX) !== 0) return toBackendUrl(raw);

    var trackId = resolveIdbTrackId(raw, nowState.trackId);
    if (!trackId) return '';
    try {
      var blob = await loadTrackMediaBlob(trackId);
      if (!blob) return '';
      revokeActiveBlobUrl();
      activeBlobUrl = URL.createObjectURL(blob);
      return activeBlobUrl;
    } catch (e) {
      console.warn('Mini player: failed to load IndexedDB media', e);
      return '';
    }
  }

  function switchToTrackByOffset(offset) {
    var songs = readSongsFromStorage();
    if (!songs.length) return;
    var current = readJson(NOW_PLAYING_KEY) || state || {};
    var currentIndex = findTrackIndexInList(songs, current);
    if (currentIndex < 0) currentIndex = 0;
    var delta = Number(offset);
    if (!Number.isFinite(delta)) delta = 0;
    var nextIndex = (currentIndex + delta + songs.length) % songs.length;
    var nextTrack = songs[nextIndex];
    var nextState = buildNowPlayingFromTrack(nextTrack, nextIndex);
    if (!nextState) return;

    clearClosedTrackToken();
    writeJson(NOW_PLAYING_KEY, nextState);
    syncRuntimeFromNowPlaying(nextState);
    state = nextState;
    renderFromStorage();
  }

  function restartCurrentTrack() {
    if (!state || !state.url) return;
    try { audio.currentTime = 0; } catch (e) {}
    var p = audio.play();
    if (p && typeof p.catch === 'function') p.catch(function() {});
    state = patchNowPlaying({ currentTime: 0, isPlaying: true }) || state;
    updateProgress();
    updatePlayIcon();
  }

  async function renderFromStorage() {
    var token = ++refreshToken;
    var nextState = readJson(NOW_PLAYING_KEY);

    if (!nextState || !nextState.url) {
      state = null;
      hideMiniPlayerLocally();
      return;
    }

    var currentToken = getTrackToken(nextState);
    var closedToken = getClosedTrackToken();
    if (closedToken && closedToken === currentToken) {
      state = nextState;
      hideMiniPlayerLocally();
      return;
    }
    if (closedToken && currentToken && closedToken !== currentToken) {
      clearClosedTrackToken();
    }

    state = nextState;
    el.style.display = 'block';
    coverEl.src = state.cover || state.coverUrl || PREVIEW_COVER;
    titleEl.textContent = (state.title || '').trim() || 'Untitled';
    updateCinemaBackground();
    updateHeartIcon();

    var runtimeState = readJson(RUNTIME_KEY) || {};
    var volumeFromState = Number.isFinite(Number(state.volume)) ? Number(state.volume) : Number(runtimeState.volume);
    var mutedFromState = (typeof state.muted === 'boolean') ? !!state.muted : !!runtimeState.muted;
    var appliedVolume = Number.isFinite(volumeFromState) ? Math.max(0, Math.min(1, volumeFromState)) : 1;
    audio.volume = appliedVolume;
    audio.muted = mutedFromState;

    var sourceKey = String(state.url || '');
    var currentSourceKey = String(audio.getAttribute('data-source-key') || '');
    var sourceChanged = currentSourceKey !== sourceKey;

    if (sourceChanged) {
      setPauseWriteSuspended(450);
      var resolvedSrc = await resolvePlayableSrc(state);
      if (token !== refreshToken) return;
      if (!resolvedSrc) {
        console.warn('Mini player: no playable src for track', sourceKey);
        return;
      }
      audio.src = resolvedSrc;
      audio.setAttribute('data-source-key', sourceKey);
      try { audio.load(); } catch (e) {}
    }

    var targetTime = Number(state.currentTime);
    if (Number.isFinite(targetTime) && targetTime >= 0) {
      var shouldSeek = sourceChanged || (audio.paused && Math.abs((audio.currentTime || 0) - targetTime) > 1.2);
      if (shouldSeek) {
        try {
          audio.currentTime = targetTime;
        } catch (e) {
          audio.addEventListener('loadedmetadata', function applySeekOnce() {
            try { audio.currentTime = targetTime; } catch (err) {}
          }, { once: true });
        }
      }
    }

    updateProgress();
    updatePlayIcon();

    if (state.isPlaying) {
      try {
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function() {});
        }
      } catch (e) {}
    } else if (!audio.paused) {
      setPauseWriteSuspended(220);
      try { audio.pause(); } catch (e) {}
      updatePlayIcon();
    }
  }

  function togglePlay() {
    if (!state || !state.url) return;
    if (audio.paused) {
      var p = audio.play();
      if (p && typeof p.then === 'function') {
        p.then(function() {
          state = patchNowPlaying({
            isPlaying: true,
            volume: Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 1,
            muted: !!audio.muted
          }) || state;
          updatePlayIcon();
        }).catch(function() {});
      } else {
        state = patchNowPlaying({
          isPlaying: true,
          volume: Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 1,
          muted: !!audio.muted
        }) || state;
        updatePlayIcon();
      }
      return;
    }

    setPauseWriteSuspended(220);
    audio.pause();
    state = patchNowPlaying({
      isPlaying: false,
      currentTime: audio.currentTime || 0,
      volume: Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 1,
      muted: !!audio.muted
    }) || state;
    updatePlayIcon();
    renderFromStorage();
  }

  function bindCtrl(btn, handler) {
    if (!btn || typeof handler !== 'function') return;
    btn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); });
    btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); handler(); });
    btn.addEventListener('touchend', function(e) { e.preventDefault(); e.stopPropagation(); handler(); });
  }

  loadOverlaySettings();
  renderFromStorage();

  bindCtrl(playBtn, togglePlay);
  bindCtrl(restartBtn, restartCurrentTrack);
  bindCtrl(prevBtn, function() { switchToTrackByOffset(-1); });
  bindCtrl(nextBtn, function() { switchToTrackByOffset(1); });
  bindCtrl(heartEl, function() {
    if (!state) return;
    var liked = !state.liked;
    state = patchNowPlaying({ liked: liked }) || state;
    state.liked = liked;
    updateHeartIcon();
  });

  if (styleBtn) {
    bindCtrl(styleBtn, openStyleModal);
  }

  if (styleModal) {
    styleModal.addEventListener('click', function(e) {
      if (e.target === styleModal) closeStyleModal();
    });
  }
  if (styleModalClose) {
    styleModalClose.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeStyleModal();
    });
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && styleModal && styleModal.classList.contains('open')) closeStyleModal();
  });

  if (sizeBtn) {
    sizeBtn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); });
    sizeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeMiniPlayerEverywhere();
    });
    sizeBtn.addEventListener('touchend', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeMiniPlayerEverywhere();
    });
  }

  audio.addEventListener('play', function() {
    updatePlayIcon();
    state = patchNowPlaying({
      isPlaying: true,
      volume: Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 1,
      muted: !!audio.muted
    }) || state;
  });

  audio.addEventListener('pause', function() {
    updatePlayIcon();
    if (suspendPauseWrite) return;
    state = patchNowPlaying({
      isPlaying: false,
      currentTime: audio.currentTime || 0,
      volume: Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 1,
      muted: !!audio.muted
    }) || state;
  });

  audio.addEventListener('timeupdate', function() {
    updateProgress();
    var now = Date.now();
    if (now - lastProgressSave < 350) return;
    lastProgressSave = now;
    state = patchNowPlaying({
      currentTime: Number(audio.currentTime) || 0,
      duration: Number(audio.duration) || 0,
      isPlaying: !audio.paused,
      volume: Number.isFinite(Number(audio.volume)) ? Number(audio.volume) : 1,
      muted: !!audio.muted
    }) || state;
  });

  audio.addEventListener('error', function() {
    if (!state || !state.url) return;
    setTimeout(function() {
      renderFromStorage();
    }, 120);
  });

  el.querySelectorAll('.lumae-mini-ctrl').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) { e.preventDefault(); e.stopPropagation(); });
  });

  el.addEventListener('mousedown', function(e) {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.lumae-mini-ctrl')) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = pos.x;
    startTop = pos.y;
    el.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var dx = ((e.clientX - startX) / window.innerWidth) * 100;
    var dy = ((e.clientY - startY) / window.innerHeight) * 100;
    pos.x = Math.max(2, Math.min(98, startLeft + dx));
    pos.y = Math.max(5, Math.min(95, startTop + dy));
    applyPos();
  });

  window.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    el.style.cursor = 'grab';
    savePos();
  });

  el.addEventListener('touchstart', function(e) {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.lumae-mini-ctrl')) return;
    if (!e.touches || !e.touches.length) return;
    dragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startLeft = pos.x;
    startTop = pos.y;
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (!dragging || !e.touches || !e.touches.length) return;
    var dx = ((e.touches[0].clientX - startX) / window.innerWidth) * 100;
    var dy = ((e.touches[0].clientY - startY) / window.innerHeight) * 100;
    pos.x = Math.max(2, Math.min(98, startLeft + dx));
    pos.y = Math.max(5, Math.min(95, startTop + dy));
    applyPos();
  }, { passive: true });

  window.addEventListener('touchend', function() {
    if (!dragging) return;
    dragging = false;
    savePos();
  });

  window.addEventListener('storage', function(e) {
    if (e && (e.key === NOW_PLAYING_KEY || e.key === SONGS_DB_KEY || e.key === CLOSED_TRACK_KEY)) renderFromStorage();
    if (e && e.key === DESIGN_KEY) applyDesign(loadDesign());
  });

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) renderFromStorage();
  });

  window.addEventListener('beforeunload', function() {
    revokeActiveBlobUrl();
  });

  window.openLumaeMiniPlayerStyleModal = openStyleModal;
})();
