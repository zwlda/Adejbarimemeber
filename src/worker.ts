import { storeBot, getToken } from './db';
import { tgCall, sendMessage, getMe } from './telegram';
import { adminStart, onAdminMedia, addChannelByForward, cmdListChannels } from './admin_panel';
import { handleStartDeliver } from './deliver_flow';

export interface Env { DB: D1Database; ENC_KEY: string; BASE_URL: string; CACHE?: KVNamespace; SETUP_SECRET?: string; }

export default {
  async fetch(req:Request, env:Env, ctx:ExecutionContext){
    const url = new URL(req.url);
    if(req.method==='GET' && url.pathname==='/.well-known/healthz') return new Response('ok');
    if(req.method==='GET' && url.pathname.startsWith('/dl/')){
      const code = url.pathname.split('/').pop()!;
      const file = await env.DB.prepare(`SELECT * FROM files WHERE code=?`).bind(code).first<any>();
      if(!file) return new Response('Not found', {status:404});
      await env.DB.prepare(`UPDATE files SET click_count = click_count + 1 WHERE id=?`).bind(file.id).run();
      const subs = await env.DB.prepare(`SELECT * FROM bots WHERE kind='SUB' AND is_active=1`).all<any>();
      const list = subs.results||[];
      const chosen = list[Math.floor(Math.random()*Math.max(1,list.length))];
      const botRow = chosen || await env.DB.prepare(`SELECT * FROM bots WHERE kind='MAIN' AND is_active=1 ORDER BY created_at LIMIT 1`).first<any>();
      const username = botRow.username || (await ensureGetMeUsername(env, botRow.id));
      return Response.redirect(`https://t.me/${username}?start=${code}`, 302);
    }

    if(req.method==='POST' && url.pathname==='/setup'){
      const secret = req.headers.get('X-Setup-Secret')||'';
      if(!env.SETUP_SECRET || secret !== env.SETUP_SECRET) return new Response('forbidden', {status:403});
      const body = await req.json();
      const { kind, token, owner_tg_id, parent_id } = body;
      const { id, wh_secret } = await storeBot(env, { kind, token, owner_tg_id, parent_id });
      const me = await tgCall(token, 'getMe', {});
      await env.DB.prepare(`UPDATE bots SET username=? WHERE id=?`).bind(me.username, id).run();
      await tgCall(token, 'setWebhook', { url: `${env.BASE_URL}/webhook/${id}/${wh_secret}` });
      return new Response(JSON.stringify({ok:true,id,username:me.username,webhook:`/webhook/${id}/${wh_secret}`}), {headers:{'content-type':'application/json'}});
    }

    if(req.method==='POST' && url.pathname.startsWith('/webhook/')){
      const parts = url.pathname.split('/');
      const bot_id = parts[2];
      const wh_secret = parts[3];
      const row = await env.DB.prepare(`SELECT * FROM bots WHERE id = ?`).bind(bot_id).first<any>();
      if(!row || row.webhook_secret !== wh_secret) return new Response('forbidden', {status:403});
      const token = await getToken(env, bot_id);
      const update = await req.json();
      const isMain = row.kind === 'MAIN';
      if(update.message){
        const msg = update.message;
        const chat_id = msg.chat.id; const user_id = msg.from.id;
        if(isMain){
          if(msg.text === '/start') return new Response('OK');
          if(msg.forward_from_chat){ await addChannelByForward({token,env,chat_id,user_id,main_bot_id:bot_id}, msg.forward_from_chat); return new Response('OK'); }
          if(msg.document) return new Response('OK');
          if(msg.photo) return new Response('OK');
          if(msg.text && msg.text.startsWith('/listchannels')){ await cmdListChannels({token,env,chat_id,user_id,main_bot_id:bot_id}); return new Response('OK'); }
          return new Response('OK');
        } else {
          if(msg.text?.startsWith('/start')){ const code = msg.text.split(' ')[1]; if(!code) return new Response('OK'); await handleStartDeliver(env, token, row.parent_id, user_id, chat_id, code); return new Response('OK'); }
        }
      }
      return new Response('OK');
    }

    return new Response('Not found', {status:404});
  }
};

async function ensureGetMeUsername(env:Env, bot_id:string){
  const token = await getToken(env, bot_id);
  const me = await getMe(token);
  await env.DB.prepare(`UPDATE bots SET username=? WHERE id=?`).bind(me.username, bot_id).run();
  return me.username;
}
