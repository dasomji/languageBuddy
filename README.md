# EdgeLang (LanguageBuddy)

EdgeLang is a self-study language learning application that leverages AI to create personalized learning content from daily diaries and topic-based requests.

## Core Features

### 1. AI-Powered Diary Analysis
Write about your day in your native language, and EdgeLang will:
- **Generate a Mini-Story**: A children's book-style story in your target language, simplified to your current level.
- **Visuals & Audio**: Generate mnemonic-cued images and high-quality TTS audio for every page.
- **Extract Vocabulary**: Automatically identify key words from the story and add them to your VoDex.

### 2. VoDex & Word Packages
The **VoDex** is your personal vocabulary index. Words are organized into **Packages**:
- **Diary Packages**: Automatically created from each processed diary entry.
- **Topic Packages**: Generate a pack of 20-30 words by simply describing a topic (e.g., "At the airport", "Calisthenics vocabulary").
- **Mnemonic Images**: Every word gets an AI-generated image with mnemonic cues (Fire-themed for Masculine, Ice-themed for Feminine).

### 3. Interactive Reading
Read your generated stories with a "page-turn" effect, synchronized audio, and click-to-translate functionality.

---

## Technical Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, shadcn/ui.
- **Backend**: tRPC 11 (with Subscriptions for live progress).
- **Database**: PostgreSQL with Drizzle ORM.
- **Auth**: better-auth 1.4.
- **Storage**: S3-compatible (MinIO for local dev, Railway S3 for prod).
- **AI Engine**: 
  - **Text**: OpenRouter (`minimax/minimax-m2.1`) for structured JSON output.
  - **Images**: fal.ai (`fal-ai/z-image/turbo`).
  - **Audio**: ElevenLabs (Multilingual v2).

---

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
S3_BUCKET_NAME="languagebuddy"
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
Use Docker to run the required services:

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

**MinIO:**
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
Run the following to set up your schema:
```bash
pnpm db:generate
pnpm db:push
```

---

## Developer Guide

### Background Processing & Subscriptions
Generating AI content (stories, images, audio) is time-consuming. We use a background processing pattern:
1. Client triggers a mutation (e.g., `createPackageFromTopic`).
2. Server creates a record with `status: "processing"` and returns immediately.
3. A background task runs the AI pipeline, updating `processedWords` and `status` in the DB.
4. The client uses a **tRPC Subscription** (`packageProgress`) to listen for real-time updates via an `EventEmitter`.

### Storage Pattern
**NEVER** expose direct S3 URLs. The application uses presigned URLs for all asset access.
- Use `getReadPresignedUrl(key)` for displaying images/audio.
- Assets are organized by type: `stories/{id}/...` and `vocab/{id}/...`.

### AI Prompting
Prompts are centrally managed in `src/lib/server/ai/prompts.ts`. We enforce **Structured Output** using Zod schemas to ensure the LLM returns valid JSON that matches our database structure.
