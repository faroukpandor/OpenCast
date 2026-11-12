import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import type { User } from '../types.ts';
import { post, ApiError } from '../utils/api.ts';
import { Modal } from './Modal.tsx';
interface Props { isOpen: boolean; onClose: () => void; onAuthSuccess: (user: User) => void; privacyContact?: string | null; operatorName?: string | null; }
export const AuthModal: React.FC<Props> = ({ isOpen,onClose,onAuthSuccess,privacyContact,operatorName }) => {
  const [mode,setMode] = useState<'login'|'register'|'reset'>('login'); const [identity,setIdentity] = useState(''); const [email,setEmail] = useState(''); const [password,setPassword] = useState(''); const [mfaCode,setMfaCode] = useState(''); const [mfaRequired,setMfaRequired] = useState(false); const [token,setToken] = useState(''); const [error,setError] = useState(''); const [message,setMessage] = useState(''); const [loading,setLoading] = useState(false);
  if (!isOpen) return null;
  const register = mode === 'register'; const reset = mode === 'reset';
  const switchMode = (next: 'login'|'register'|'reset') => { setMode(next); setError(''); setMessage(''); setPassword(''); setMfaCode(''); setMfaRequired(false); setToken(''); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMessage(''); setLoading(true);
    try {
      if (reset) { await post('/api/auth/reset-password',{ token:token.trim(),new_password:password }); switchMode('login'); setMessage('Password reset. Sign in with your new password.'); }
      else { const result = await post<{ user: User }>(register ? '/api/auth/register' : '/api/auth/login',register ? { username:identity.trim(),email:email.trim(),password } : { username_or_email:identity.trim(),password,...(mfaCode.trim() ? { mfa_code:mfaCode.trim() } : {}) }); setPassword(''); setMfaCode(''); onAuthSuccess(result.user); onClose(); }
    } catch (e) { if (e instanceof ApiError && e.body?.mfa_required) setMfaRequired(true); setError((e as Error).message); }
    finally { setLoading(false); }
  };
  const field = 'field mt-1';
  return <Modal label={register ? 'Create account' : reset ? 'Reset password' : 'Sign in'} onClose={onClose}>
    <div className="flex justify-between items-start mb-5"><div><h2 className="text-xl font-bold">{register ? 'Create an account' : reset ? 'Reset your password' : 'Welcome back'}</h2><p className="text-xs muted mt-1">{reset ? 'Use the one-hour token issued by your administrator.' : 'Sign in to join discussions. Administrators manage feeds, links, and moderation.'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close authentication"><X size={20}/></button></div>
    <form onSubmit={submit} className="space-y-4">
      {reset ? <label className="block text-sm">Reset token<input className={field} autoComplete="off" required pattern="[a-f0-9]{64}" maxLength={64} value={token} onChange={e => setToken(e.target.value)}/></label> : <label className="block text-sm">{register ? 'Username' : 'Username or email'}<input className={field} autoComplete="username" required minLength={3} maxLength={register ? 30 : 254} pattern={register ? '[A-Za-z0-9_]{3,30}' : undefined} value={identity} onChange={e => setIdentity(e.target.value)}/></label>}
      {register && <label className="block text-sm">Email<input className={field} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>}
      <label className="block text-sm">{reset ? 'New password' : 'Password'}<input className={field} type="password" autoComplete={register || reset ? 'new-password' : 'current-password'} required minLength={register || reset ? 10 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)}/></label>
      {!register && !reset && (mfaRequired || mfaCode) && <label className="block text-sm">Authenticator or recovery code<input className={field} autoComplete="one-time-code" required minLength={6} maxLength={20} value={mfaCode} onChange={e => setMfaCode(e.target.value)}/><span className="block text-xs muted mt-1">Enter the current app code or an unused recovery code.</span></label>}
      {error && <p role="alert" className="flex gap-2 text-sm text-red-600 dark:text-red-400"><AlertCircle size={16}/>{error}</p>}{message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
      <button disabled={loading} className="primary-button w-full justify-center">{loading ? 'Please wait…' : register ? 'Create account' : reset ? 'Reset password' : 'Sign in'}</button>
    </form>
    <p className="text-xs muted mt-4">Passwords require at least 10 characters. {operatorName ? `Operator: ${operatorName}. ` : ''}{privacyContact ? <>Privacy requests: <span className="break-all">{privacyContact}</span>. </> : 'The operator has not configured a privacy contact. '}You can delete your account and authored reports in Account settings. See Privacy & analytics for data handling.</p>
    <div className="text-center text-xs mt-5 space-y-2"><p className="muted">{register ? 'Already registered?' : 'New to OpenCast?'} <button className="text-blue-600 dark:text-blue-400 font-semibold" onClick={() => switchMode(register ? 'login' : 'register')}>{register ? 'Sign in' : 'Create an account'}</button></p>{!reset && <button className="underline text-blue-600 dark:text-blue-400" onClick={() => switchMode('reset')}>Use a password reset token</button>}</div>
  </Modal>;
};
