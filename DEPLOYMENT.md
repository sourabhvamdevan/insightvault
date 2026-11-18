# Deployment

## Quickest option: the standalone frontend demo

The frontend's default build is a self-contained demo that runs in the browser with recorded retrieval results, so it needs no backend at all.

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
2. Framework preset: **Vite** (build command `npm run build`, output directory `dist`). Leave `VITE_DEMO_MODE` unset.
3. Deploy. `frontend/vercel.json` rewrites all routes to `index.html` so deep links like `/assistant` work.

Any static host works the same way: run `npm run build` in `frontend/` and serve `dist/`.

## Full deployment with the backend

The backend can also run in **demo mode**: a read-only backend with a pre-indexed sample knowledge base and no LLM (answers show retrieved evidence only). Local use with Ollama is described in the README.

Recommended split:

- **Backend:** a Docker container (the root `Dockerfile`), for example a Hugging Face Docker Space.
- **Frontend:** the static Vite build, for example on Vercel.

### 1. Backend container

The root `Dockerfile`:

- installs CPU-only PyTorch, then `backend/requirements.txt`
- downloads `all-MiniLM-L6-v2` and indexes `demo/sample_documents/` at **build time** (`python -m scripts.build_demo_index`), so the container starts with a ready index and needs no network at runtime
- runs as UID 1000 and serves on port **7860** with `DEMO_MODE=true`, `APP_ENV=production`

Build and run locally:

```bash
docker build -t insightvault .
docker run --rm -p 7860:7860 insightvault
curl http://localhost:7860/api/health
```

Environment variables you may want to override at runtime:

| Variable | Default in image | Notes |
|---|---|---|
| `CORS_ORIGINS` | `*` | Set to your frontend origin, e.g. `https://your-app.vercel.app` (comma-separated for several) |
| `DEMO_MODE` | `true` | Keep `true` for a public deployment: uploads and deletes return `403 demo_read_only` |

#### Hugging Face Spaces

1. Create a new Space with the **Docker** SDK.
2. Push this repository's contents to the Space (the `Dockerfile` must be at the Space root).
3. Add this front matter at the top of the Space's `README.md` so traffic is routed to the right port:

   ```yaml
   ---
   title: InsightVault
   sdk: docker
   app_port: 7860
   ---
   ```

4. Under *Settings → Variables*, set `CORS_ORIGINS` to your frontend URL.

Resource notes, checked against the Hugging Face docs in November 2026 (verify before relying on them, they change):

- The default **CPU Basic** hardware is 2 vCPU, 16 GB RAM and 50 GB of **non-persistent** disk, with no hourly cost. This app needs well under 1 GB of RAM in demo mode.
- The current Spaces overview states that creating a Gradio or Docker Space now requires a paid plan (PRO for personal accounts); only Static Spaces are free for everyone. Check your account before planning on a free deployment.
- Free hardware goes to sleep when unused, so the first request after a pause waits for the container to start.
- Disk is not persistent, which is fine here: the demo index is baked into the image.

Any other container host (Render, Fly.io, Railway, a VM) works the same way: build the image, expose port 7860, set `CORS_ORIGINS`.

### 2. Frontend on Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`.
2. Framework preset: **Vite**, build command `npm run build:live`, output directory `dist`.
3. Add an environment variable `VITE_API_BASE_URL` with the backend URL, without a trailing slash and without `/api`, e.g. `https://your-space.hf.space`.
4. Deploy. `frontend/vercel.json` rewrites all routes to `index.html` so deep links like `/assistant` work.

Notes (Vercel Hobby plan, checked November 2026): it is free but limited to personal, non-commercial use, and includes 100 GB per month of data transfer, which is plenty for a static demo. Check the current limits on Vercel's pricing page.

### 3. After deploying

- Open the frontend: the sidebar should show "Demo mode · retrieval only".
- The assistant's suggested questions come from `demo/sample_questions.json`.
- Update the **Live demo** link at the top of `README.md`.
