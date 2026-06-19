import { useState, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { settingsRequest } from '@/lib/api';

interface Product { id?: number; title: string; icon: string; color: string; bg: string; price: string; description: string; unavailable: boolean; }
interface LinkItem { id?: number; label: string; url: string; }
interface State {
  serverStatus: string; serverIp: string; nextWipe: string | null;
  products: Product[]; links: LinkItem[]; activeSessions: number;
}

const STATUS_OPTIONS = [
  { key: 'online', label: 'СЕРВЕР ОНЛАЙН', color: '#22c55e' },
  { key: 'restart', label: 'ПЕРЕЗАГРУЗКА', color: '#fbbf24' },
  { key: 'offline', label: 'СЕРВЕР ВЫКЛЮЧЕН', color: '#ef4444' },
];

const TABS = [
  { id: 'server', label: 'Сервер', icon: 'Server' },
  { id: 'wipe', label: 'Вайп', icon: 'CalendarClock' },
  { id: 'products', label: 'Товары', icon: 'ShoppingBag' },
  { id: 'links', label: 'Ссылки', icon: 'Link' },
  { id: 'security', label: 'Безопасность', icon: 'ShieldCheck' },
];

export default function AdminPanel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState('server');
  const [state, setState] = useState<State | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    const { data } = await settingsRequest({ action: 'state' }, token);
    if (data.serverStatus) setState(data as State);
    else if (data.error === 'unauthorized') onLogout();
  }, [token, onLogout]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const save = async (payload: Record<string, unknown>, msg = 'Сохранено и отправлено на сайт') => {
    const { data } = await settingsRequest(payload, token);
    if (data.ok) { flash(msg); load(); }
    else if (data.error === 'unauthorized') onLogout();
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(220 26% 7%)' }}>
        <Icon name="Loader2" size={32} className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'hsl(220 26% 7%)', color: 'hsl(0 0% 92%)' }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg px-4 py-3 flex items-center gap-2 animate-fade-in shadow-xl" style={{ background: 'hsl(152 76% 48%)', color: '#000' }}>
          <Icon name="CheckCircle2" size={18} />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b sticky top-0 z-40" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: 'hsl(152 76% 48%)' }}>
            <Icon name="ShieldCheck" size={20} className="text-black" />
          </div>
          <div>
            <div className="font-display font-bold tracking-wide leading-none">LEGACY CRAFT · ADMIN</div>
            <div className="font-mono text-[10px]" style={{ color: 'hsl(220 12% 56%)' }}>синхронизация активна · обновление ≤ 5 мин</div>
          </div>
        </div>
        <button onClick={() => { settingsRequest({ action: 'logout' }, token); onLogout(); }} className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs" style={{ background: 'hsl(220 26% 7%)', color: 'hsl(0 84% 65%)' }}>
          <Icon name="LogOut" size={14} /> ВЫХОД
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r p-3 hidden md:block" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium mb-1 transition-all" style={{ background: tab === t.id ? 'hsl(152 76% 48% / 0.12)' : 'transparent', color: tab === t.id ? 'hsl(152 76% 55%)' : 'hsl(220 12% 56%)', borderLeft: tab === t.id ? '2px solid hsl(152 76% 48%)' : '2px solid transparent' }}>
              <Icon name={t.icon} size={18} /> {t.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-auto p-6 admin-grid-bg">
          {/* mobile tabs */}
          <div className="flex gap-2 mb-6 md:hidden overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-2 rounded text-xs whitespace-nowrap" style={{ background: tab === t.id ? 'hsl(152 76% 48%)' : 'hsl(222 24% 10%)', color: tab === t.id ? '#000' : 'hsl(220 12% 56%)' }}>{t.label}</button>
            ))}
          </div>

          {tab === 'server' && <ServerTab state={state} save={save} />}
          {tab === 'wipe' && <WipeTab state={state} save={save} />}
          {tab === 'products' && <ProductsTab state={state} save={save} />}
          {tab === 'links' && <LinksTab state={state} save={save} />}
          {tab === 'security' && <SecurityTab token={token} state={state} flash={flash} onLogout={onLogout} load={load} />}
        </main>
      </div>
    </div>
  );
}

function Card({ children, title, desc }: { children: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="rounded-xl border p-6 mb-5" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }}>
      <h2 className="font-display font-semibold text-lg uppercase tracking-wide">{title}</h2>
      {desc && <p className="font-mono text-[11px] mb-4" style={{ color: 'hsl(220 12% 56%)' }}>{desc}</p>}
      <div className={desc ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-white outline-none border focus:border-emerald-400 transition-colors" style={{ background: 'hsl(220 26% 7%)', borderColor: 'hsl(220 18% 18%)' }} />;
}

function ServerTab({ state, save }: { state: State; save: (p: Record<string, unknown>) => void }) {
  const [ip, setIp] = useState(state.serverIp);
  return (
    <>
      <Card title="Статус сервера" desc="Изменится на сайте у всех игроков · обновление ≤ 5 минут">
        <div className="grid sm:grid-cols-3 gap-3">
          {STATUS_OPTIONS.map((o) => {
            const active = state.serverStatus === o.key;
            return (
              <button key={o.key} onClick={() => save({ action: 'set_status', status: o.key })} className="rounded-lg p-4 border-2 flex flex-col items-center gap-2 transition-all" style={{ borderColor: active ? o.color : 'hsl(220 18% 18%)', background: active ? `${o.color}1a` : 'hsl(220 26% 7%)' }}>
                <span className="w-4 h-4 rounded-full" style={{ background: o.color, boxShadow: active ? `0 0 12px ${o.color}` : 'none' }} />
                <span className="font-display font-semibold text-xs tracking-wide" style={{ color: active ? o.color : 'hsl(220 12% 60%)' }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card title="IP адрес сервера" desc="Адрес для подключения">
        <div className="flex gap-3">
          <Input value={ip} onChange={setIp} placeholder="play.legacycraft.ru" />
          <button onClick={() => save({ action: 'set_ip', ip })} className="px-5 rounded-lg font-display font-semibold text-sm text-black shrink-0" style={{ background: 'hsl(152 76% 48%)' }}>Сохранить</button>
        </div>
      </Card>
    </>
  );
}

function WipeTab({ state, save }: { state: State; save: (p: Record<string, unknown>) => void }) {
  const toLocal = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [val, setVal] = useState(toLocal(state.nextWipe));
  const left = state.nextWipe ? new Date(state.nextWipe).getTime() - Date.now() : 0;
  const days = Math.max(0, Math.floor(left / 86400000));
  const hours = Math.max(0, Math.floor((left % 86400000) / 3600000));
  return (
    <Card title="Дата следующего вайпа" desc="Таймер автоматически пересчитается на сайте">
      <div className="rounded-lg p-5 mb-4 text-center" style={{ background: 'hsl(220 26% 7%)' }}>
        <div className="font-mono text-xs mb-1" style={{ color: 'hsl(220 12% 56%)' }}>ДО ВАЙПА ОСТАЛОСЬ</div>
        <div className="font-display font-bold text-3xl text-white">{days}д {hours}ч</div>
        <div className="font-mono text-xs mt-1" style={{ color: 'hsl(188 94% 50%)' }}>{state.nextWipe ? new Date(state.nextWipe).toLocaleString('ru-RU') : '—'}</div>
      </div>
      <input type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-white outline-none border mb-3" style={{ background: 'hsl(220 26% 7%)', borderColor: 'hsl(220 18% 18%)', colorScheme: 'dark' }} />
      <button onClick={() => save({ action: 'set_wipe', wipe: val ? new Date(val).toISOString() : null })} className="w-full py-3 rounded-lg font-display font-semibold text-sm text-black" style={{ background: 'hsl(152 76% 48%)' }}>Установить дату вайпа</button>
    </Card>
  );
}

function ProductsTab({ state, save }: { state: State; save: (p: Record<string, unknown>) => void }) {
  const empty: Product = { title: 'Новый товар', icon: 'Gift', color: '#22c55e', bg: '#1e1b4b', price: '', description: '', unavailable: false };
  const [edit, setEdit] = useState<Product | null>(null);
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display font-semibold text-lg uppercase tracking-wide">Товары магазина</h2>
        <button onClick={() => setEdit({ ...empty })} className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs" style={{ background: 'hsl(152 76% 48%)', color: '#000' }}><Icon name="Plus" size={14} /> ДОБАВИТЬ</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.products.map((p) => (
          <div key={p.id} className="rounded-xl border p-5 relative" style={{ background: p.bg, borderColor: 'hsl(220 18% 18%)' }}>
            {p.unavailable && <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'hsl(0 84% 60% / 0.2)', color: 'hsl(0 84% 70%)' }}>НЕДОСТУПНО</span>}
            <Icon name={p.icon} size={28} style={{ color: p.color }} fallback="Gift" />
            <div className="font-display font-bold text-xl mt-3 text-white">{p.title}</div>
            <div className="text-sm mt-1" style={{ color: 'hsl(220 12% 70%)' }}>{p.description}</div>
            <div className="font-display font-bold text-lg mt-3" style={{ color: p.color }}>{p.price} ₽</div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEdit(p)} className="flex-1 py-1.5 rounded text-xs font-medium" style={{ background: 'hsl(220 26% 7%)', color: '#fff' }}>Изменить</button>
              <button onClick={() => save({ action: 'delete_product', id: p.id })} className="px-3 py-1.5 rounded text-xs" style={{ background: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 70%)' }}><Icon name="Trash2" size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      {edit && <ProductModal product={edit} onClose={() => setEdit(null)} onSave={(p) => { save({ action: 'save_product', product: p }); setEdit(null); }} />}
    </>
  );
}

function ProductModal({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (p: Product) => void }) {
  const [p, setP] = useState<Product>(product);
  const set = (k: keyof Product, v: unknown) => setP({ ...p, [k]: v });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border p-6 max-h-[90vh] overflow-auto" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-semibold text-lg uppercase mb-4 text-white">Товар</h3>
        <Label>Название</Label><Input value={p.title} onChange={(v) => set('title', v)} />
        <Label>Иконка (имя Lucide)</Label><Input value={p.icon} onChange={(v) => set('icon', v)} placeholder="Crown, Gem, Star…" />
        <Label>Описание</Label><Input value={p.description} onChange={(v) => set('description', v)} />
        <Label>Цена</Label><Input value={p.price} onChange={(v) => set('price', v)} />
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div><Label>Цвет</Label><input type="color" value={p.color} onChange={(e) => set('color', e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" /></div>
          <div><Label>Фон</Label><input type="color" value={p.bg} onChange={(e) => set('bg', e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent" /></div>
        </div>
        <label className="flex items-center gap-2 mt-4 cursor-pointer">
          <input type="checkbox" checked={p.unavailable} onChange={(e) => set('unavailable', e.target.checked)} className="w-4 h-4 accent-red-500" />
          <span className="text-sm text-white">Показать надпись «недоступно» под кнопкой «купить»</span>
        </label>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: 'hsl(220 26% 7%)', color: '#fff' }}>Отмена</button>
          <button onClick={() => onSave(p)} className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-black" style={{ background: 'hsl(152 76% 48%)' }}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

function LinksTab({ state, save }: { state: State; save: (p: Record<string, unknown>) => void }) {
  const [items, setItems] = useState<LinkItem[]>(state.links);
  useEffect(() => setItems(state.links), [state.links]);
  const upd = (i: number, k: 'label' | 'url', v: string) => { const c = [...items]; c[i] = { ...c[i], [k]: v }; setItems(c); };
  return (
    <Card title="Ссылки и кнопки" desc="Меняйте текст и адрес кнопок — обновится на сайте">
      {items.map((l, i) => (
        <div key={l.id ?? i} className="flex flex-col sm:flex-row gap-2 mb-3 p-3 rounded-lg" style={{ background: 'hsl(220 26% 7%)' }}>
          <input value={l.label} onChange={(e) => upd(i, 'label', e.target.value)} placeholder="Текст кнопки" className="flex-1 px-3 py-2 rounded text-white outline-none border" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }} />
          <input value={l.url} onChange={(e) => upd(i, 'url', e.target.value)} placeholder="https://…" className="flex-[2] px-3 py-2 rounded text-white outline-none border font-mono text-sm" style={{ background: 'hsl(222 24% 10%)', borderColor: 'hsl(220 18% 18%)' }} />
          <button onClick={() => save({ action: 'save_link', link: l })} className="px-4 rounded text-sm font-semibold text-black" style={{ background: 'hsl(152 76% 48%)' }}>OK</button>
          <button onClick={() => save({ action: 'delete_link', id: l.id })} className="px-3 rounded" style={{ background: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 70%)' }}><Icon name="Trash2" size={14} /></button>
        </div>
      ))}
      <button onClick={() => save({ action: 'save_link', link: { label: 'Новая ссылка', url: '' } })} className="w-full py-2.5 rounded-lg border border-dashed text-sm mt-2" style={{ borderColor: 'hsl(220 18% 30%)', color: 'hsl(220 12% 56%)' }}>+ Добавить ссылку</button>
    </Card>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] mt-3 mb-1" style={{ color: 'hsl(220 12% 56%)' }}>{children}</div>;
}

function SecurityTab({ token, state, flash, onLogout, load }: { token: string; state: State; flash: (m: string) => void; onLogout: () => void; load: () => void }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [twofa, setTwofa] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const changeCreds = async () => {
    const payload: Record<string, unknown> = { action: 'change_credentials' };
    if (login) payload.login = login;
    if (password) payload.password = password;
    if (twofa) payload.twofa = twofa;
    const { data } = await settingsRequest(payload, token);
    if (data.ok) { flash('Данные для входа обновлены'); setLogin(''); setPassword(''); setTwofa(''); }
    else if (data.error === 'unauthorized') onLogout();
  };

  const revoke = async () => {
    const { data } = await settingsRequest({ action: 'revoke_others' }, token);
    if (data.ok) { flash('Все другие сессии отключены и заблокированы на неделю'); setConfirmRevoke(false); load(); }
    else if (data.error === 'unauthorized') onLogout();
  };

  return (
    <>
      <Card title="Смена данных для входа" desc="Заполните только то, что хотите изменить">
        <Label>Новый логин</Label><Input value={login} onChange={setLogin} placeholder="оставьте пустым, если не меняете" />
        <Label>Новый пароль</Label><Input value={password} onChange={setPassword} placeholder="оставьте пустым, если не меняете" />
        <Label>Новый пароль 2FA</Label><Input value={twofa} onChange={setTwofa} placeholder="оставьте пустым, если не меняете" />
        <button onClick={changeCreds} disabled={!login && !password && !twofa} className="w-full mt-4 py-3 rounded-lg font-display font-semibold text-sm text-black disabled:opacity-40" style={{ background: 'hsl(152 76% 48%)' }}>Сохранить новые данные</button>
      </Card>

      <Card title="Активные сессии" desc={`Сейчас в аккаунте: ${state.activeSessions} сессий`}>
        <p className="text-sm mb-4" style={{ color: 'hsl(220 12% 70%)' }}>Выкинуть всех из аккаунта, кроме текущей сессии. Все остальные вылетят и будут заблокированы на неделю без возможности входа.</p>
        {!confirmRevoke ? (
          <button onClick={() => setConfirmRevoke(true)} className="w-full py-3 rounded-lg font-display font-semibold text-sm" style={{ background: 'hsl(0 84% 60% / 0.15)', color: 'hsl(0 84% 70%)' }}>Выйти на всех устройствах</button>
        ) : (
          <div className="rounded-lg p-4" style={{ background: 'hsl(0 84% 60% / 0.1)' }}>
            <p className="text-sm mb-3 text-center" style={{ color: 'hsl(0 84% 75%)' }}>Подтвердите действие — это нельзя отменить</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRevoke(false)} className="flex-1 py-2.5 rounded-lg text-sm" style={{ background: 'hsl(220 26% 7%)', color: '#fff' }}>Отмена</button>
              <button onClick={revoke} className="flex-1 py-2.5 rounded-lg font-semibold text-sm text-white" style={{ background: 'hsl(0 84% 55%)' }}>Подтвердить</button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}