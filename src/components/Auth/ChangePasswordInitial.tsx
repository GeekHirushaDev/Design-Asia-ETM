import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../lib/api';
import toast from 'react-hot-toast';
// Lazy import zxcvbn only when needed
let zxcvbnRef: any;

interface Props {
  onBackToLogin?: () => void;
}

export const ChangePasswordInitial: React.FC<Props> = ({ onBackToLogin }) => {
  const [login, setLogin] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [policyStrict, setPolicyStrict] = useState<boolean>((import.meta as any).env?.VITE_PASSWORD_STRICT_POLICY === 'true');

  const [score, setScore] = useState<number>(-1);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    if (policyStrict) {
      import('zxcvbn').then((m) => { zxcvbnRef = m.default || m; });
    }
  }, [policyStrict]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.login) setLogin(e.detail.login);
    };
    window.addEventListener('require-password-change', handler as any);
    return () => window.removeEventListener('require-password-change', handler as any);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login || !oldPassword || !newPassword) {
      toast.error('All fields are required');
      return;
    }
    if (policyStrict) {
      const strong = newPassword.length >= 8 && /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword);
      if (!strong) {
        toast.error('Password must be 8+ chars and include upper, lower, digit, and symbol.');
        return;
      }
    } else if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    try {
      setLoading(true);
      await authApi.changePasswordInitial({ login, oldPassword, newPassword });
      toast.success('Password changed. Please log in.');
      if (onBackToLogin) onBackToLogin();
      else window.dispatchEvent(new CustomEvent('navigate-to-login'));
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to change password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (policyStrict && zxcvbnRef && newPassword) {
      const res = zxcvbnRef(newPassword);
      setScore(res.score);
      setFeedback(res.feedback.warning || res.feedback.suggestions?.[0] || '');
    } else {
      setScore(-1);
      setFeedback('');
    }
  }, [newPassword, policyStrict]);

  const meterSegments = useMemo(() => {
    const filled = Math.max(0, score + 1); // zxcvbn 0..4
    return new Array(5).fill(0).map((_, i) => i < filled);
  }, [score]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Set a new password</h2>

        <div className="space-y-2">
          <label className="text-sm">Email or Username</label>
          <input value={login} onChange={(e) => setLogin(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="name@company.com or username" />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Current temporary password</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full border rounded px-3 py-2 pr-10" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-2.5 text-gray-500">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm">New password</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded px-3 py-2" />
          {policyStrict ? (
            <div className="space-y-1">
              <div className="flex gap-1">
                {meterSegments.map((on, i) => (
                  <div key={i} className={`h-1 flex-1 rounded ${on ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                ))}
              </div>
              <p className="text-xs text-gray-600">Min 8 chars, include upper, lower, digit, symbol.</p>
              {feedback && <p className="text-xs text-amber-600">{feedback}</p>}
            </div>
          ) : (
            <p className="text-xs text-gray-500">At least 6 characters.</p>
          )}
        </div>

        <button disabled={loading} className="w-full bg-indigo-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50">
          <Lock size={16} /> {loading ? 'Saving...' : 'Change Password'}
        </button>

        <button type="button" onClick={() => (onBackToLogin ? onBackToLogin() : window.dispatchEvent(new CustomEvent('navigate-to-login')))} className="w-full text-sm text-gray-600 underline">
          Back to login
        </button>
      </form>
    </div>
  );
};


