# AWS Auth Deployment

Deploy **start.novasafe.io** as **TanStack Start SSR on AWS Lambda** (container) behind CloudFront.

> **Important:** Auth is **not** a static SPA. Login/signup use TanStack **server functions** and require a Node SSR runtime. Uploading only `dist/client` to S3 causes a blank page (`Invariant failed` in the browser console).

## Architecture

```
Browser → CloudFront → Lambda (Docker SSR, same as VPS) → mobile-api
```

## Prerequisites

1. **Auth** CDK stack deployed (`novasafe-prod-auth`) with SSR Lambda + ECR + CloudFront
2. Repository variables: `AWS_ROLE_ARN`, `AWS_REGION` (`ap-south-1`)
3. ACM DNS validation + Cloudflare CNAME for `start.novasafe.io`
4. IAM role: `ecr:*` push/pull, `lambda:UpdateFunctionCode`, `cloudfront:CreateInvalidation`

## Deploy

**Actions → Deploy AWS** (this repo, branch `main`)

Builds `Dockerfile.lambda` (Lambda Web Adapter + `bin/server.mjs`), pushes to ECR, updates `novasafe-prod-fn-auth`, invalidates CloudFront.

## Stack outputs (after CDK deploy)

| Output | Use |
|--------|-----|
| `AuthEcrRepositoryName` | ECR repo (`novasafe-prod-ecr-auth`) |
| `AuthLambdaFunctionName` | Lambda name for CI |
| `AuthDistributionId` | CloudFront invalidation |
| `AuthDistributionDomainName` | Cloudflare CNAME target |

## Environment variables (production)

Set under **Settings → Environments → production** for Docker build args / runtime (same as before):

- `VITE_AUTH_URL`, `VITE_LANDING_URL`, `VITE_APP_URL`, `VITE_API_URL`
- Optional: Google, RevenueCat keys

Runtime secrets (session signing, etc.) should be added to the Lambda function environment in CDK or via AWS console — mirror VPS `platform/auth/.env` as needed.

## Migrating from static S3

If you previously deployed static files to `novasafe-prod-bucket-auth-*`:

1. Redeploy **Auth** CDK stack (switches CloudFront origin to Lambda)
2. Run **Deploy AWS** here (push container image)
3. Keep Cloudflare CNAME → CloudFront domain (unchanged)

## Related

- `Dockerfile` — VPS/Docker SSR (same app)
- `Dockerfile.lambda` — AWS Lambda container variant
