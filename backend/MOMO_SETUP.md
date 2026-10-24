# MTN MoMo Collections integration

Veridian HMS now has an MTN MoMo Collections adapter for Ghana cash-and-carry bills. It initiates a RequestToPay prompt and records the bill payment **only after the provider status endpoint reports SUCCESSFUL**. An HTTP 202 from MTN means the request was accepted, not that the patient has paid.

## Backend environment

Configure these variables in the backend deployment environment. Never put API credentials in frontend environment variables or commit real keys.

```dotenv
MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MOMO_COLLECTION_SUBSCRIPTION_KEY=
MOMO_API_USER=
MOMO_API_KEY=
MOMO_TARGET_ENVIRONMENT=sandbox
MOMO_CURRENCY=GHS
# Optional; the callback host must be registered with MTN before enabling it.
# MOMO_CALLBACK_URL=https://your-public-domain.example/api/momo/callback
```

For MTN's newer credential format, use `MOMO_USER_ID` and `MOMO_CREDENTIAL_TOKEN` instead of `MOMO_API_USER` and `MOMO_API_KEY`. Set `MOMO_BASE_URL` and `MOMO_TARGET_ENVIRONMENT` to the values issued for the facility's actual MTN onboarding. Do not assume production credentials/base URLs are interchangeable with sandbox credentials.

## Endpoints

All endpoints below require the HMS JWT:

- `GET /api/momo/config` — reports whether the backend has credentials configured; never returns secrets.
- `POST /api/momo/payments` — body: `{ billId, amount, payerPhone, idempotencyKey }`; submits a RequestToPay and returns a local intent ID.
- `GET /api/momo/payments/:id` — checks provider status; when status is `SUCCESSFUL`, posts the payment through the existing idempotent billing workflow.

The frontend polls status for up to two minutes. If it is still pending, staff must verify the transaction before taking another payment. The backend also blocks manual non-MoMo payments while an intent is pending. A failed intent can be retried with a new idempotency key.

## Before going live

1. Complete MTN MoMo Collections onboarding and obtain the Collection subscription key and credentials for the correct environment.
2. Confirm the target environment name and base URL with MTN for Ghana; do not rely on a generic sandbox value in production.
3. Apply Prisma migrations and redeploy the backend.
4. Test successful approval, customer decline, timeout, network interruption, duplicate submit, and status-check retry in sandbox.
5. Register and verify a callback host with MTN if callbacks are configured. Status polling remains the source used by the current implementation.
6. Run a small controlled live payment and reconcile the MTN transaction ID against the HMS payment record before enabling it for routine collections.
