export async function getKey(env: Env) {
  if (!env.ENC_KEY) throw new Error("ENC_KEY not set");
  const raw = Uint8Array.from(atob(env.ENC_KEY), c=>c.charCodeAt(0));
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
}
export async function encrypt(env: Env, data: string) { const k = await getKey(env); const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = await crypto.subtle.encrypt({name:'AES-GCM',iv}, new TextEncoder().encode(data), k as any).catch(e=>{throw e}); return btoa(String.fromCharCode(...new Uint8Array(iv.byteLength + ct.byteLength))); }
export async function decrypt(env: Env, b64: string) { const buf = Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); const iv = buf.slice(0,12); const data = buf.slice(12); const k = await getKey(env); const pt = await crypto.subtle.decrypt({name:'AES-GCM',iv}, k as any, data); return new TextDecoder().decode(pt); }
export function nanoid(len=12){ const s = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-"; const b = crypto.getRandomValues(new Uint8Array(len)); let r=''; for(let i=0;i<len;i++)r+=s[b[i]%s.length]; return r; }
