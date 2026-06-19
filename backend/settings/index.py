import json
import os
import hashlib
from datetime import datetime, timezone, timedelta
import psycopg2
import psycopg2.extras

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


def resp(status, data):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps(data, ensure_ascii=False, default=str),
    }


def load_public(cur):
    cur.execute('SELECT server_status, server_ip, next_wipe FROM admin_settings ORDER BY id LIMIT 1')
    s = cur.fetchone()
    cur.execute('SELECT id, title, icon, color, bg, price, description, unavailable, sort_order FROM admin_products ORDER BY sort_order, id')
    products = [dict(r) for r in cur.fetchall()]
    cur.execute('SELECT id, label, url, sort_order FROM admin_links ORDER BY sort_order, id')
    links = [dict(r) for r in cur.fetchall()]
    return {
        'serverStatus': s['server_status'] if s else 'online',
        'serverIp': s['server_ip'] if s else '',
        'nextWipe': s['next_wipe'].isoformat() if s and s['next_wipe'] else None,
        'products': products,
        'links': links,
    }


def check_auth(cur, token):
    if not token:
        return False
    cur.execute('SELECT id FROM admin_sessions WHERE token=%s AND revoked=false', (token,))
    if cur.fetchone():
        cur.execute('UPDATE admin_sessions SET last_seen=now() WHERE token=%s', (token,))
        return True
    return False


def handler(event, context):
    '''Управление настройками админки и публичный API синхронизации для основного сайта'''
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    conn = get_conn()
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    params = event.get('queryStringParameters') or {}

    # Публичный эндпоинт синхронизации — без авторизации
    if method == 'GET':
        data = load_public(cur)
        cur.close()
        conn.close()
        return resp(200, data)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', '')
    headers = event.get('headers') or {}
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token') or body.get('token', '')

    if not check_auth(cur, token):
        cur.close()
        conn.close()
        return resp(401, {'error': 'unauthorized'})

    if action == 'state':
        data = load_public(cur)
        cur.execute('SELECT count(*) AS c FROM admin_sessions WHERE revoked=false')
        data['activeSessions'] = cur.fetchone()['c']
        cur.close(); conn.close()
        return resp(200, data)

    if action == 'set_status':
        st = body.get('status', 'online')
        if st not in ('online', 'restart', 'offline'):
            st = 'online'
        cur.execute('UPDATE admin_settings SET server_status=%s, updated_at=now()', (st,))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'set_ip':
        cur.execute('UPDATE admin_settings SET server_ip=%s, updated_at=now()', (body.get('ip', ''),))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'set_wipe':
        cur.execute('UPDATE admin_settings SET next_wipe=%s, updated_at=now()', (body.get('wipe'),))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'save_product':
        p = body.get('product', {})
        if p.get('id'):
            cur.execute(
                'UPDATE admin_products SET title=%s, icon=%s, color=%s, bg=%s, price=%s, description=%s, unavailable=%s WHERE id=%s',
                (p.get('title', ''), p.get('icon', ''), p.get('color', '#22c55e'), p.get('bg', '#0f172a'),
                 p.get('price', ''), p.get('description', ''), bool(p.get('unavailable')), p['id']),
            )
        else:
            cur.execute('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM admin_products')
            order = cur.fetchone()['n']
            cur.execute(
                'INSERT INTO admin_products (title, icon, color, bg, price, description, unavailable, sort_order) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',
                (p.get('title', 'Новый'), p.get('icon', ''), p.get('color', '#22c55e'), p.get('bg', '#0f172a'),
                 p.get('price', ''), p.get('description', ''), bool(p.get('unavailable')), order),
            )
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'delete_product':
        cur.execute('DELETE FROM admin_products WHERE id=%s', (body.get('id'),))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'save_link':
        l = body.get('link', {})
        if l.get('id'):
            cur.execute('UPDATE admin_links SET label=%s, url=%s WHERE id=%s', (l.get('label', ''), l.get('url', ''), l['id']))
        else:
            cur.execute('SELECT COALESCE(MAX(sort_order),-1)+1 AS n FROM admin_links')
            order = cur.fetchone()['n']
            cur.execute('INSERT INTO admin_links (label, url, sort_order) VALUES (%s,%s,%s)', (l.get('label', 'Ссылка'), l.get('url', ''), order))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'delete_link':
        cur.execute('DELETE FROM admin_links WHERE id=%s', (body.get('id'),))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'change_credentials':
        new_login = body.get('login')
        new_password = body.get('password')
        new_twofa = body.get('twofa')
        sets, vals = [], []
        if new_login:
            sets.append('login_hash=%s'); vals.append(sha(new_login))
        if new_password:
            sets.append('password_hash=%s'); vals.append(sha(new_password))
        if new_twofa:
            sets.append('twofa_hash=%s'); vals.append(sha(new_twofa))
        if sets:
            cur.execute('UPDATE admin_settings SET ' + ', '.join(sets) + ', updated_at=now()', vals)
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'revoke_others':
        until = datetime.now(timezone.utc) + timedelta(days=SESSION_BAN_DAYS)
        cur.execute('SELECT ip FROM admin_sessions WHERE revoked=false AND token<>%s', (token,))
        for r in cur.fetchall():
            if r['ip']:
                cur.execute('INSERT INTO admin_session_bans (ip, banned_until) VALUES (%s, %s)', (r['ip'], until))
        cur.execute('UPDATE admin_sessions SET revoked=true WHERE token<>%s', (token,))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    if action == 'logout':
        cur.execute('UPDATE admin_sessions SET revoked=true WHERE token=%s', (token,))
        cur.close(); conn.close()
        return resp(200, {'ok': True})

    cur.close(); conn.close()
    return resp(400, {'error': 'unknown action'})
