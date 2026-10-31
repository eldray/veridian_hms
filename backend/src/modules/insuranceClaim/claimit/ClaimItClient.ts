// backend/src/modules/insuranceClaim/claimit/ClaimItClient.ts
//
// The outbound HTTP for CLAIM-it, the NHIS claims server each facility runs.
//
// Three things about this API are unlike the NHIS eligibility client in ../settings and are easy to
// get wrong, so they are called out where they are implemented:
//   - POST /token takes `username` and `password` as QUERY parameters, not a body, and returns no
//     expiry, so the cache lifetime is assumed rather than advertised.
//   - every other call sends the token as a bare `Authorization: <token>` header, not `Bearer <token>`.
//   - a rejected token comes back as HTTP 406 with `{ failed: true }`, not 401.
//
// Credentials are read from the process environment only. They are deliberately NOT stored on the
// hospital or provider rows: the URL of a token request carries them in cleartext, so anything that
// logs a request line logs the password, and a DB column would sit in every backup and pg_dump.
//
// Nothing is sent anywhere until the master switch is on. Without credentials the client reports
// 'skipped' and the claim keeps its existing manual XML route, so the app stays usable end to end.

import axios from 'axios';
import { config } from '../../../config';
import type { ClaimItClaim } from './ClaimItClaimBuilder';

export interface ClaimItValidationIssue {
  code?: string;
  info?: string;
  help?: string;
}

export interface ClaimItReportClaim {
  index?: number;
  claimID?: string;
  cost?: string;
  initCost?: string;
  outcome?: string;
  errors?: ClaimItValidationIssue[];
  warnings?: ClaimItValidationIssue[];
}

/** `Claims-Import-Report` from the CLAIM-it Integration API OpenAPI document. */
export interface ClaimItReport {
  reportDate?: string;
  passedClaims?: number;
  failedClaims?: number;
  warnedClaims?: number;
  savedClaims?: number;
  totalCost?: number;
  timeTaken?: string;
  success?: number | boolean;
  claims?: Array<{ claim?: ClaimItReportClaim }>;
  /** Populated only when CLAIM-it answered in a shape that is not the documented report. */
  rawResponse?: string;
}

export interface ClaimItReadiness {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  format: 'xml' | 'json';
  message: string;
}

interface ResolvedConfig {
  origin: string;
  baseUrl: string;
  username: string;
  password: string;
  format: 'xml' | 'json';
  timeoutMs: number;
  tokenTtlMs: number;
}

const MOUNTS = ['/json-api', '/xml-api'] as const;

/**
 * Remove the credentials that sit in a token request's query string.
 *
 * Axios puts the request URL into some of its error text, and an error message is what reaches the
 * screen of whoever pressed "Send to CLAIM-it".
 */
export const scrubCredentials = (text: string): string =>
  String(text ?? '')
    .replace(/(username|password)=[^&\s"']*/gi, '$1=[hidden]')
    .replace(/\/\/[^/\s:@]+:[^/\s@]+@/g, '//[hidden]@');

const resolveConfig = (): ResolvedConfig | null => {
  const configuredOrigin = (process.env.CLAIMIT_BASE_URL || '').replace(/\/+$/, '');
  const username = process.env.CLAIMIT_USERNAME || '';
  const password = process.env.CLAIMIT_PASSWORD || '';
  if (!configuredOrigin || !username || !password) return null;

  const format: 'xml' | 'json' = (process.env.CLAIMIT_FORMAT || 'json').toLowerCase() === 'xml' ? 'xml' : 'json';
  // Point CLAIMIT_BASE_URL at the host, or straight at one mount if the facility reverse-proxies it.
  const alreadyMounted = MOUNTS.some((mount) => configuredOrigin.toLowerCase().endsWith(mount));
  const origin = alreadyMounted
    ? configuredOrigin.replace(/\/(json|xml)-api$/i, '')
    : configuredOrigin;
  const baseUrl = alreadyMounted ? configuredOrigin : `${origin}${format === 'xml' ? '/xml-api' : '/json-api'}`;

  return {
    origin,
    baseUrl,
    username,
    password,
    format,
    timeoutMs: Math.max(1000, parseInt(process.env.CLAIMIT_TIMEOUT_MS || '30000', 10) || 30000),
    // The API returns no expiry, so the token is treated as short-lived and re-fetched on a 401.
    tokenTtlMs: Math.max(60_000, parseInt(process.env.CLAIMIT_TOKEN_TTL_MS || '900000', 10) || 900000),
  };
};

const httpError = (message: string, statusCode: number, extra?: Record<string, unknown>): Error & { statusCode: number } =>
  Object.assign(new Error(scrubCredentials(message)), { statusCode, ...(extra || {}) });

export class ClaimItClient {
  private tokenCache: { token: string; expiresAt: number } | null = null;

  static isConfigured(): boolean {
    return resolveConfig() !== null;
  }

  /** For a status screen: what is set up, and what is missing, without ever naming the secret. */
  getReadiness(): ClaimItReadiness {
    const cfg = resolveConfig();
    const enabled = config.claimit.ENABLED;
    if (cfg) {
      return {
        enabled,
        configured: true,
        baseUrl: cfg.baseUrl,
        format: cfg.format,
        message: enabled
          ? `CLAIM-it is reachable at ${cfg.baseUrl}.`
          : 'CLAIM-it credentials are configured but sending is switched off (CLAIMIT_ENABLED is not true); claims can still be downloaded as XML.',
      };
    }
    const missing = [
      !process.env.CLAIMIT_BASE_URL && 'CLAIMIT_BASE_URL',
      !process.env.CLAIMIT_USERNAME && 'CLAIMIT_USERNAME',
      !process.env.CLAIMIT_PASSWORD && 'CLAIMIT_PASSWORD',
    ].filter(Boolean);
    return {
      enabled,
      configured: false,
      baseUrl: '',
      format: (process.env.CLAIMIT_FORMAT || 'json') === 'xml' ? 'xml' : 'json',
      message: `CLAIM-it is not configured yet. Add ${missing.join(', ')} to the backend environment.`,
    };
  }

  /**
   * The API token, fetched once and reused until it is assumed stale.
   *
   * `success` is documented as a boolean but the report schema types its indicator as an integer, so
   * both are treated as truthy and an unrecognised answer counts as a failure rather than a pass.
   */
  private async accessToken(cfg: ResolvedConfig): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) return this.tokenCache.token;

    let response;
    try {
      response = await axios.post(`${cfg.baseUrl}/token`, null, {
        params: { username: cfg.username, password: cfg.password },
        timeout: cfg.timeoutMs,
        // CLAIM-it answers a bad token with 406, which axios would otherwise throw on.
        validateStatus: () => true,
      });
    } catch (err: any) {
      throw httpError(`Could not reach CLAIM-it at ${cfg.baseUrl}: ${err?.message || 'no response from the server'}`, 502);
    }

    const data = response.data as any;
    if (response.status !== 200 || data?.success === false || data?.failed === true || !data?.token) {
      const detail = typeof data === 'string' ? data.slice(0, 200) : data?.user_msg || '';
      throw httpError(
        `CLAIM-it refused the API credentials (HTTP ${response.status}). Check CLAIMIT_USERNAME and CLAIMIT_PASSWORD, and that ${cfg.baseUrl} is the right CLAIM-it server.${detail ? ` CLAIM-it said: ${detail}` : ''}`,
        502,
      );
    }

    this.tokenCache = { token: String(data.token), expiresAt: Date.now() + cfg.tokenTtlMs };
    return String(data.token);
  }

  private forgetToken() {
    this.tokenCache = null;
  }

  /**
   * Send one request with the token, re-authenticating once.
   *
   * Only 401 and 406 restart the auth: they mean the request was never authorised. Any other status,
   * including a 500 half-way through an import, is returned as-is - re-POSTing a claim that CLAIM-it
   * may already have saved would duplicate it in the claims database.
   */
  private async authorizedRequest(cfg: ResolvedConfig, run: (token: string) => Promise<any>): Promise<any> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = await this.accessToken(cfg);
      const response = await run(token).catch((err: any) => {
        if (err?.response) return err.response;
        // `claimitRequestSent` marks the calls that reached the wire. The caller cannot tell a
        // timeout from a half-imported batch, so it must treat the claims as an unknown outcome
        // instead of assuming nothing happened.
        throw Object.assign(
          httpError(`Could not reach CLAIM-it at ${cfg.baseUrl}: ${scrubCredentials(err?.message || 'no response from the server')}`, 502),
          { claimitRequestSent: true },
        );
      });
      if ((response.status === 401 || response.status === 406) && attempt === 0) {
        this.forgetToken();
        continue;
      }
      return response;
    }
    throw httpError('CLAIM-it rejected the API credentials after a fresh token was fetched.', 502);
  }

  /**
   * Push claims to /claims and hand back the import report.
   *
   * A report with failed claims is a normal return, not an exception: CLAIM-it validated them and
   * said why, and the caller decides how to present a batch that was part-imported.
   */
  async submitClaims(claims: ClaimItClaim[], xml: string): Promise<ClaimItReport> {
    const cfg = resolveConfig();
    if (!cfg) throw httpError(this.getReadiness().message, 503);
    // Master switch, so a facility that has credentials loaded but is not ready to submit live
    // cannot send a claim by pressing the wrong button. testConnection is allowed regardless:
    // checking the handshake is how the operator earns the right to turn this on.
    if (!config.claimit.ENABLED) {
      throw httpError('CLAIM-it sending is switched off. Set CLAIMIT_ENABLED=true once you are ready to submit claims to NHIS; the XML download still works.', 503);
    }

    const useXml = cfg.format === 'xml';
    const response = await this.authorizedRequest(cfg, (token) =>
      axios.post(`${cfg.baseUrl}/claims`, useXml ? xml : { claims }, {
        headers: {
          // The OpenAPI security scheme is an apiKey in a header literally named Authorization,
          // holding the token itself. Prefixing it with "Bearer " would be read as part of the key.
          Authorization: token,
          'Content-Type': useXml ? 'application/xml' : 'application/json',
          Accept: 'application/json',
        },
        timeout: cfg.timeoutMs,
        validateStatus: () => true,
      }),
    );

    const data = response.data;
    if (response.status >= 400) {
      const detail = typeof data === 'string' ? data.slice(0, 300) : (data?.user_msg || data?.message || JSON.stringify(data ?? '').slice(0, 300));
      throw httpError(`CLAIM-it would not import this batch (HTTP ${response.status}). ${detail}`, 502, { claimitRequestSent: true });
    }

    if (!data || typeof data !== 'object') {
      const text = String(data ?? '');
      if (/<claims|<report|<?xml/i.test(text)) {
        // The XML mount answering in XML: kept so an operator can see what came back.
        return { rawResponse: text.slice(0, 4000) };
      }
      throw httpError(`CLAIM-it returned an unreadable import response: ${text.slice(0, 200) || '(empty body)'}`, 502, { claimitRequestSent: true });
    }
    return data as ClaimItReport;
  }

  /** Withdraw one claim from the CLAIM-it database, referenced by the number this app gave it. */
  async deleteClaim(claimID: string): Promise<{ success: boolean; message?: string }> {
    const cfg = resolveConfig();
    if (!cfg) throw httpError(this.getReadiness().message, 503);
    const response = await this.authorizedRequest(cfg, (token) =>
      axios.post(`${cfg.baseUrl}/claims/${encodeURIComponent(claimID)}/delete`, null, {
        headers: { Authorization: token, Accept: 'application/json' },
        timeout: cfg.timeoutMs,
        validateStatus: () => true,
      }),
    );
    const data: any = response.data || {};
    if (response.status >= 400 || data.failed === true) {
      throw httpError(`CLAIM-it would not delete claim ${claimID}: ${data.user_msg || `HTTP ${response.status}`}`, 502);
    }
    return { success: true, message: data.user_msg };
  }

  /** Withdraw a whole period from the CLAIM-it database. Destructive on the payer side. */
  async deleteBatch(year: number | string, month: number | string): Promise<{ success: boolean; message?: string }> {
    const cfg = resolveConfig();
    if (!cfg) throw httpError(this.getReadiness().message, 503);
    const mm = String(month).padStart(2, '0');
    const response = await this.authorizedRequest(cfg, (token) =>
      axios.post(`${cfg.baseUrl}/batch/${encodeURIComponent(String(year))}/${mm}/delete`, null, {
        headers: { Authorization: token, Accept: 'application/json' },
        timeout: cfg.timeoutMs,
        validateStatus: () => true,
      }),
    );
    const data: any = response.data || {};
    if (response.status >= 400 || data.failed === true) {
      throw httpError(`CLAIM-it would not delete the ${year}-${mm} batch: ${data.user_msg || `HTTP ${response.status}`}`, 502);
    }
    return { success: true, message: data.user_msg };
  }

  /**
   * Prove the credentials and the host, without touching claims.
   *
   * Fetching a token is the whole handshake this API has; nothing is written to the claims database.
   */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const cfg = resolveConfig();
    if (!cfg) return { ok: false, message: this.getReadiness().message };
    try {
      await this.accessToken(cfg);
      return { ok: true, message: `Signed in to CLAIM-it at ${cfg.baseUrl}.` };
    } catch (err: any) {
      this.forgetToken();
      return { ok: false, message: err?.message || 'CLAIM-it could not be reached.' };
    }
  }
}
