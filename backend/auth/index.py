import json
import os
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
import psycopg2

DEFAULT_LOGIN = 'Vxod_927130Admin'
DEFAULT_PASSWORD = '09nNxFOzkdMf%3j'
DEFAULT_2FA = 'DktB98%LSdpK15I'

LOCK_HOURS = 1
SESSION_BAN_DAYS = 7

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def sha(value: str) -> str:
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


SCHEMA_SQL = '''
CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    login_hash TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    twofa_hash TEXT NOT NULL,
    server_status TEXT NOT NULL DEFAULT 'online',
    server_ip TEXT NOT NULL DEFAULT 'play.legacycraft.ru',
    next_wipe TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_products (
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
CREATE TABLE IF NOT EXISTS admin_links (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS admin_lockouts (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL DEFAULT 'auth',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lockouts_ip ON admin_lockouts(ip);
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    ip TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions(token);
CREATE TABLE IF NOT EXISTS admin_session_bans (
    id SERIAL PRIMARY KEY,
    ip TEXT NOT NULL,
    banned_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_bans_ip ON admin_session_bans(ip);
'''


def ensure_schema(cur):
    cur.execute(SCHEMA_SQL)
    cur.execute('SELECT COUNT(*) FROM admin_products')
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO admin_products (title, icon, color, bg, price, description, unavailable, sort_order) VALUES "
            "('VIP','Crown','#fbbf24','#1e1b4b','149','Доступ к VIP-возможностям сервера',false,0),"
            "('PREMIUM','Gem','#a855f7','#1e1b4b','299','Расширенные привилегии и киты',false,1),"
            "('LEGEND','Star','#22d3ee','#1e1b4b','599','Максимальные возможности',true,2)"
        )
    cur.execute('SELECT COUNT(*) FROM admin_links')
    if cur.fetchone()[0] == 0:
        cur.execute(
            "INSERT INTO admin_links (label, url, sort_order) VALUES "
            "('Канал Макса','https://t.me/maxchannel',0),"
            "('Группа ВК','https://vk.com/legacycraft',1),"
            "('Discord','https://discord.gg/legacycraft',2)"
        )


def ensure_seed(cur):
    ensure_schema(cur)
    cur.execute('SELECT COUNT(*) FROM admin_settings')
    if cur.fetchone()[0] == 0:
        cur.execute(
            'INSERT INTO admin_settings (login_hash, password_hash, twofa_hash, server_status, server_ip, next_wipe) '
            "VALUES (%s, %s, %s, 'online', 'play.legacycraft.ru', now() + interval '7 days')",
            (sha(DEFAULT_LOGIN), sha(DEFAULT_PASSWORD), sha(DEFAULT_2FA)),
        )
    else:
        cur.execute("SELECT password_hash FROM admin_settings ORDER BY id LIMIT 1")
        row = cur.fetchone()
        if row and row[0] == 'PLACEHOLDER_PWD':
            cur.execute(
                'UPDATE admin_settings SET login_hash=%s, password_hash=%s, twofa_hash=%s',
                (sha(DEFAULT_LOGIN), sha(DEFAULT_PASSWORD), sha(DEFAULT_2FA)),
            )


def get_ip(event) -> str:
    rc = event.get('requestContext', {}) or {}
    ident = rc.get('identity', {}) or {}
    return ident.get('sourceIp', 'unknown')


def active_lock(cur, ip: str):
    cur.execute(
        'SELECT locked_until FROM admin_lockouts WHERE ip=%s AND locked_until > now() ORDER BY locked_until DESC LIMIT 1',
        (ip,),
    )
    row = cur.fetchone()
    return row[0] if row else None


def active_session_ban(cur, ip: str):
    cur.execute(
        'SELECT banned_until FROM admin_session_bans WHERE ip=%s AND banned_until > now() ORDER BY banned_until DESC LIMIT 1',
        (ip,),
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event, context):
    '''Авторизация админ-панели: логин/пароль, двухфакторная защита, блокировки по IP'''
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    ip = get_ip(event)

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor()
    ensure_seed(cur)

    ban = active_session_ban(cur, ip)
    if ban:
        cur.close()
        conn.close()
        return resp(403, {'banned': True, 'until': ban.isoformat(), 'message': 'Доступ запрещён'})

    lock = active_lock(cur, ip)
    if lock:
        cur.close()
        conn.close()
        return resp(403, {'locked': True, 'until': lock.isoformat(), 'message': 'Доступ запрещён'})

    if method == 'GET' or action == 'check':
        cur.close()
        conn.close()
        return resp(200, {'locked': False, 'banned': False})

    if action == 'login':
        login = body.get('login', '')
        password = body.get('password', '')
        cur.execute('SELECT login_hash, password_hash FROM admin_settings ORDER BY id LIMIT 1')
        row = cur.fetchone()
        if row and sha(login) == row[0] and sha(password) == row[1]:
            stage_token = secrets.token_urlsafe(24)
            cur.execute(
                "INSERT INTO admin_sessions (token, ip, user_agent, revoked) VALUES (%s, %s, %s, true)",
                (stage_token, ip, (event.get('headers') or {}).get('User-Agent', '')),
            )
            cur.close()
            conn.close()
            return resp(200, {'stage': '2fa', 'stageToken': stage_token})
        else:
            until = datetime.now(timezone.utc) + timedelta(hours=LOCK_HOURS)
            cur.execute(
                "INSERT INTO admin_lockouts (ip, locked_until, reason) VALUES (%s, %s, 'auth')",
                (ip, until),
            )
            cur.close()
            conn.close()
            return resp(403, {'locked': True, 'until': until.isoformat(), 'message': 'Доступ запрещён'})

    if action == 'twofa':
        stage_token = body.get('stageToken', '')
        code = body.get('code', '')
        cur.execute('SELECT id FROM admin_sessions WHERE token=%s AND revoked=true', (stage_token,))
        st = cur.fetchone()
        if not st:
            until = datetime.now(timezone.utc) + timedelta(hours=LOCK_HOURS)
            cur.execute("INSERT INTO admin_lockouts (ip, locked_until, reason) VALUES (%s, %s, 'twofa')", (ip, until))
            cur.close()
            conn.close()
            return resp(403, {'locked': True, 'until': until.isoformat(), 'message': 'Доступ запрещён', 'restart': True})

        cur.execute('SELECT twofa_hash FROM admin_settings ORDER BY id LIMIT 1')
        row = cur.fetchone()
        if row and sha(code) == row[0]:
            token = secrets.token_urlsafe(32)
            cur.execute('DELETE FROM admin_sessions WHERE token=%s', (stage_token,))
            cur.execute(
                'INSERT INTO admin_sessions (token, ip, user_agent, revoked) VALUES (%s, %s, %s, false)',
                (token, ip, (event.get('headers') or {}).get('User-Agent', '')),
            )
            cur.close()
            conn.close()
            return resp(200, {'success': True, 'token': token})
        else:
            cur.execute('DELETE FROM admin_sessions WHERE token=%s', (stage_token,))
            until = datetime.now(timezone.utc) + timedelta(hours=LOCK_HOURS)
            cur.execute("INSERT INTO admin_lockouts (ip, locked_until, reason) VALUES (%s, %s, 'twofa')", (ip, until))
            cur.close()
            conn.close()
            return resp(403, {'locked': True, 'until': until.isoformat(), 'message': 'Доступ запрещён', 'restart': True})

    cur.close()
    conn.close()
    return resp(400, {'error': 'unknown action'})


def resp(status, data):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }