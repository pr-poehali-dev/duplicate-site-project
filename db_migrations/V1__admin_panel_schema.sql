CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    login_hash TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    twofa_hash TEXT NOT NULL,
    server_status TEXT NOT NULL DEFAULT 'online',
    server_ip TEXT NOT NULL DEFAULT 'play.legacycraft.ru',
    next_wipe TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_products (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    icon TEXT DEFAULT '',
    color TEXT DEFAULT '#22c55e',
    bg TEXT DEFAULT '#0f172a',
    price TEXT DEFAULT '',
    description TEXT DEFAULT '',
    unavailable BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE admin_links (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE admin_lockouts (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL DEFAULT 'auth',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lockouts_ip ON admin_lockouts(ip);

CREATE TABLE admin_sessions (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_sessions_token ON admin_sessions(token);

CREATE TABLE admin_session_bans (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    banned_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_session_bans_ip ON admin_session_bans(ip);

INSERT INTO admin_settings (login_hash, password_hash, twofa_hash, server_status, server_ip, next_wipe)
VALUES (
    'cd5e5e8a3f9c9e2a18f8e4b1c6a0d7e3f2b9c8a7d6e5f4a3b2c1d0e9f8a7b6c5',
    'PLACEHOLDER_PWD',
    'PLACEHOLDER_2FA',
    'online',
    'play.legacycraft.ru',
    now() + interval '7 days'
);

INSERT INTO admin_products (title, icon, color, bg, price, description, unavailable, sort_order) VALUES
('VIP', 'Crown', '#fbbf24', '#1e1b4b', '149 ₽', 'Доступ к VIP-возможностям сервера', false, 0),
('PREMIUM', 'Gem', '#a855f7', '#1e1b4b', '299 ₽', 'Расширенные привилегии и киты', false, 1),
('LEGEND', 'Star', '#22d3ee', '#1e1b4b', '599 ₽', 'Максимальные возможности', true, 2);

INSERT INTO admin_links (label, url, sort_order) VALUES
('Канал Макса', 'https://t.me/maxchannel', 0),
('Группа ВК', 'https://vk.com/legacycraft', 1),
('Discord', 'https://discord.gg/legacycraft', 2);
