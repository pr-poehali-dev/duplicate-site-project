import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const navItems = [
  { id: 'dashboard', label: 'Дашборд', icon: 'LayoutDashboard' },
  { id: 'servers', label: 'Серверы', icon: 'Server' },
  { id: 'database', label: 'База данных', icon: 'Database' },
  { id: 'network', label: 'Сеть', icon: 'Network' },
  { id: 'security', label: 'Безопасность', icon: 'ShieldCheck' },
  { id: 'logs', label: 'Логи', icon: 'ScrollText' },
  { id: 'users', label: 'Пользователи', icon: 'Users' },
  { id: 'settings', label: 'Настройки', icon: 'Settings' },
];

const stats = [
  { label: 'CPU НАГРУЗКА', value: '42', unit: '%', icon: 'Cpu', color: 'var(--admin-accent)', trend: '+3.2%' },
  { label: 'ПАМЯТЬ', value: '11.4', unit: 'GB', icon: 'MemoryStick', color: 'var(--admin-cyan)', trend: '+1.1%' },
  { label: 'ДИСК', value: '68', unit: '%', icon: 'HardDrive', color: 'var(--admin-amber)', trend: '+0.4%' },
  { label: 'ТРАФИК', value: '1.2', unit: 'TB', icon: 'Activity', color: 'var(--admin-red)', trend: '+8.7%' },
];

const servers = [
  { name: 'web-prod-01', ip: '10.0.1.21', region: 'Москва', status: 'online', cpu: 38, uptime: '124д' },
  { name: 'web-prod-02', ip: '10.0.1.22', region: 'Москва', status: 'online', cpu: 51, uptime: '124д' },
  { name: 'db-master-01', ip: '10.0.2.10', region: 'СПб', status: 'online', cpu: 72, uptime: '89д' },
  { name: 'cache-redis-01', ip: '10.0.3.05', region: 'СПб', status: 'warning', cpu: 88, uptime: '12д' },
  { name: 'worker-queue-03', ip: '10.0.4.31', region: 'Казань', status: 'offline', cpu: 0, uptime: '—' },
  { name: 'backup-store-01', ip: '10.0.5.99', region: 'Казань', status: 'online', cpu: 14, uptime: '301д' },
];

const statusMap: Record<string, { color: string; label: string }> = {
  online: { color: 'var(--admin-accent)', label: 'В СЕТИ' },
  warning: { color: 'var(--admin-amber)', label: 'НАГРУЗКА' },
  offline: { color: 'var(--admin-red)', label: 'НЕ В СЕТИ' },
};

const chartData = [32, 45, 38, 52, 48, 61, 55, 70, 64, 58, 72, 66, 80, 74, 68, 62, 76, 70];

function Index() {
  const [active, setActive] = useState('dashboard');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="min-h-screen flex"
      style={{ background: `hsl(var(--admin-bg))`, color: 'hsl(0 0% 92%)' }}
    >
      {/* Sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col border-r"
        style={{ background: `hsl(var(--admin-panel))`, borderColor: `hsl(var(--admin-border))` }}
      >
        <div className="h-16 flex items-center gap-3 px-6 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
          <div
            className="w-9 h-9 rounded flex items-center justify-center"
            style={{ background: `hsl(var(--admin-accent))` }}
          >
            <Icon name="Terminal" size={20} className="text-black" />
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-wide leading-none">SERVER ADMIN</div>
            <div className="font-mono text-[10px]" style={{ color: `hsl(var(--admin-muted))` }}>v2.4.1 · production</div>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all"
                style={{
                  background: isActive ? `hsl(var(--admin-accent) / 0.12)` : 'transparent',
                  color: isActive ? `hsl(var(--admin-accent))` : `hsl(var(--admin-muted))`,
                  borderLeft: isActive ? `2px solid hsl(var(--admin-accent))` : '2px solid transparent',
                }}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: `hsl(var(--admin-border))` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center font-display font-bold text-black text-sm">
              АП
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">Админ Петров</div>
              <div className="font-mono text-[10px]" style={{ color: `hsl(var(--admin-muted))` }}>root@cluster</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-16 flex items-center justify-between px-8 border-b shrink-0"
          style={{ background: `hsl(var(--admin-panel))`, borderColor: `hsl(var(--admin-border))` }}
        >
          <div>
            <h1 className="font-display font-semibold text-xl tracking-wide uppercase">Дашборд</h1>
            <p className="font-mono text-[11px]" style={{ color: `hsl(var(--admin-muted))` }}>
              Мониторинг кластера в реальном времени
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded font-mono text-xs" style={{ background: `hsl(var(--admin-bg))`, color: `hsl(var(--admin-accent))` }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: `hsl(var(--admin-accent))` }} />
              ВСЕ СИСТЕМЫ РАБОТАЮТ
            </div>
            <div className="font-mono text-sm tabular-nums" style={{ color: `hsl(var(--admin-muted))` }}>
              {time.toLocaleTimeString('ru-RU')}
            </div>
            <button className="relative w-9 h-9 rounded flex items-center justify-center" style={{ background: `hsl(var(--admin-bg))` }}>
              <Icon name="Bell" size={18} style={{ color: `hsl(var(--admin-muted))` }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: `hsl(var(--admin-red))` }} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 space-y-8 admin-grid-bg">
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-lg p-5 border relative overflow-hidden"
                style={{ background: `hsl(var(--admin-panel))`, borderColor: `hsl(var(--admin-border))` }}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center"
                    style={{ background: `hsl(${s.color} / 0.12)` }}
                  >
                    <Icon name={s.icon} size={20} style={{ color: `hsl(${s.color})` }} />
                  </div>
                  <span className="font-mono text-xs" style={{ color: `hsl(var(--admin-accent))` }}>{s.trend}</span>
                </div>
                <div className="mt-4 font-mono text-[11px] tracking-wider" style={{ color: `hsl(var(--admin-muted))` }}>
                  {s.label}
                </div>
                <div className="mt-1 font-display font-bold text-3xl flex items-baseline gap-1">
                  {s.value}
                  <span className="text-base font-normal" style={{ color: `hsl(var(--admin-muted))` }}>{s.unit}</span>
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: `hsl(var(--admin-bg))` }}>
                  <div className="h-full rounded-full" style={{ width: `${s.value}%`, background: `hsl(${s.color})`, maxWidth: '100%' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Chart + side panel */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div
              className="xl:col-span-2 rounded-lg p-6 border"
              style={{ background: `hsl(var(--admin-panel))`, borderColor: `hsl(var(--admin-border))` }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display font-semibold text-lg uppercase tracking-wide">Нагрузка сети</h2>
                  <p className="font-mono text-[11px]" style={{ color: `hsl(var(--admin-muted))` }}>Последние 18 минут · Mbit/s</p>
                </div>
                <div className="flex gap-2">
                  {['1Ч', '24Ч', '7Д'].map((p, i) => (
                    <button
                      key={p}
                      className="px-3 py-1 rounded font-mono text-xs"
                      style={{
                        background: i === 0 ? `hsl(var(--admin-accent) / 0.15)` : `hsl(var(--admin-bg))`,
                        color: i === 0 ? `hsl(var(--admin-accent))` : `hsl(var(--admin-muted))`,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-48">
                {chartData.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end">
                    <div
                      className="w-full rounded-t transition-all duration-300"
                      style={{
                        height: `${v}%`,
                        background: `linear-gradient(to top, hsl(var(--admin-accent) / 0.3), hsl(var(--admin-accent)))`,
                        opacity: 0.75,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-lg p-6 border flex flex-col"
              style={{ background: `hsl(var(--admin-panel))`, borderColor: `hsl(var(--admin-border))` }}
            >
              <h2 className="font-display font-semibold text-lg uppercase tracking-wide mb-5">Состояние</h2>
              <div className="space-y-4 flex-1">
                {[
                  { label: 'API Gateway', val: 'OK', color: 'var(--admin-accent)' },
                  { label: 'PostgreSQL', val: 'OK', color: 'var(--admin-accent)' },
                  { label: 'Redis Cache', val: '88%', color: 'var(--admin-amber)' },
                  { label: 'Message Queue', val: 'СБОЙ', color: 'var(--admin-red)' },
                  { label: 'CDN', val: 'OK', color: 'var(--admin-accent)' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full" style={{ background: `hsl(${row.color})` }} />
                      <span className="text-sm">{row.label}</span>
                    </div>
                    <span className="font-mono text-xs" style={{ color: `hsl(${row.color})` }}>{row.val}</span>
                  </div>
                ))}
              </div>
              <button
                className="mt-6 w-full py-2.5 rounded font-display font-semibold text-sm uppercase tracking-wide text-black transition-opacity hover:opacity-90"
                style={{ background: `hsl(var(--admin-accent))` }}
              >
                Перезапустить узел
              </button>
            </div>
          </div>

          {/* Servers table */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{ background: `hsl(var(--admin-panel))`, borderColor: `hsl(var(--admin-border))` }}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: `hsl(var(--admin-border))` }}>
              <h2 className="font-display font-semibold text-lg uppercase tracking-wide">Серверы кластера</h2>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded font-mono text-xs"
                style={{ background: `hsl(var(--admin-bg))`, color: `hsl(var(--admin-cyan))` }}
              >
                <Icon name="Plus" size={14} />
                ДОБАВИТЬ
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="font-mono text-[11px] tracking-wider" style={{ color: `hsl(var(--admin-muted))` }}>
                    <th className="text-left font-normal px-6 py-3">ИМЯ</th>
                    <th className="text-left font-normal px-6 py-3">IP АДРЕС</th>
                    <th className="text-left font-normal px-6 py-3">РЕГИОН</th>
                    <th className="text-left font-normal px-6 py-3">CPU</th>
                    <th className="text-left font-normal px-6 py-3">UPTIME</th>
                    <th className="text-left font-normal px-6 py-3">СТАТУС</th>
                  </tr>
                </thead>
                <tbody>
                  {servers.map((srv) => {
                    const st = statusMap[srv.status];
                    return (
                      <tr
                        key={srv.name}
                        className="border-t transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: `hsl(var(--admin-border))` }}
                      >
                        <td className="px-6 py-4 font-mono">{srv.name}</td>
                        <td className="px-6 py-4 font-mono" style={{ color: `hsl(var(--admin-muted))` }}>{srv.ip}</td>
                        <td className="px-6 py-4">{srv.region}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: `hsl(var(--admin-bg))` }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${srv.cpu}%`, background: `hsl(${srv.cpu > 80 ? 'var(--admin-red)' : srv.cpu > 60 ? 'var(--admin-amber)' : 'var(--admin-accent)'})` }}
                              />
                            </div>
                            <span className="font-mono text-xs" style={{ color: `hsl(var(--admin-muted))` }}>{srv.cpu}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono" style={{ color: `hsl(var(--admin-muted))` }}>{srv.uptime}</td>
                        <td className="px-6 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] tracking-wider"
                            style={{ background: `hsl(${st.color} / 0.12)`, color: `hsl(${st.color})` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${st.color})` }} />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Index;
