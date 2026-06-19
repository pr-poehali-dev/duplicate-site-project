import { useState, useEffect } from 'react';
import LoginScreen from '@/components/admin/LoginScreen';
import AdminPanel from '@/components/admin/AdminPanel';

const TOKEN_KEY = 'lc_admin_token';

function Index() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, [token]);

  if (!token) {
    return <LoginScreen onSuccess={(t) => setToken(t)} />;
  }

  return <AdminPanel token={token} onLogout={() => setToken(null)} />;
}

export default Index;
