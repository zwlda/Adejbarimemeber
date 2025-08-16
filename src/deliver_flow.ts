import { getChatMember, sendMessage, sendByFileId } from './telegram';
import { incDelivered, addDownload } from './db';
export async function handleStartDeliver(env:any, token:string, main_bot_id:string, user_id:number, chat_id:number, code:string){
  const file = await env.DB.prepare(`SELECT * FROM files WHERE code=?`).bind(code).first<any>();
  if(!file) return sendMessage(token, chat_id, 'کد نامعتبر');
  const channels = await env.DB.prepare(`SELECT * FROM forced_channels WHERE main_bot_id=?`).bind(main_bot_id).all<any>();
  let okCount=0;
  for(const ch of (channels.results||[])){ const m = await getChatMember(token, ch.chat_id, user_id); const status = m?.status; if(['creator','administrator','member'].includes(status)) okCount++; }
  if(okCount !== (channels.results||[]).length){
    const rows = (channels.results||[]).map((c:any)=>[{text:`عضو ${c.title||c.username}`, url:`https://t.me/${c.username||c.chat_id}`}]);
    rows.push([{text:'✅ عضو شدم، بررسی مجدد', data:`recheck:${code}`}]);
    return sendMessage(token, chat_id, 'ابتدا عضو شوید', {inline_keyboard: rows});
  }
  await env.DB.prepare(`INSERT OR IGNORE INTO downloads(file_id_ref,user_tg_id,delivered,created_at) VALUES(?,?,?,?)`).bind(file.id, user_id, 1, Date.now()).run();
  await env.DB.prepare(`UPDATE files SET delivered_count = delivered_count + 1 WHERE id=?`).bind(file.id).run();
  return sendByFileId(token, chat_id, file.file_type, file.file_id, file.caption);
}
