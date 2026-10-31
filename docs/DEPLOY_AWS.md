# AWS Auth Deployment

Deploy **start.novasafe.io** as **TanStack Start SSR on AWS Lambda** (zip, no ECR) behind CloudFront.

> **Important:** Auth is **not** a static SPA. Login/signup use TanStack **server functions** and require a Node SSR runtime. Uploading only `dist/client` to S3 causes a blank page (`Invariant failed` in the browser console).

## Architecture

```
Browser → CloudFront → Lambda Function URL (zip SSR) → mobile-api
```

No ECR — same cost model as mobile-api (Lambda free tier + zip deploy).

## Prerequisites

1. **Auth** CDK stack deployed (`novasafe-prod-auth`) with zip Lambda + CloudFront
2. Repository variables: `AWS_ROLE_ARN`, `AWS_REGION` (`ap-south-1`)
3. ACM DNS validation + Cloudflare CNAME for `start.novasafe.io`
4. IAM role: `lambda:UpdateFunctionCode`, `cloudfront:CreateInvalidation`

## Deploy

**Actions → Deploy AWS** (this repo, branch `main`)

Builds Vite SSR output, packages `dist/lambda.zip` (`scripts/package-lambda.mjs`), updates `novasafe-prod-fn-auth`, invalidates CloudFront.

## Stack outputs (after CDK deploy)

| Output | Use |
|--------|-----|
| `AuthLambdaFunctionName` | Lambda name for CI |
| `AuthDistributionId` | CloudFront invalidation |
| `AuthDistributionDomainName` | Cloudflare CNAME target |

## Environment variables (production)

Same model as **mobile-api / admin-api**: upload a `.env` to the private config bucket; CI downloads it, merges Lambda overrides, and bundles it inside `lambda.zip`.

| S3 key | Lambda |
|--------|--------|
| `auth/.env` | `novasafe-prod-fn-auth` |

**GitHub repository variables** (not in S3):

| Variable | Purpose |
|----------|---------|
| `AWS_ROLE_ARN` | OIDC deploy role |
| `AWS_REGION` | e.g. `ap-south-1` |
| `BACKEND_CONFIG_BUCKET` | e.g. `novasafe-api-prod-backend-config` or `…-793239449172` |

Upload:

```bash
aws s3 cp auth.env s3://$BACKEND_CONFIG_BUCKET/auth/.env --sse AES256
```

Template keys: see `.env.example` in this repo (including `VITE_GOOGLE_WEB_CLIENT_ID`, RevenueCat, cookie settings).

Runtime: `bin/load-bundled-env.mjs` loads the bundled `.env` on each Lambda cold start; SSR injects `window.__NS_PUBLIC_ENV__` for the browser.

Legacy VPS: `platform/auth/.env` on the deployment host still works for Docker SSR.

## Migrating from static S3 or ECR container

1. Redeploy **Auth** CDK stack (zip Lambda, no ECR repo)
2. Delete orphan `novasafe-prod-ecr-auth` ECR repo if a previous deploy created it
3. Run **Deploy AWS** here (upload zip)
4. Keep Cloudflare CNAME → CloudFront domain (unchanged)

## Related

- `Dockerfile` — VPS/Docker SSR (same app)
- `bin/lambda.mjs` — Function URL adapter for AWS Lambda
- `scripts/package-lambda.mjs` — zip packaging for CI
