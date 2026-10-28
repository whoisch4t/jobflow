import request from 'supertest';
import { createApp } from '../src/app';

export const app = createApp();

let counter = 0;

/** Registers a fresh user and returns a supertest agent that keeps its auth cookies. */
export async function signedInAgent(name = 'Test User') {
  counter += 1;
  const agent = request.agent(app);
  const email = `user${counter}-${Date.now()}@example.com`;
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'password123' });
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.user as { id: string; email: string }, email, password: 'password123' };
}

/** Reads a cookie value from a Set-Cookie header list. */
export function cookieValue(setCookie: string[] | string | undefined, name: string) {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const match = list.find((c) => c.startsWith(`${name}=`));
  return match?.split(';')[0]?.slice(name.length + 1);
}
