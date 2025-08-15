README - Telegram Forcejoin Worker
See docs in the canvas. This zip contains the Worker source and scripts.
Quick steps:
1) wrangler login
2) wrangler d1 create tg_forcejoin
3) wrangler d1 execute tg_forcejoin --file=schema.sql
4) wrangler secret put ENC_KEY
5) wrangler secret put SETUP_SECRET
6) wrangler deploy
