import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UtensilsCrossed, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui';

export function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: typeof errors = {};
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Min. 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Password updated successfully', 'success');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900">BhojMitra</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Set new password</h2>
        <p className="mt-1 text-sm text-slate-500">Enter your new password below</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm}</p>}
          </div>

          <Button type="submit" size="lg" loading={loading} className="w-full">
            Update Password
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
