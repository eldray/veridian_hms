import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('axios', () => ({ default: { post } }));

/**
 * The three details of this API that a client written against a normal OAuth service gets wrong:
 * the credentials go in the query string, the token is sent bare in `Authorization`, and a bad
 * token is HTTP 406 rather than 401. Each is asserted where the spec says it.
 */
const CLAIMS = [{ claimID: 'NHIS-10001' } as any];
const XML = '<?xml version="1.0"?><claims><claim><claimID>NHIS-10001</claimID></claim></claims>';

const tokenOk = (token: string) => ({ status: 200, data: { token, success: true } });
const reportOk = { status: 200, data: { passedClaims: 1, failedClaims: 0, savedClaims: 1, claims: [{ claim: { claimID: 'NHIS-10001', outcome: 'PASSED' } }] } };

const clearEnv = () => {
  for (const key of Object.keys(process.env)) if (key.startsWith('CLAIMIT_')) delete process.env[key];
};

const setEnv = (overrides: Record<string, string> = {}) => {
  clearEnv();
  process.env.CLAIMIT_BASE_URL = 'http://localhost:31719';
  process.env.CLAIMIT_USERNAME = 'hms-user';
  process.env.CLAIMIT_PASSWORD = 'hms-secret';
  process.env.CLAIMIT_ENABLED = 'true';
  Object.assign(process.env, overrides);
};

/** config is read at import time, so a fresh module graph is the only way to vary the switch. */
const freshClient = async (env: Record<string, string> = {}) => {
  setEnv(env);
  vi.resetModules();
  const mod = await import('../src/modules/insuranceClaim/claimit/ClaimItClient');
  return { client: new mod.ClaimItClient(), scrubCredentials: mod.scrubCredentials };
};

beforeEach(() => {
  post.mockReset();
});

afterEach(() => {
  clearEnv();
});

describe('CLAIM-it client configuration', () => {
  it('reports exactly which environment variables are missing, without quoting the secret', async () => {
    clearEnv();
    vi.resetModules();
    const { ClaimItClient } = await import('../src/modules/insuranceClaim/claimit/ClaimItClient');
    const readiness = new ClaimItClient().getReadiness();

    expect(readiness.configured).toBe(false);
    expect(readiness.message).toContain('CLAIMIT_BASE_URL');
    expect(readiness.message).toContain('CLAIMIT_USERNAME');
    expect(readiness.message).toContain('CLAIMIT_PASSWORD');
    expect(readiness.message).not.toContain('hms-secret');
  });

  it('sends nothing while the master switch is off, and says so', async () => {
    const { client } = await freshClient({ CLAIMIT_ENABLED: 'false' });
    post.mockResolvedValue(tokenOk('tok'));

    await expect(client.submitClaims(CLAIMS, XML)).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('switched off'),
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('picks the API mount that matches the configured format', async () => {
    const xml = await freshClient({ CLAIMIT_FORMAT: 'xml' });
    expect(xml.client.getReadiness().baseUrl).toBe('http://localhost:31719/xml-api');

    const json = await freshClient({ CLAIMIT_FORMAT: 'json' });
    expect(json.client.getReadiness().baseUrl).toBe('http://localhost:31719/json-api');
  });

  it('keeps a mount the operator already spelled out instead of appending a second one', async () => {
    const { client } = await freshClient({ CLAIMIT_BASE_URL: 'https://claims.hospital.gov.gh/json-api', CLAIMIT_FORMAT: 'xml' });
    expect(client.getReadiness().baseUrl).toBe('https://claims.hospital.gov.gh/json-api');
  });
});

describe('CLAIM-it authentication', () => {
  it('posts the credentials as query parameters and caches the token across calls', async () => {
    const { client } = await freshClient();
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return tokenOk('tok-1');
      return reportOk;
    });

    await client.submitClaims(CLAIMS, XML);
    await client.submitClaims(CLAIMS, XML);

    const tokenCalls = post.mock.calls.filter(([url]) => String(url).endsWith('/token'));
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0][1]).toBeNull();
    expect(tokenCalls[0][2].params).toEqual({ username: 'hms-user', password: 'hms-secret' });
  });

  it('sends the token bare in Authorization, not as a bearer scheme', async () => {
    const { client } = await freshClient();
    post.mockImplementation(async (url: string) => (url.endsWith('/token') ? tokenOk('tok-1') : reportOk));

    await client.submitClaims(CLAIMS, XML);

    const claimsCall = post.mock.calls.find(([url]) => String(url).endsWith('/claims'));
    expect(claimsCall![2].headers.Authorization).toBe('tok-1');
  });

  it('re-authenticates and resends once when a cached token has been revoked', async () => {
    const { client } = await freshClient();
    let tokens = 0;
    let sends = 0;
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) {
        tokens += 1;
        return tokenOk(`tok-${tokens}`);
      }
      sends += 1;
      // The first send is made with the stale cached token; the retry must carry the fresh one.
      if (sends === 1) return { status: 401, data: { user_msg: 'token expired' } };
      return reportOk;
    });
    client['tokenCache'] = { token: 'tok-stale', expiresAt: Date.now() + 600_000 };

    const report = await client.submitClaims(CLAIMS, XML);

    expect(report.passedClaims).toBe(1);
    expect(tokens).toBe(1);
    const sent = post.mock.calls.filter(([url]) => String(url).endsWith('/claims'));
    expect(sent).toHaveLength(2);
    expect(sent[0][2].headers.Authorization).toBe('tok-stale');
    expect(sent[1][2].headers.Authorization).toBe('tok-1');
  });

  it('does not resend a claim after a server error, because the import may have half-completed', async () => {
    const { client } = await freshClient();
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return tokenOk('tok-1');
      return { status: 500, data: { user_msg: 'import crashed' } };
    });

    await expect(client.submitClaims(CLAIMS, XML)).rejects.toMatchObject({ statusCode: 502 });
    expect(post.mock.calls.filter(([url]) => String(url).endsWith('/claims'))).toHaveLength(1);
  });

  it('names the credentials as the problem when CLAIM-it answers the token call with 406', async () => {
    const { client } = await freshClient();
    post.mockResolvedValue({ status: 406, data: { failed: true } });

    const error: any = await client.submitClaims(CLAIMS, XML).catch((err) => err);
    expect(error.statusCode).toBe(502);
    expect(error.message).toContain('refused the API credentials');
    expect(error.message).toContain('HTTP 406');
    expect(error.message).not.toContain('hms-secret');
  });

  it('turns an unreachable CLAIM-it into a message that says where it looked', async () => {
    const { client } = await freshClient({ CLAIMIT_BASE_URL: 'http://10.0.0.9:31719' });
    post.mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED 10.0.0.9:31719'), { isAxiosError: true }));

    const error: any = await client.submitClaims(CLAIMS, XML).catch((err) => err);
    expect(error.message).toContain('Could not reach CLAIM-it at http://10.0.0.9:31719/json-api');
    expect(error.message).toContain('ECONNREFUSED');
  });
});

describe('CLAIM-it import responses', () => {
  it('returns a rejected claim as a report, not as an exception', async () => {
    const { client } = await freshClient();
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return tokenOk('tok-1');
      return {
        status: 200,
        data: { passedClaims: 0, failedClaims: 1, claims: [{ claim: { claimID: 'NHIS-10001', outcome: 'ERROR', errors: [{ code: 'E101', info: 'CCC not found' }] } }] },
      };
    });

    const report = await client.submitClaims(CLAIMS, XML);
    expect(report.failedClaims).toBe(1);
    expect(report.claims![0].claim!.errors![0].info).toBe('CCC not found');
  });

  it('keeps an XML answer readable instead of calling it a successful empty import', async () => {
    const { client } = await freshClient({ CLAIMIT_FORMAT: 'xml' });
    post.mockImplementation(async (url: string) => {
      if (url.endsWith('/token')) return tokenOk('tok-1');
      return { status: 200, data: '<report><passedClaims>1</passedClaims></report>' };
    });

    const report = await client.submitClaims(CLAIMS, XML);
    expect(report.rawResponse).toContain('<passedClaims>1</passedClaims>');
  });

  it('posts the flat XML document with an XML content type on the xml mount', async () => {
    const { client } = await freshClient({ CLAIMIT_FORMAT: 'xml' });
    post.mockImplementation(async (url: string) => (url.endsWith('/token') ? tokenOk('tok-1') : reportOk));

    await client.submitClaims(CLAIMS, XML);

    const sent = post.mock.calls.find(([url]) => String(url).endsWith('/claims'))!;
    expect(sent[0]).toBe('http://localhost:31719/xml-api/claims');
    expect(sent[1]).toBe(XML);
    expect(sent[2].headers['Content-Type']).toBe('application/xml');
  });

  it('posts the claim array as JSON on the json mount', async () => {
    const { client } = await freshClient({ CLAIMIT_FORMAT: 'json' });
    post.mockImplementation(async (url: string) => (url.endsWith('/token') ? tokenOk('tok-1') : reportOk));

    await client.submitClaims(CLAIMS, XML);

    const sent = post.mock.calls.find(([url]) => String(url).endsWith('/claims'))!;
    expect(sent[0]).toBe('http://localhost:31719/json-api/claims');
    expect(sent[1]).toEqual({ claims: CLAIMS });
    expect(sent[2].headers['Content-Type']).toBe('application/json');
  });

  it('deletes a claim by the number this app gave it, and a batch by its period', async () => {
    const { client } = await freshClient();
    post.mockImplementation(async (url: string) => (url.endsWith('/token') ? tokenOk('tok-1') : { status: 200, data: { success: true } }));

    await client.deleteClaim('NHIS-10001');
    await client.deleteBatch(2026, 3);

    const urls = post.mock.calls.map(([url]) => url);
    expect(urls).toContain('http://localhost:31719/json-api/claims/NHIS-10001/delete');
    expect(urls).toContain('http://localhost:31719/json-api/batch/2026/03/delete');
  });
});

describe('credential scrubbing', () => {
  it('removes query-string credentials from anything that can reach a screen', async () => {
    const { scrubCredentials } = await freshClient();
    const leaked = 'POST http://localhost:31719/json-api/token?username=hms-user&password=hms-secret failed';

    const scrubbed = scrubCredentials(leaked);
    expect(scrubbed).toContain('username=[hidden]');
    expect(scrubbed).toContain('password=[hidden]');
    expect(scrubbed).not.toContain('hms-secret');
  });

  it('removes basic-auth credentials embedded in a URL', async () => {
    const { scrubCredentials } = await freshClient();
    expect(scrubCredentials('https://hms-user:hms-secret@claims.internal/token')).not.toContain('hms-secret');
  });
});
