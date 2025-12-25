# Create T3 App x BetterAuth x shadcn/ui

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app` and enhanced with [better-auth](https://better-auth.com/).

This template might change in the future and become less and less barebone.

## What's next? How do I make an app with this?

This was originally a create-t3 template using NextAuth and Prisma.
To use this simply go to the top of the GitHub page and click on "Use this template" and name your own repo.

## Following changes were made:
- Switch from NextAuth to BetterAuth
- Beautiful Ready-to-Use email+password + GoogleOAuth auth pages (Login, Signup, Reset Password forms, Verification)
- Switch from Prisma to Drizzle
- Upgrade to Tailwind V4
- Add all shadcn-ui components
- Clear out template to use shadcn components from the start

## Stack:
- [Next.js](https://nextjs.org)
- [BetterAuth](https://better-auth.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Original Template

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available)

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app)

## How do I deploy this?

Follow the t3-stack deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.


## Local Development

### Configuration

Copy `.env.example` to `.env` and fill in the following values:

```bash
# Database
DATABASE_URL="postgresql://languagebuddy:languagebuddy@localhost:5432/languagebuddy"

# BetterAuth
BETTER_AUTH_SECRET="your_secret_here"
BETTER_AUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your_google_id"
GOOGLE_CLIENT_SECRET="your_google_secret"

# Storage (Local MinIO)
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_ENDPOINT="http://localhost:9000"
S3_BUCKET_NAME="languagebuddy" # Create this bucket in MinIO Console (localhost:9001)
S3_REGION="us-east-1"

# AI Services
OPENROUTER_API_KEY="your_openrouter_key"
ELEVENLABS_API_KEY="your_elevenlabs_key"
FAL_KEY="your_fal_key"
```

### Setup Services

#### 1. Generate SSL certificates for Postgres
```bash
   openssl req -new -x509 -days 365 -nodes \
     -out server.crt -keyout server.key \
     -subj "/CN=localhost"
   chmod 600 server.key
   chmod 644 server.crt
```

#### 2. Start Infrastructure
Run the following Docker containers:

**PostgreSQL:**
```bash
docker run --name languagebuddy-postgres \
  -e POSTGRES_USER=languagebuddy \
  -e POSTGRES_PASSWORD=languagebuddy \
  -e POSTGRES_DB=languagebuddy \
  -p 5432:5432 \
  -v $(pwd):/var/lib/postgresql/ssl:ro \
  -d postgres:16 \
  -c ssl=on \
  -c ssl_cert_file=/var/lib/postgresql/ssl/server.crt \
  -c ssl_key_file=/var/lib/postgresql/ssl/server.key
```

**MinIO (S3 Compatible Storage):**
```bash
docker run -d \
  --name language-buddy-s3 \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v ~/minio/data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```

#### 3. Database Migrations
After setting up Postgres, run:
```bash
pnpm db:generate
pnpm db:push
```

## Core Utilities

### Storage & Assets
The project uses an S3-compatible storage layer (Railway S3 in production, MinIO locally). 
**Important**: Never use direct URLs. Always use presigned URLs for reading and writing.

Example usage from `src/lib/server/storage.ts`:
```typescript
import { getReadPresignedUrl, getWritePresignedUrl } from "~/lib/server/storage";

// Get a URL to display an image
const readUrl = await getReadPresignedUrl("path/to/image.png");

// Get a URL to upload a file from the client
const uploadUrl = await getWritePresignedUrl("path/to/new-audio.mp3", "audio/mpeg");
```
