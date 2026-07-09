# AWS Auth Deployment

Deploy **start.novasafe.io** to **AWS S3 + CloudFront** in parallel with the existing Docker/Nginx production deployment.

## Workflow

`.github/workflows/deploy-aws.yml` → `novasafe-deployment/deploy-frontend-aws.yml`

## Configuration

### Repository Variables

| Variable | Example |
|----------|---------|
| `AWS_ROLE_ARN` | `arn:aws:iam::793239449172:role/NovaSafeGitHubDeployRole` |
| `AWS_REGION` | `ap-south-1` |

### Environment Variables

Settings → Environments → **production** → **Environment variables**

| Variable | Example |
|----------|---------|
| `VITE_AUTH_URL` | `https://start.novasafe.io` |
| `VITE_LANDING_URL` | `https://novasafe.io` |
| `VITE_APP_URL` | `https://app.novasafe.io` |
| `VITE_API_URL` | `https://mobile-api.novasafe.io` |
| `VITE_GOOGLE_WEB_CLIENT_ID` | *(optional — Google sign-in)* |
| `VITE_REVENUECAT_PUBLIC_API_KEY_WEB` | *(optional — billing)* |
| `VITE_REVENUECAT_ENTITLEMENT_PRO` | `pro` |
| `VITE_REVENUECAT_PACKAGE_MONTHLY` | `$rc_monthly` |
| `VITE_REVENUECAT_PACKAGE_YEARLY` | `$rc_annual` |
| `VITE_APP_VERSION` | `1.1.0` |

### Stack outputs (update `deploy-aws.yml` after CDK deploy)

| Field | Source |
|-------|--------|
| `s3-bucket` | `AuthBucketName` from `novasafe-prod-auth` |
| `cloudfront-distribution-id` | `AuthDistributionId` |

## Deploy sequence

1. **novasafe-deployment** → Deploy Infrastructure → **Auth**
2. Add ACM DNS validation CNAMEs in Cloudflare for `start.novasafe.io`
3. Point `start.novasafe.io` CNAME → CloudFront domain (DNS only)
4. Update `cloudfront-distribution-id` in `deploy-aws.yml`
5. Run **Deploy AWS** in this repo

## Note

Auth uses TanStack Start (SSR in Docker). The AWS path uploads the **client bundle** and `runtime-config.js`. Full SSR parity with Docker may require future Lambda hosting.
