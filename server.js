import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Error handler for body-parser
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(413).json({ error: 'Request payload too large or invalid JSON' });
  }
  if (error.status === 413) {
    return res.status(413).json({ error: 'Request payload too large' });
  }
  next();
});

app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Explicit media directory handlers
['grdh', 'csdkjhv', 'fvhdfzbvfjbs', 'uploads'].forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  app.use(`/${dir}`, express.static(dirPath));
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'profiles.db'), (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('Connected to SQLite database');
    initDB();
  }
});

function initDB() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profileId TEXT,
        handle TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        game TEXT,
        desc TEXT,
        status TEXT,
        tags TEXT,
        rarity TEXT,
        banner TEXT,
        avatar TEXT,
        fullProfile TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    addColumn('profiles', 'profileId TEXT');
    addColumn('profiles', 'phone TEXT');
    addColumn('profiles', 'desc TEXT');
    addColumn('profiles', 'fullProfile TEXT');
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_applications (
        id TEXT PRIMARY KEY,
        profileId TEXT,
        name TEXT NOT NULL,
        handle TEXT NOT NULL,
        role TEXT,
        salary TEXT,
        reason TEXT,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        name TEXT,
        handle TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        userId TEXT,
        authorName TEXT NOT NULL,
        authorHandle TEXT,
        authorAvatar TEXT,
        authorProfileId TEXT,
        body TEXT NOT NULL,
        mediaUrl TEXT,
        mediaType TEXT,
        trackUrl TEXT,
        trackName TEXT,
        views INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    addColumn('posts', 'authorAvatar TEXT');
    addColumn('posts', 'authorProfileId TEXT');
    addColumn('posts', 'trackUrl TEXT');
    addColumn('posts', 'trackName TEXT');
    addColumn('posts', 'views INTEGER DEFAULT 0');
    db.run(`
      CREATE TABLE IF NOT EXISTS post_likes (
        postId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (postId, userId)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS post_comments (
        id TEXT PRIMARY KEY,
        postId TEXT NOT NULL,
        userId TEXT,
        authorName TEXT NOT NULL,
        authorHandle TEXT,
        authorAvatar TEXT,
        body TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    addColumn('post_comments', 'authorHandle TEXT');
    addColumn('post_comments', 'authorAvatar TEXT');
    db.run(
      `DELETE FROM posts
       WHERE id = 'demo-post'
          OR (authorName = 'MuMu Player' AND body LIKE 'Пример поста%')`
    );
  });
}

function addColumn(table, definition) {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${definition}`, (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error(`Migration error for ${table}.${definition}:`, err.message);
    }
  });
}

function publicMediaValue(value) {
  const raw = String(value || '').trim();
  if (!raw || /^(lumae-media:|blob:)/i.test(raw)) return null;
  return raw;
}

function rowToProfile(row) {
  if (!row) return null;
  try {
    const full = row.fullProfile ? JSON.parse(row.fullProfile) : {};
    return {
      ...full,
      id: full.id || row.profileId || `DB-${row.id}`,
      handle: full.handle || row.handle,
      name: full.name || row.name,
      phone: full.phone || row.phone || '',
      desc: full.desc || row.desc || row.game || '',
      status: full.status || row.status || '',
      tags: Array.isArray(full.tags) ? full.tags : JSON.parse(row.tags || '[]'),
      rarity: full.rarity || row.rarity || 'common',
      bannerImgSrc: publicMediaValue(full.bannerImgSrc || row.banner),
      bannerVidSrc: publicMediaValue(full.bannerVidSrc),
      avaImgSrc: publicMediaValue(full.avaImgSrc || row.avatar),
      avaVidSrc: publicMediaValue(full.avaVidSrc),
      createdAt: full.createdAt || row.createdAt
    };
  } catch (error) {
    return {
      id: row.profileId || `DB-${row.id}`,
      handle: row.handle,
      name: row.name,
      phone: row.phone || '',
      desc: row.desc || row.game || '',
      status: row.status || '',
      tags: [],
      rarity: row.rarity || 'common',
      bannerImgSrc: publicMediaValue(row.banner),
      avaImgSrc: publicMediaValue(row.avatar),
      createdAt: row.createdAt
    };
  }
}

function normalizeApplication(row) {
  return {
    id: row.id,
    profileId: row.profileId || '',
    name: row.name,
    handle: row.handle,
    role: row.role || 'Support',
    salary: row.salary || 'Волонтёрство',
    reason: row.reason || '',
    status: row.status || 'pending',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

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

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name || row.email.split('@')[0],
    handle: row.handle || row.email.split('@')[0]
  };
}

function userToProfile(row) {
  const user = publicUser(row);
  return {
    id: user.id,
    handle: user.handle,
    name: user.name,
    phone: '',
    desc: '',
    status: 'Lumae account',
    tags: [],
    rarity: 'common',
    bannerImgSrc: null,
    avaImgSrc: null,
    createdAt: row.createdAt
  };
}

function authToken(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function getAuthUser(req, callback) {
  const token = authToken(req);
  if (!token) return callback(null, null);
  db.get(
    `SELECT users.* FROM sessions JOIN users ON users.id = sessions.userId WHERE sessions.token = ?`,
    [token],
    callback
  );
}

function requireAuth(req, res, callback) {
  getAuthUser(req, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Sign in required' });
    callback(user);
  });
}

function optionalAuth(req, res, callback) {
  getAuthUser(req, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    callback(user || null);
  });
}

function normalizePost(row, comments = []) {
  return {
    id: row.id,
    userId: row.userId || '',
    authorName: row.authorName,
    authorHandle: row.authorHandle || '',
    authorAvatar: publicMediaValue(row.authorAvatar) || '',
    authorProfileId: row.authorProfileId || '',
    body: row.body,
    mediaUrl: publicMediaValue(row.mediaUrl) || '',
    mediaType: row.mediaType || '',
    trackUrl: publicMediaValue(row.trackUrl) || '',
    trackName: row.trackName || '',
    createdAt: row.createdAt,
    likes: Number(row.likes || 0),
    likedByMe: Boolean(Number(row.likedByMe || 0)),
    views: Number(row.views || 0),
    comments
  };
}

function isDemoPost(row) {
  return row?.id === 'demo-post' || (row?.authorName === 'MuMu Player' && String(row?.body || '').startsWith('Пример поста'));
}

// API Routes

app.post('/api/auth/register', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const name = String(req.body.name || email.split('@')[0] || 'Lumae').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email is invalid' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const user = {
    id: createId('USR'),
    email,
    passwordHash: hashPassword(password),
    name,
    handle: email.split('@')[0].replace(/[^a-z0-9_]/gi, '').slice(0, 24) || 'lumae'
  };
  db.run(
    'INSERT INTO users (id, email, passwordHash, name, handle) VALUES (?, ?, ?, ?, ?)',
    [user.id, user.email, user.passwordHash, user.name, user.handle],
    (err) => {
      if (err) {
        if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
        return res.status(500).json({ error: err.message });
      }
      const token = createId('SES');
      db.run('INSERT INTO sessions (token, userId) VALUES (?, ?)', [token, user.id], (sessionErr) => {
        if (sessionErr) return res.status(500).json({ error: sessionErr.message });
        res.json({ token, user: publicUser(user) });
      });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Wrong email or password' });
    }
    const token = createId('SES');
    db.run('INSERT INTO sessions (token, userId) VALUES (?, ?)', [token, user.id], (sessionErr) => {
      if (sessionErr) return res.status(500).json({ error: sessionErr.message });
      res.json({ token, user: publicUser(user) });
    });
  });
});

app.get('/api/auth/me', (req, res) => {
  requireAuth(req, res, (user) => res.json({ user: publicUser(user) }));
});

app.post('/api/auth/logout', (req, res) => {
  const token = authToken(req);
  if (!token) return res.json({ success: true });
  db.run('DELETE FROM sessions WHERE token = ?', [token], () => res.json({ success: true }));
});

// GET all profiles
app.get('/api/profiles', (req, res) => {
  db.all('SELECT * FROM profiles ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(rowToProfile).filter(Boolean));
    }
  });
});

// GET profile by handle
app.get('/api/profiles/:handle', (req, res) => {
  const { handle } = req.params;
  db.get('SELECT * FROM profiles WHERE handle = ?', [handle], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Profile not found' });
    } else {
      res.json(rowToProfile(row));
    }
  });
});

// POST create/update profile
app.post('/api/profiles', (req, res) => {
  const source = req.body.profile && typeof req.body.profile === 'object' ? req.body.profile : req.body;
  const safeProfile = {
    ...source,
    bannerImgSrc: publicMediaValue(source.bannerImgSrc || source.banner),
    bannerVidSrc: publicMediaValue(source.bannerVidSrc),
    avaImgSrc: publicMediaValue(source.avaImgSrc || source.avatar),
    avaVidSrc: publicMediaValue(source.avaVidSrc)
  };
  const { id, handle, name, phone, desc, game, status, tags, rarity, bannerImgSrc, avaImgSrc } = safeProfile;

  if (!handle || !name) {
    return res.status(400).json({ error: 'Handle and name are required' });
  }

  const tagsJson = JSON.stringify(tags || []);
  const fullProfile = JSON.stringify(safeProfile);

  db.run(
    `INSERT INTO profiles (profileId, handle, name, phone, game, desc, status, tags, rarity, banner, avatar, fullProfile)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(handle) DO UPDATE SET
      profileId=excluded.profileId,
      name=excluded.name,
      phone=excluded.phone,
      game=excluded.game,
      desc=excluded.desc,
      status=excluded.status,
      tags=excluded.tags,
      rarity=excluded.rarity,
      banner=excluded.banner,
      avatar=excluded.avatar,
      fullProfile=excluded.fullProfile,
      updatedAt=CURRENT_TIMESTAMP`,
    [id || '', handle, name, phone || '', game || desc || '', desc || game || '', status || '', tagsJson, rarity || 'common', bannerImgSrc || '', avaImgSrc || '', fullProfile],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ 
          success: true, 
          id: this.lastID,
          message: 'Profile saved successfully'
        });
      }
    }
  );
});

app.get('/api/admin/applications', (req, res) => {
  const isOwner = req.query.owner === '1';
  const profileId = String(req.query.profileId || '');
  const sql = isOwner
    ? 'SELECT * FROM admin_applications ORDER BY createdAt DESC'
    : 'SELECT * FROM admin_applications WHERE profileId = ? ORDER BY createdAt DESC';
  const params = isOwner ? [] : [profileId];
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows.map(normalizeApplication));
    }
  });
});

app.post('/api/admin/applications', (req, res) => {
  const { id, profileId, name, handle, role, salary, reason } = req.body;
  if (!profileId || !name || !handle) {
    return res.status(400).json({ error: 'Profile, name and handle are required' });
  }
  db.get(
    'SELECT * FROM admin_applications WHERE profileId = ? AND status IN ("pending", "accepted")',
    [profileId],
    (findErr, existing) => {
      if (findErr) return res.status(500).json({ error: findErr.message });
      if (existing) return res.status(409).json({ error: 'Application already exists', application: normalizeApplication(existing) });
      const requestId = id || `ADM-${Date.now().toString(36).toUpperCase()}`;
      db.run(
        `INSERT INTO admin_applications (id, profileId, name, handle, role, salary, reason, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [requestId, profileId, name, handle, role || 'Support', salary || 'Волонтёрство', reason || ''],
        (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({ success: true, id: requestId });
          }
        }
      );
    }
  );
});

app.post('/api/admin/applications/:id/:decision', (req, res) => {
  const status = req.params.decision === 'accept' ? 'accepted' : req.params.decision === 'reject' ? 'rejected' : '';
  if (!status) return res.status(400).json({ error: 'Decision must be accept or reject' });
  db.run(
    'UPDATE admin_applications SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [status, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!this.changes) {
        res.status(404).json({ error: 'Application not found' });
      } else {
        res.json({ success: true, status });
      }
    }
  );
});

app.get('/api/posts', (req, res) => {
  getAuthUser(req, (authErr, user) => {
    if (authErr) return res.status(500).json({ error: authErr.message });
    db.all(
      `SELECT posts.*,
        COUNT(post_likes.userId) AS likes,
        MAX(CASE WHEN post_likes.userId = ? THEN 1 ELSE 0 END) AS likedByMe
     FROM posts
     LEFT JOIN post_likes ON post_likes.postId = posts.id
     GROUP BY posts.id
     ORDER BY posts.createdAt DESC`,
      [user?.id || ''],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all('SELECT * FROM post_comments ORDER BY createdAt ASC', (commentsErr, comments) => {
          if (commentsErr) return res.status(500).json({ error: commentsErr.message });
          const byPost = comments.reduce((map, item) => {
            if (!map[item.postId]) map[item.postId] = [];
        map[item.postId].push({
          id: item.id,
          authorName: item.authorName,
          authorHandle: item.authorHandle || '',
          authorAvatar: publicMediaValue(item.authorAvatar) || '',
          body: item.body,
          createdAt: item.createdAt
        });
            return map;
          }, {});
          res.json(rows.filter(row => !isDemoPost(row)).map(row => normalizePost(row, byPost[row.id] || [])));
        });
      }
    );
  });
});

app.post('/api/posts', (req, res) => {
  optionalAuth(req, res, (user) => {
    const body = String(req.body.body || '').trim();
    const mediaUrl = String(req.body.mediaUrl || '').trim();
    const trackUrl = String(req.body.trackUrl || '').trim();
    const trackName = String(req.body.trackName || '').trim();
    if (!body && !mediaUrl && !trackUrl) return res.status(400).json({ error: 'Post text, media or track is required' });
    const requestedId = String(req.body.id || '').trim();
    if (requestedId === 'demo-post') return res.status(400).json({ error: 'Demo post is disabled' });
    const id = /^[A-Za-z0-9_-]{3,80}$/.test(requestedId) ? requestedId : createId('PST');
    const createdAtRaw = String(req.body.createdAt || '').trim();
    const createdAt = createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw)) ? createdAtRaw : new Date().toISOString();
    const authorName = String(req.body.authorName || user?.name || user?.email || 'Lumae').trim();
    const authorHandle = String(req.body.authorHandle || user?.handle || '').replace(/^@/, '').trim();
    const authorAvatar = String(req.body.authorAvatar || '').trim();
    const authorProfileId = String(req.body.authorProfileId || '').trim();
    db.get('SELECT id FROM posts WHERE id = ?', [id], (findErr, existing) => {
      if (findErr) return res.status(500).json({ error: findErr.message });
      if (existing) return res.json({ success: true, id, duplicate: true });
      db.run(
        `INSERT INTO posts (id, userId, authorName, authorHandle, authorAvatar, authorProfileId, body, mediaUrl, mediaType, trackUrl, trackName, views, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, user?.id || '', authorName, authorHandle, authorAvatar, authorProfileId, body, mediaUrl, req.body.mediaType || '', trackUrl, trackName, 0, createdAt],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, id });
        }
      );
    });
  });
});

app.post('/api/posts/:id/like', (req, res) => {
  requireAuth(req, res, (user) => {
    db.get('SELECT 1 FROM post_likes WHERE postId = ? AND userId = ?', [req.params.id, user.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run('DELETE FROM post_likes WHERE postId = ? AND userId = ?', [req.params.id, user.id], () => res.json({ success: true, liked: false }));
      } else {
        db.run('INSERT INTO post_likes (postId, userId) VALUES (?, ?)', [req.params.id, user.id], (insertErr) => {
          if (insertErr) return res.status(500).json({ error: insertErr.message });
          res.json({ success: true, liked: true });
        });
      }
    });
  });
});

app.post('/api/posts/:id/view', (req, res) => {
  db.run(
    'UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (!this.changes) return res.status(404).json({ error: 'Post not found' });
      db.get('SELECT views FROM posts WHERE id = ?', [req.params.id], (findErr, row) => {
        if (findErr) return res.status(500).json({ error: findErr.message });
        res.json({ success: true, views: Number(row?.views || 0) });
      });
    }
  );
});

app.delete('/api/posts/:id', (req, res) => {
  requireAuth(req, res, (user) => {
    db.get('SELECT userId FROM posts WHERE id = ?', [req.params.id], (err, post) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!post) return res.status(404).json({ error: 'Post not found' });
      if (post.userId !== user.id) return res.status(403).json({ error: 'You can delete only your own posts' });
      db.serialize(() => {
        db.run('DELETE FROM post_likes WHERE postId = ?', [req.params.id]);
        db.run('DELETE FROM post_comments WHERE postId = ?', [req.params.id]);
        db.run('DELETE FROM posts WHERE id = ?', [req.params.id], function(deleteErr) {
          if (deleteErr) return res.status(500).json({ error: deleteErr.message });
          res.json({ success: true });
        });
      });
    });
  });
});

app.post('/api/posts/:id/comments', (req, res) => {
  requireAuth(req, res, (user) => {
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ error: 'Comment text is required' });
    const requestedId = String(req.body.id || '').trim();
    const id = /^[A-Za-z0-9_-]{3,80}$/.test(requestedId) ? requestedId : createId('COM');
    const createdAtRaw = String(req.body.createdAt || '').trim();
    const createdAt = createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw)) ? createdAtRaw : new Date().toISOString();
    const authorName = String(req.body.authorName || user.name || user.email).trim();
    const authorHandle = String(req.body.authorHandle || user.handle || '').replace(/^@/, '').trim();
    const authorAvatar = String(req.body.authorAvatar || '').trim();
    db.get('SELECT id FROM post_comments WHERE id = ? AND userId = ?', [id, user.id], (findErr, existing) => {
      if (findErr) return res.status(500).json({ error: findErr.message });
      if (existing) return res.json({ success: true, id, duplicate: true });
      db.run(
        'INSERT INTO post_comments (id, postId, userId, authorName, authorHandle, authorAvatar, body, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.params.id, user.id, authorName, authorHandle, authorAvatar, body, createdAt],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, id });
        }
      );
    });
  });
});

// DELETE profile
app.delete('/api/profiles/:handle', (req, res) => {
  const { handle } = req.params;
  db.run('DELETE FROM profiles WHERE handle = ?', [handle], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Profile not found' });
    } else {
      res.json({ success: true, message: 'Profile deleted' });
    }
  });
});

// CHECK if handle exists
app.get('/api/check/:handle', (req, res) => {
  const { handle } = req.params;
  db.get('SELECT id FROM profiles WHERE handle = ?', [handle], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ exists: !!row });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📍 Open http://localhost:${PORT}/index.html in your browser`);
});
