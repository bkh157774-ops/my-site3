# Lumae: deployment and architecture

## Current development setup

The local app is served by one Express process (`server.js`). Its current database is SQLite in `profiles.db`, and uploaded media is written to the local `uploads/` directory. This is suitable for local development and a single persistent server, but it is not a horizontally scaled production architecture. Local disk may be temporary on a cloud host, so uploaded music needs persistent object storage before production use.

The music library now has authenticated `/api/music/tracks` routes. Audio is uploaded through `/api/uploads/raw`; track metadata is saved per signed-in account. Without a valid account session, uploaded tracks stay in that browser's IndexedDB and are not available on other devices.

## Production target

```text
Users
  -> CDN / WAF / DDoS protection
  -> Load balancer
       -> API instances (stateless)
       -> WebSocket instances
       -> Media service
            -> Redis cluster (cache, rate limits, ephemeral state)
            -> PostgreSQL primary + read replicas
            -> Object storage (photos, video, audio, files)
```

To move from the current setup to this target, provision the CDN/WAF, load balancer, managed Redis and PostgreSQL, and S3-compatible object storage; configure secrets and health checks; migrate SQLite records and local uploads; then deploy stateless API instances and verify cross-device media delivery. CDN and object storage should serve media directly using durable URLs. Do not run multiple API instances against independent SQLite files or local upload directories.

## Deploy the current single-server backend

The project can run as one Node service with `npm install` and `npm start`. Set `PORT` through the host environment. Configure a persistent disk for both `profiles.db` and `uploads/` if the chosen host supports it. The current `render.yaml` starts this single-server configuration; it does not provision PostgreSQL, Redis, a CDN, or object storage.

The production frontend uses `https://my-site4.onrender.com` as its single API and media backend, including on every `*.netlify.app` host. Upload failures do not fall back to Netlify, so post metadata and media URLs cannot be split between the Render database/filesystem and Netlify Blobs. The API must allow the deployed frontend origin through CORS. Netlify deployment is separate from the Render service, so local source changes do not appear on the public site until the repository is deployed.

`netlify/functions/api.mjs` uses Netlify's modern `Request`/`Response` function format and Netlify Blobs, but it is not the production backend selected by the frontend. Its current application records are stored together in one JSON Blobs object; this is not a transactional database and concurrent updates can overwrite each other. If production data is moved to Netlify, migrate records to a database first and switch all API routes and media uploads together rather than enabling a partial fallback. Render's current SQLite database and local uploads also require persistent storage on the host; without it, data can be lost when the service is replaced or restarted.

## Local development

```bash
npm start
```

Open `http://localhost:3000/index.html`. The API uses the local SQLite database and local `uploads/` directory.
