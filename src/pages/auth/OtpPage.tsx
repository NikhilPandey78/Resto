import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui';

export function OtpPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (idx: number, val: string) => {
    if (val.length > 1) return;
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (otp.some((d) => !d)) {
      toast('Please enter the complete code', 'error');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast('Verification successful', 'success');
      navigate('/dashboard');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900">StockSage</span>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">Verify your email</h2>
        <p className="mt-1 text-sm text-slate-500">Enter the 6-digit code sent to your email</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="flex justify-between gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 rounded-lg border border-slate-300 bg-white text-center text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            ))}
          </div>

          <Button type="submit" size="lg" loading={loading} className="w-full">
            Verify
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Didn't receive a code?{' '}
          <button className="font-semibold text-blue-600 hover:text-blue-700">Resend</button>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
