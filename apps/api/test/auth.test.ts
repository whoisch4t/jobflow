import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, cookieValue, signedInAgent } from './helpers';
import { REFRESH_COOKIE } from '../src/lib/tokens';

describe('auth', () => {
  it('registers, returns the user and sets httpOnly cookies', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ADA@Example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Ada', email: 'ada@example.com' });
    expect(res.body.user.passwordHash).toBeUndefined();
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('jf_access=') && c.includes('HttpOnly'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('jf_refresh=') && c.includes('SameSite=Lax'))).toBe(true);
  });

  it('rejects weak passwords and invalid emails with field errors', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '', email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('does not allow two accounts with the same email', async () => {
    const { email } = await signedInAgent();
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with the right password only', async () => {
    const { email, password } = await signedInAgent();
    const bad = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password1' });
    expect(bad.status).toBe(401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(bad.body.error.message);

    const ok = await request(app).post('/api/auth/login').send({ email, password });
    expect(ok.status).toBe(200);
    expect(ok.body.user.email).toBe(email);
  });

  it('protects routes and returns the current user', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/applications')).status).toBe(401);

    const { agent, user } = await signedInAgent('Grace');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ id: user.id, name: 'Grace' });
  });

  it('accepts a Bearer token as well as the cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bearer', email: 'bearer@example.com', password: 'password123' });
    const token = cookieValue(res.headers['set-cookie'], 'jf_access');
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
  });

  it('rotates refresh tokens and revokes the family when an old one is reused', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rotate', email: 'rotate@example.com', password: 'password123' });
    const first = cookieValue(register.headers['set-cookie'], REFRESH_COOKIE)!;

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', `${REFRESH_COOKIE}=${first}`);
    expect(refreshed.status).toBe(200);
    const second = cookieValue(refreshed.headers['set-cookie'], REFRESH_COOKIE)!;
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    // Reusing the first token looks like theft: it fails, and the newer token stops working too.
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', `${REFRESH_COOKIE}=${first}`);
    expect(reuse.status).toBe(401);
    const afterReuse = await request(app).post('/api/auth/refresh').set('Cookie', `${REFRESH_COOKIE}=${second}`);
    expect(afterReuse.status).toBe(401);
  });

  it('logout revokes the refresh token and clears cookies', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bye', email: 'bye@example.com', password: 'password123' });
    const refresh = cookieValue(register.headers['set-cookie'], REFRESH_COOKIE)!;

    const out = await request(app).post('/api/auth/logout').set('Cookie', `${REFRESH_COOKIE}=${refresh}`);
    expect(out.status).toBe(204);
    expect(cookieValue(out.headers['set-cookie'], REFRESH_COOKIE)).toBe('');

    const again = await request(app).post('/api/auth/refresh').set('Cookie', `${REFRESH_COOKIE}=${refresh}`);
    expect(again.status).toBe(401);
  });

  it('rejects non-JSON write requests (CSRF protection)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('email=a@b.c&password=x');
    expect(res.status).toBe(415);
  });
});
