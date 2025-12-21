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

### Generate SSL certificates

'''bash
   openssl req -new -x509 -days 365 -nodes \
     -out server.crt -keyout server.key \
     -subj "/CN=localhost"
   chmod 600 server.key
   chmod 644 server.crt
'''

Then start a new docker container with the following command:
```bash
docker run --name languagebuddy-postgres \
  -e POSTGRES_USER=languagebuddy \ 
  -e POSTGRES_PASSWORD=languagebuddy \ 
  -e POSTGRES_DB=languagebuddy \
  -p 5432:5432 \
  -v <path to your postgres-ssl directory>:/var/lib/postgresql/ssl:ro \
  -d postgres:16 \
  -c ssl=on \
  -c ssl_cert_file=/var/lib/postgresql/ssl/server.crt \
  -c ssl_key_file=/var/lib/postgresql/ssl/server.key
```

For storage:
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