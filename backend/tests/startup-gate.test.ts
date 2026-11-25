// While the dev seed runs the server is already listening but not ready (see middleware/startupGate.ts).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import express from 'express';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { startupGate, startupState, trackSeedProgress, cleanProgressLine, isProgressLine } from '../src/middleware/startupGate';

const app = express();
app.use(startupGate);
app.get('/api/health', (_req, res) => res.json({ success: true, from: 'real health route' }));
app.get('/api/health/live', (_req, res) => res.json({ success: true, from: 'live route' }));
app.get('/api/patients', (_req, res) => res.json({ success: true, from: 'patients' }));
app.get('/index.html', (_req, res) => res.send('page'));
const server = http.createServer(app).listen(0, '127.0.0.1');
const port = () => (server.address() as AddressInfo).port;

function get(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: port(), path, agent: false }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => resolve({ status: res.statusCode || 0, body: data.startsWith('{') ? JSON.parse(data) : data }));
    }).on('error', reject);
  });
}

beforeEach(() => { startupState.seeding = false; startupState.progress = ''; });
afterAll(() => { server.close(); });

describe('startupGate', () => {
  it('is invisible when nothing is seeding', async () => {
    expect((await get('/api/health')).body.from).toBe('real health route');
    expect((await get('/api/patients')).body.from).toBe('patients');
  });

  it('answers /api/health with 503 + phase + progress while seeding', async () => {
    startupState.seeding = true; startupState.progress = '250/10508 (2.4%)';
    const r = await get('/api/health');
    expect(r.status).toBe(503);
    expect(r.body).toMatchObject({ success: false, ready: false, phase: 'seeding', progress: '250/10508 (2.4%)' });
    expect(typeof r.body.uptime).toBe('number');
  });

  it('answers other API calls with a clear 503, but leaves liveness and non-API paths alone', async () => {
    startupState.seeding = true;
    const api = await get('/api/patients');
    expect(api.status).toBe(503); expect(api.body.message).toMatch(/preparing demo data/);
    expect((await get('/api/health/live')).body.from).toBe('live route');
    expect((await get('/index.html')).body).toBe('page');
  });

  it('trackSeedProgress: flags seeding, captures STEP and counter lines, restores console.log', async () => {
    const original = console.log;
    const seen: string[] = [];
    console.log = (...a: unknown[]) => { seen.push(a.join(' ')); };
    const patched = console.log;
    try {
      await trackSeedProgress(async () => {
        expect(startupState.seeding).toBe(true);
        console.log('📚 STEP: Test Data');
        expect(startupState.progress).toBe('STEP: Test Data');
        console.log('   ... 250/10508 (2.4%) - 248 billed, 0 rejected - 11.3/s, about 15m 07s left');
        expect(startupState.progress).toBe('250/10508 (2.4%) - 248 billed, 0 rejected - 11.3/s, about 15m 07s left');
        console.log('✅ 1000 patients (888 allergies, 781 consents)');            // not progress: ignored
        expect(startupState.progress).toMatch(/^250\/10508/);
      });
      expect(startupState.seeding).toBe(false);
      expect(seen.length).toBe(3);                                                 // still logged normally
    } finally { console.log = original; }
    expect(console.log).toBe(original);
    void patched;
  });

  it('trackSeedProgress restores state when the seed throws', async () => {
    const original = console.log;
    await expect(trackSeedProgress(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(startupState.seeding).toBe(false);
    expect(console.log).toBe(original);
  });

  it('line helpers', () => {
    expect(cleanProgressLine('  🧪  STEP 4:   Test Data Seeding ')).toBe('STEP 4: Test Data Seeding');
    expect(isProgressLine('🧪 STEP 4: Test Data Seeding')).toBe(true);
    expect(isProgressLine('   ... 25/10508 (0.2%) - 25 billed')).toBe(true);
    expect(isProgressLine('✅ 1000 patients')).toBe(false);
    expect(isProgressLine('some ... 3/4 text')).toBe(false);
    expect(cleanProgressLine('   ... 25/10508 (0.2%) - 25 billed')).toBe('25/10508 (0.2%) - 25 billed');
  });
});
