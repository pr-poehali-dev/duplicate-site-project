import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { authRequest } from '@/lib/api';

interface Props {
  onSuccess: (token: string) => void;
}

type Stage = 'login' | '2fa' | 'locked' | 'loading';

function formatLeft(until: string): string {
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return '0с';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м ${s}с`;
  return `${s}с`;
}

export default function LoginScreen({ onSuccess }: Props) {
  const [stage, setStage] = useState<Stage>('loading');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stageToken, setStageToken] = useState('');
  const [lockUntil, setLockUntil] = useState('');
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    authRequest({ action: 'check' }).then(({ data }) => {
      if (data.locked || data.banned) {
        setLockUntil(data.until);
        setStage('locked');
      } else {
        setStage('login');
      }
    }).catch(() => setStage('login'));
  }, []);

  useEffect(() => {
    if (stage !== 'locked') return;
    const t = setInterval(() => {
      setTick((x) => x + 1);
      if (new Date(lockUntil).getTime() - Date.now() <= 0) {
        setStage('login');
        setDenied(false);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [stage, lockUntil]);

  const showDenied = () => {
    setDenied(true);
    setTimeout(() => setDenied(false), 2500);
  };

  const doLogin = async () => {
    if (busy) return;
    setBusy(true);
    const { data } = await authRequest({ action: 'login', login, password });
    setBusy(false);
    if (data.stage === '2fa') {
      setStageToken(data.stageToken);
      setStage('2fa');
      setPassword('');
    } else if (data.locked || data.banned) {
      setLockUntil(data.until);
      setStage('locked');
    } else {
      showDenied();
    }
  };

  const do2fa = async () => {
    if (busy) return;
    setBusy(true);
    const { data } = await authRequest({ action: 'twofa', stageToken, code });
    setBusy(false);
    if (data.success) {
      onSuccess(data.token);
    } else if (data.locked || data.banned) {
      setLockUntil(data.until);
      setStage('locked');
    } else {
      showDenied();
      setStage('login');
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'hsl(220 26% 7%)' }}>
      <div className="absolute inset-0 admin-grid-bg opacity-40" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'hsl(152 76% 48%)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'hsl(0 84% 60%)' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl items-center justify-center mb-4" style={{ background: 'hsl(152 76% 48%)' }}>
            <Icon name="ShieldCheck" size={28} className="text-black" />
          </div>
          <h1 className="font-display font-bold text-2xl tracking-wide text-white uppercase">Legacy Craft · Admin</h1>
          <p className="font-mono text-xs mt-1" style={{ color: 'hsl(220 12% 56%)' }}>Защищённая панель управления</p>
        </div>

        {stage === 'loading' && (
          <div className="text-center py-10">
            <Icon name="Loader2" size={32} className="animate-spin mx-auto text-white" />
          </div>
        )}

        {stage === 'locked' && (
          <div className="rounded-xl border p-8 text-center" style={{ background: 'hsl(0 60% 12% / 0.4)', borderColor: 'hsl(0 84% 60% / 0.4)' }}>
            <div className="inline-flex w-16 h-16 rounded-full items-center justify-center mb-4" style={{ background: 'hsl(0 84% 60% / 0.15)' }}>
              <Icon name="Ban" size={32} style={{ color: 'hsl(0 84% 60%)' }} />
            </div>
            <h2 className="font-display font-bold text-2xl uppercase tracking-wide" style={{ color: 'hsl(0 84% 65%)' }}>Доступ запрещён</h2>
            <p className="text-sm mt-2" style={{ color: 'hsl(220 12% 70%)' }}>Повторите попытку позже</p>
            <div className="mt-5 font-mono text-3xl tabular-nums text-white">{formatLeft(lockUntil)}</div>
          </div>
        )}

        {(stage === 'login' || stage === '2fa') && (
          <div className="rounded-xl border p-8" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }}>
            {denied && (
              <div className="mb-5 rounded-lg p-3 flex items-center gap-2 animate-fade-in" style={{ background: 'hsl(0 84% 60% / 0.12)', color: 'hsl(0 84% 70%)' }}>
                <Icon name="AlertTriangle" size={16} />
                <span className="text-sm font-medium">Доступ запрещён</span>
              </div>
            )}

            {stage === 'login' ? (
              <>
                <Field icon="User" placeholder="Логин" value={login} onChange={setLogin} />
                <Field icon="Lock" placeholder="Пароль" value={password} onChange={setPassword} type="password" />
                <button onClick={doLogin} disabled={busy || !login || !password} className="w-full mt-2 py-3 rounded-lg font-display font-semibold text-sm uppercase tracking-wide text-black transition-opacity disabled:opacity-40" style={{ background: 'hsl(152 76% 48%)' }}>
                  {busy ? 'Проверка…' : 'Продолжить'}
                </button>
              </>
            ) : (
              <>
                <div className="mb-5 text-center">
                  <Icon name="KeyRound" size={24} className="mx-auto mb-2" style={{ color: 'hsl(188 94% 50%)' }} />
                  <p className="text-sm" style={{ color: 'hsl(220 12% 70%)' }}>Введите код двухфакторной защиты</p>
                </div>
                <Field icon="KeyRound" placeholder="Код 2FA" value={code} onChange={setCode} type="password" onEnter={do2fa} />
                <button onClick={do2fa} disabled={busy || !code} className="w-full mt-2 py-3 rounded-lg font-display font-semibold text-sm uppercase tracking-wide text-black transition-opacity disabled:opacity-40" style={{ background: 'hsl(188 94% 50%)' }}>
                  {busy ? 'Проверка…' : 'Войти'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon, placeholder, value, onChange, type = 'text', onEnter }: {
  icon: string; placeholder: string; value: string; onChange: (v: string) => void; type?: string; onEnter?: () => void;
}) {
  return (
    <div className="relative mb-4">
      <Icon name={icon} size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(220 12% 50%)' }} />
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className="w-full pl-10 pr-4 py-3 rounded-lg text-white outline-none border transition-colors focus:border-emerald-400"
        style={{ background: 'hsl(220 26% 7%)', borderColor: 'hsl(220 18% 18%)' }}
        autoComplete="off"
      />
    </div>
  );
}
