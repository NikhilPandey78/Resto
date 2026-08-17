import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Restaurant, RestaurantUser, Subscription } from '@/lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  restaurant: Restaurant | null;
  restaurantUser: RestaurantUser | null;
  subscription: Subscription | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, restaurantName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DEMO_EMAIL = 'demo@spicegarden.in';
const DEMO_PASSWORD = 'demo1234';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_RESTAURANT_ID = '00000000-0000-0000-0000-000000000002';

const DEMO_RESTAURANT: Restaurant = {
  id: DEMO_RESTAURANT_ID,
  name: 'SpiceGarden Demo',
  legal_name: 'SpiceGarden Demo Restaurant',
  gst_number: null,
  phone: null,
  email: DEMO_EMAIL,
  address: 'Demo Street, Bengaluru',
  city: 'Bengaluru',
  state: 'Karnataka',
  postal_code: '560001',
  country: 'India',
  currency: 'INR',
  logo_url: null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_RESTAURANT_USER: RestaurantUser = {
  id: '00000000-0000-0000-0000-000000000003',
  restaurant_id: DEMO_RESTAURANT_ID,
  auth_user_id: DEMO_USER_ID,
  branch_id: null,
  full_name: 'Demo Manager',
  email: DEMO_EMAIL,
  phone: null,
  role: 'owner',
  status: 'active',
  created_at: new Date().toISOString(),
};

const DEMO_SUBSCRIPTION: Subscription = {
  id: '00000000-0000-0000-0000-000000000004',
  restaurant_id: DEMO_RESTAURANT_ID,
  plan: 'trial',
  status: 'trial',
  start_date: new Date().toISOString().slice(0, 10),
  expiry_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  billing_cycle: 'monthly',
  amount: 0,
  auto_renewal: false,
  max_branches: 1,
  max_users: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_USER = {
  id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  app_metadata: { provider: 'demo', providers: ['demo'] },
  user_metadata: { full_name: 'Demo Manager' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const isDemoLogin = (email: string, password: string) => email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantUser, setRestaurantUser] = useState<RestaurantUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data: ru, error: ruError } = await supabase
      .from('restaurant_users')
      .select('*')
      .eq('auth_user_id', uid)
      .maybeSingle();

    if (ruError || !ru) {
      setRestaurant(null);
      setRestaurantUser(null);
      setSubscription(null);
      return;
    }

    setRestaurantUser(ru as RestaurantUser);

    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', ru.restaurant_id)
      .maybeSingle();
    setRestaurant(rest as Restaurant);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', ru.restaurant_id)
      .maybeSingle();
    setSubscription(sub as Subscription);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id);
          setLoading(false);
        })();
      } else {
        setRestaurant(null);
        setRestaurantUser(null);
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (isDemoLogin(normalizedEmail, password)) {
      const demoSession = {
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor((Date.now() + 3600000) / 1000),
        token_type: 'bearer',
        user: DEMO_USER,
      } as Session;

      setSession(demoSession);
      setUser(DEMO_USER);
      setRestaurant(DEMO_RESTAURANT);
      setRestaurantUser(DEMO_RESTAURANT_USER);
      setSubscription(DEMO_SUBSCRIPTION);
      setLoading(false);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, restaurantName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (!userId) return { error: 'Failed to create account.' };

    const { data: rest } = await supabase
      .from('restaurants')
      .insert({ name: restaurantName, email, status: 'active' })
      .select()
      .single();

    await supabase.from('restaurant_users').insert({
      restaurant_id: rest.id,
      auth_user_id: userId,
      full_name: fullName,
      email,
      role: 'owner',
      status: 'active',
    });

    await supabase.from('subscriptions').insert({
      restaurant_id: rest.id,
      plan: 'trial',
      status: 'trial',
      start_date: new Date().toISOString().slice(0, 10),
      expiry_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      billing_cycle: 'monthly',
      amount: 0,
      auto_renewal: false,
      max_branches: 1,
      max_users: 3,
    });

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRestaurant(null);
    setRestaurantUser(null);
    setSubscription(null);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, restaurant, restaurantUser, subscription, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
