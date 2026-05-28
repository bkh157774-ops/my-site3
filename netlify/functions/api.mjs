import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const store = getStore('lumae-data');
const stateKey = 'state.json';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS'
  },
  body: JSON.stringify(body)
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

function authUser(event, state) {
  const header = String(event.headers.authorization || event.headers.Authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? state.sessions[token] : '';
  return state.users.find(user => user.id === userId) || null;
}

function bodyJSON(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
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

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true });

  const path = '/' + String(event.path || '')
    .replace(/^\/\.netlify\/functions\/api\/?/, '')
    .replace(/^\/api\/?/, '')
    .replace(/^\/+/, '');
  const parts = path.split('/').filter(Boolean);
  const state = await readState();
  const input = bodyJSON(event);

  try {
    if (event.httpMethod === 'POST' && path === '/auth/register') {
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

    if (event.httpMethod === 'POST' && path === '/auth/login') {
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

    if (event.httpMethod === 'GET' && path === '/auth/me') {
      const user = authUser(event, state);
      if (!user) return json(401, { error: 'Sign in required' });
      return json(200, { user: publicUser(user) });
    }

    if (event.httpMethod === 'POST' && path === '/auth/logout') {
      const header = String(event.headers.authorization || '');
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      if (token) delete state.sessions[token];
      await writeState(state);
      return json(200, { success: true });
    }

    if (event.httpMethod === 'GET' && path === '/profiles') {
      return json(200, state.profiles.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
    }

    if (event.httpMethod === 'POST' && path === '/profiles') {
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

    if (event.httpMethod === 'GET' && path === '/posts') {
      const posts = state.posts
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .map(post => postWithMeta(post, state));
      return json(200, posts);
    }

    if (event.httpMethod === 'POST' && path === '/posts') {
      const user = authUser(event, state);
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

    if (parts[0] === 'posts' && parts[1] && event.httpMethod === 'DELETE') {
      const user = authUser(event, state);
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

    if (parts[0] === 'posts' && parts[1] && parts[2] === 'like' && event.httpMethod === 'POST') {
      const user = authUser(event, state);
      if (!user) return json(401, { error: 'Sign in required' });
      const key = `${parts[1]}:${user.id}`;
      if (state.likes[key]) delete state.likes[key];
      else state.likes[key] = parts[1];
      await writeState(state);
      return json(200, { success: true, liked: Boolean(state.likes[key]) });
    }

    if (parts[0] === 'posts' && parts[1] && parts[2] === 'comments' && event.httpMethod === 'POST') {
      const user = authUser(event, state);
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
      return json(200, event.httpMethod === 'GET' ? state.adminApplications : { success: true });
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    return json(500, { error: error.message || 'Server error' });
  }
}
