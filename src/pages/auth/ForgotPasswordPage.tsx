import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui';

export function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!email) {
      toast('Please enter your email', 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      setSent(true);
      toast('Reset link sent to your email', 'success');
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

        {sent ? (
          <div className="text-center">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-50 mb-4">
              <Mail className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Check your email</h2>
            <p className="mt-2 text-sm text-slate-500">We've sent a password reset link to {email}</p>
            <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-slate-900">Forgot password?</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send you a reset link</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" loading={loading} className="w-full">
                Send Reset Link
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
