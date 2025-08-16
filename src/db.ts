import { encrypt, decrypt, nanoid } from './crypto';
export const DBQ = {
  getBotById: `SELECT * FROM bots WHERE id = ?`,
  insertBot: `INSERT INTO bots(id,kind,username,token_cipher,webhook_secret,parent_id,owner_tg_id,is_active,created_at) VALUES(?,?,?,?,?,?,?,?,?)`,
  insertFile: `INSERT INTO files(id,main_bot_id,uploader_tg_id,file_type,file_id,caption,size,mime_type,code,delivered_count,click_count,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
  getFileByCode: `SELECT * FROM files WHERE code=?`,
  addForcedChannel: `INSERT INTO forced_channels(main_bot_id,chat_id,username,title,created_at) VALUES(?,?,?,?,?)`,
  listForced: `SELECT * FROM forced_channels WHERE main_bot_id=?`,
  incClick: `UPDATE files SET click_count = click_count + 1 WHERE id=?`,
  incDelivered: `UPDATE files SET delivered_count = delivered_count + 1 WHERE id=?`,
  addDownload: `INSERT OR IGNORE INTO downloads(file_id_ref,user_tg_id,delivered,created_at) VALUES(?,?,?,?)`,
  statsOverview: `SELECT COUNT(*) as total_files, SUM(delivered_count) as total_delivered FROM files`
};
export async function storeBot(env:Env, bot:any){
  const token_cipher = await encrypt(env, bot.token);
  const id = bot.id || crypto.randomUUID();
  const wh = nanoid(24);
  await env.DB.prepare(DBQ.insertBot).bind(id, bot.kind, bot.username||null, token_cipher, wh, bot.parent_id||null, bot.owner_tg_id, 1, Date.now()).run();
  return {id, wh_secret: wh};
}
export async function getToken(env:Env, bot_id:string){ const row = await env.DB.prepare(DBQ.getBotById).bind(bot_id).first<any>(); if(!row) throw new Error('bot not found'); return await decrypt(env, row.token_cipher); }
export async function saveFile(env:Env, main_bot_id:string, uploader:number, meta:any){ const id = nanoid(16); const code = nanoid(18); await env.DB.prepare(DBQ.insertFile).bind(id, main_bot_id, uploader, meta.file_type, meta.file_id, meta.caption||null, meta.size||null, meta.mime_type||null, code,0,0,Date.now()).run(); return {id, code}; }
export async function addForcedChannelRecord(env:Env, main_bot_id:string, chat_id:number, username:string|null, title:string|null){ await env.DB.prepare(DBQ.addForcedChannel).bind(main_bot_id, chat_id, username, title, Date.now()).run(); }
export async function listForcedChannels(env:Env, main_bot_id:string){ return await env.DB.prepare(DBQ.listForced).bind(main_bot_id).all<any>(); }
export async function incClick(env:Env, id:string){ await env.DB.prepare(DBQ.incClick).bind(id).run(); }
export async function incDelivered(env:Env, id:string){ await env.DB.prepare(DBQ.incDelivered).bind(id).run(); }
