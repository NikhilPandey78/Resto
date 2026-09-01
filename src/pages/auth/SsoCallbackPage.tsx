import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UtensilsCrossed, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { Button, Card } from '@/components/ui';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://apis.bhojmitra.in').replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

function sanitizeRedirect(url: string | null): string {
  if (!url || typeof url !== 'string') return '/dashboard';
  const trimmed = url.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.includes(':')) {
    return '/dashboard';
  }
  return trimmed;
}

export function SsoCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSsoSession } = useAuth();
  const toast = useToast();

  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get('code')?.trim();
    const redirectTarget = sanitizeRedirect(searchParams.get('redirect'));

    if (!code) {
      setError('No Single Sign-On authorization code was found in the link.');
      setProcessing(false);
      return;
    }

    if (!/^[a-f0-9]{64}$/i.test(code)) {
      setError('The Single Sign-On authorization code is invalid or malformed.');
      setProcessing(false);
      return;
    }

    async function exchangeCode() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/sso/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          const message = data?.error || 'Your Single Sign-On link has expired or has already been used.';
          setError(message);
          setProcessing(false);
          return;
        }

        setSsoSession(
          data.token,
          data.user,
          data.restaurant,
          data.restaurantUser,
          data.subscription,
          data.user?.id  // Pass partner_id explicitly
        );

        toast(`Welcome, ${data.restaurantUser?.full_name || data.restaurant?.name}!`, 'success');
        navigate(redirectTarget, { replace: true });
      } catch {
        setError('Unable to connect to the authentication server. Please check your internet connection or log in normally.');
        setProcessing(false);
      }
    }

    exchangeCode();
  }, [searchParams, setSsoSession, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md animate-slide-up">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900">BhojMitra</span>
        </div>

        {processing ? (
          <Card className="p-8 text-center shadow-sm">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-50 mb-5">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Signing you in...</h2>
            <p className="mt-2 text-sm text-slate-500">
              Verifying your secure Partner SSO session. You will be redirected shortly.
            </p>
          </Card>
        ) : error ? (
          <Card className="p-8 text-center shadow-sm border-red-100">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-red-50 mb-5">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Authentication Failed</h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/login" className="w-full">
                <Button className="w-full" size="lg">
                  Continue to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
