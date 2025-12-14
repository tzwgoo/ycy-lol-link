## Packaging to Windows exe

1. Install deps: `npm ci`.
2. Build and pack: `npm run package:exe` (build TS -> ncc bundle to CommonJS -> pkg generates exe; avoids ESM require errors).
3. Output path: `../build/zhanbai-lol-link-server.exe`.
4. Place `config.yaml` (or your config file) next to the exe. `public/` and `data/` are packed automatically.
