export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type','application/json');
  const response = await fetch(path,{ ...options, headers, credentials: 'same-origin', signal: options.signal || AbortSignal.timeout(20_000) });
  let data: any;
  try { data = await response.json(); } catch { throw new ApiError('The server returned an invalid response.',response.status); }
  if (!response.ok) throw new ApiError(data.error || `Request failed (${response.status}).`,response.status);
  return data as T;
}
export const post = <T>(path: string,body: unknown = {},options: RequestInit = {}) => api<T>(path,{ ...options,method:'POST',body:JSON.stringify(body) });
export async function copyText(text: string) {
  if (!navigator.clipboard) throw new Error('Clipboard unavailable. Select and copy the text manually.');
  await navigator.clipboard.writeText(text);
}
export function downloadText(text: string,filename: string,type='text/plain') {
  const url = URL.createObjectURL(new Blob([text],{ type })); const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
}
