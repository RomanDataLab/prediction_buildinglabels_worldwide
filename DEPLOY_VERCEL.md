# Vercel deployment guide

This repository deploys best as **two Vercel projects** from the same Git repo:

- `backend` project (FastAPI)
- `frontend` project (Next.js)

## 1) Backend project (FastAPI)

1. In Vercel, create a new project from this repo.
2. Set **Root Directory** to `backend`.
3. Build settings:
   - Framework preset: `Other`
   - Install command: `pip install -r requirements.txt`
   - Output directory: leave empty
4. Deploy.
5. Confirm endpoint works:
   - `https://<backend-project>.vercel.app/api/health`

Notes:
- `backend/api/index.py` is the Vercel entrypoint.
- `backend/vercel.json` rewrites all backend routes to that entrypoint.

## 2) Frontend project (Next.js)

1. Create another Vercel project from the same repo.
2. Set **Root Directory** to `frontend`.
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL=https://<backend-project>.vercel.app/api`
4. Deploy.

## 3) Local parity checks

- Frontend production build: `cd frontend && npm run build`
- Backend import sanity: `cd backend && python -c "import main; print('ok')"`

## 4) Push to GitHub

After committing these files, push to:

`git@github.com:RomanDataLab/prediction_buildinglabels_worldwide.git`

