import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

let store;
const stateKey = 'state.json';

export const config = { path: '/api/*' };

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS'
  }
});

const createId = prefix => `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const next = crypto.pbkdf2Sync(String(password), salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(next, 'hex'));
}

const publicUser = user => ({
  id: user.id,
  email: user.email,
  name: user.name || user.email.split('@')[0],
  handle: user.handle || user.email.split('@')[0]
});

async function readState() {
  const state = await store.get(stateKey, { type: 'json' }).catch(() => null);
  return {
    users: [],
    sessions: {},
    profiles: [],
    posts: [],
    likes: {},
    comments: [],
    adminApplications: [],
    ...state
  };
}

async function writeState(state) {
  await store.setJSON(stateKey, state);
}

function authUser(request, state) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? state.sessions[token] : '';
  return state.users.find(user => user.id === userId) || null;
}

async function bodyJSON(request) {
  try {
    return request.method === 'GET' || request.method === 'HEAD' ? {} : await request.json();
  } catch {
    return {};
  }
}

function postWithMeta(post, state) {
  const comments = state.comments
    .filter(comment => comment.postId === post.id)
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    .map(({ postId, ...comment }) => comment);
  return {
    ...post,
    likes: Object.values(state.likes).filter(item => item === post.id).length,
    comments
  };
}

export default async function handler(request) {
  const method = request.method;
  const requestUrl = new URL(request.url);
  const path = '/' + requestUrl.pathname
    .replace(/^\/api\/?/, '')
    .replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);

  if (method === 'OPTIONS') return json(200, { ok: true });

  try {
    store ||= getStore('lumae-data');
  } catch (error) {
    return json(503, { error: 'Хранилище Netlify Blobs недоступно', code: 'BLOBS_ENVIRONMENT_MISSING' });
  }

  if (method === 'PUT' && path === '/uploads/raw') {
    const contentType = String(request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!/^(image|video|audio)\//.test(contentType)) return json(415, { error: 'Unsupported media type' });
    const bytes = Buffer.from(await request.arrayBuffer());
    const maxBytes = 4 * 1024 * 1024;
    if (!bytes.length) return json(400, { error: 'Пустой файл' });
    if (bytes.length > maxBytes) return json(413, { error: 'Файл больше 4 МБ. Уменьши размер и попробуй снова.' });
    const extension = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/mp4': '.m4a' })[contentType] || '';
    const key = `uploads/${crypto.randomBytes(18).toString('hex')}${extension}`;
    await store.set(key, new Blob([bytes], { type: contentType }), { metadata: { contentType } });
    return json(200, { success: true, url: `/api/${key}`, size: bytes.length });
  }

  if (method === 'GET' && parts[0] === 'uploads' && parts.length === 2) {
    const entry = await store.getWithMetadata(`uploads/${parts[1]}`, { type: 'arrayBuffer' });
    if (!entry) return json(404, { error: 'Файл не найден' });
    return new Response(entry.data, {
      status: 200,
      headers: {
        'content-type': String(entry.metadata.contentType || 'application/octet-stream'),
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*'
      }
    });
  }

  const state = await readState();
  const input = await bodyJSON(request);

  try {
    if (method === 'POST' && path === '/auth/register') {
      const email = String(input.email || '').trim().toLowerCase();
      const password = String(input.password || '');
      const name = String(input.name || email.split('@')[0] || 'Lumae').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Email is invalid' });
      if (password.length < 6) return json(400, { error: 'Password must be at least 6 characters' });
      if (state.users.some(user => user.email === email)) return json(409, { error: 'Email already exists' });
      const user = {
        id: createId('USR'),
        email,
        passwordHash: hashPassword(password),
        name,
        handle: email.split('@')[0].replace(/[^a-z0-9_]/gi, '').slice(0, 24) || 'lumae'
      };
      const token = createId('SES');
      state.users.push(user);
      state.sessions[token] = user.id;
      await writeState(state);
      return json(200, { token, user: publicUser(user) });
    }

    if (method === 'POST' && path === '/auth/login') {
      const email = String(input.email || '').trim().toLowerCase();
      const user = state.users.find(item => item.email === email);
      if (!user || !verifyPassword(input.password || '', user.passwordHash)) {
        return json(401, { error: 'Wrong email or password' });
      }
      const token = createId('SES');
      state.sessions[token] = user.id;
      await writeState(state);
      return json(200, { token, user: publicUser(user) });
    }

    if (method === 'GET' && path === '/auth/me') {
      const user = authUser(request, state);
      if (!user) return json(401, { error: 'Sign in required' });
      return json(200, { user: publicUser(user) });
    }

    if (method === 'POST' && path === '/auth/logout') {
      const header = request.headers.get('authorization') || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (token) delete state.sessions[token];
      await writeState(state);
      return json(200, { success: true });
    }

    if (method === 'GET' && path === '/profiles') {
      return json(200, state.profiles.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
    }

    if (method === 'POST' && path === '/profiles') {
      const profile = input.profile && typeof input.profile === 'object' ? input.profile : input;
      if (!profile.handle || !profile.name) return json(400, { error: 'Handle and name are required' });
      const now = new Date().toISOString();
      const saved = { ...profile, createdAt: profile.createdAt || now, updatedAt: now };
      const index = state.profiles.findIndex(item => item.id === saved.id || String(item.handle).toLowerCase() === String(saved.handle).toLowerCase());
      if (index >= 0) state.profiles[index] = { ...state.profiles[index], ...saved };
      else state.profiles.unshift(saved);
      await writeState(state);
      return json(200, { success: true, id: saved.id || saved.handle });
    }

    if (method === 'GET' && path === '/posts') {
      const posts = state.posts
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(post => postWithMeta(post, state));
      return json(200, posts);
    }

    if (method === 'POST' && path === '/posts') {
      const user = authUser(request, state);
      if (!user) return json(401, { error: 'Sign in required' });
      const body = String(input.body || '').trim();
      const mediaUrl = String(input.mediaUrl || '').trim();
      const trackUrl = String(input.trackUrl || '').trim();
      if (!body && !mediaUrl && !trackUrl) return json(400, { error: 'Post text, media or track is required' });
      state.posts.unshift({
        id: createId('PST'),
        userId: user.id,
        authorName: String(input.authorName || user.name || user.email).trim(),
        authorHandle: String(input.authorHandle || user.handle || '').replace(/^@/, '').trim(),
        authorAvatar: String(input.authorAvatar || '').trim(),
        authorAvatarType: String(input.authorAvatarType || '').trim(),
        authorProfileId: String(input.authorProfileId || '').trim(),
        body,
        mediaUrl,
        mediaType: String(input.mediaType || '').trim(),
        trackUrl,
        trackName: String(input.trackName || '').trim(),
        views: 0,
        createdAt: new Date().toISOString()
      });
      await writeState(state);
      return json(200, { success: true, id: state.posts[0].id });
    }

    if (parts[0] === 'posts' && parts[1] && method === 'DELETE') {
      const user = authUser(request, state);
      if (!user) return json(401, { error: 'Sign in required' });
      const post = state.posts.find(item => item.id === parts[1]);
      if (!post) return json(404, { error: 'Post not found' });
      if (post.userId !== user.id) return json(403, { error: 'You can delete only your own posts' });
      state.posts = state.posts.filter(item => item.id !== parts[1]);
      state.comments = state.comments.filter(item => item.postId !== parts[1]);
      Object.keys(state.likes).forEach(key => {
        if (state.likes[key] === parts[1]) delete state.likes[key];
      });
      await writeState(state);
      return json(200, { success: true });
    }

    if (parts[0] === 'posts' && parts[1] && parts[2] === 'like' && method === 'POST') {
      const user = authUser(request, state);
      if (!user) return json(401, { error: 'Sign in required' });
      const key = `${parts[1]}:${user.id}`;
      if (state.likes[key]) delete state.likes[key];
      else state.likes[key] = parts[1];
      await writeState(state);
      return json(200, { success: true, liked: Boolean(state.likes[key]) });
    }

    if (parts[0] === 'posts' && parts[1] && parts[2] === 'comments' && method === 'POST') {
      const user = authUser(request, state);
      if (!user) return json(401, { error: 'Sign in required' });
      const body = String(input.body || '').trim();
      if (!body) return json(400, { error: 'Comment text is required' });
      state.comments.push({
        id: createId('COM'),
        postId: parts[1],
        userId: user.id,
        authorName: String(input.authorName || user.name || user.email).trim(),
        authorHandle: String(input.authorHandle || user.handle || '').replace(/^@/, '').trim(),
        authorAvatar: String(input.authorAvatar || '').trim(),
        authorAvatarType: String(input.authorAvatarType || '').trim(),
        body,
        createdAt: new Date().toISOString()
      });
      await writeState(state);
      return json(200, { success: true });
    }

    if (path.startsWith('/admin/applications')) {
      return json(200, method === 'GET' ? state.adminApplications : { success: true });
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    return json(500, { error: error.message || 'Server error' });
  }
}
