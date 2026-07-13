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

Set under **Settings → Environments → production** (same as VPS build):

- `VITE_AUTH_URL`, `VITE_LANDING_URL`, `VITE_APP_URL`, `VITE_API_URL`
- Optional: Google, RevenueCat keys

Runtime secrets (session signing, etc.) should be added to the Lambda function environment in CDK or via AWS console — mirror VPS `platform/auth/.env` as needed.

## Migrating from static S3 or ECR container

1. Redeploy **Auth** CDK stack (zip Lambda, no ECR repo)
2. Delete orphan `novasafe-prod-ecr-auth` ECR repo if a previous deploy created it
3. Run **Deploy AWS** here (upload zip)
4. Keep Cloudflare CNAME → CloudFront domain (unchanged)

## Related

- `Dockerfile` — VPS/Docker SSR (same app)
- `bin/lambda.mjs` — Function URL adapter for AWS Lambda
- `scripts/package-lambda.mjs` — zip packaging for CI
