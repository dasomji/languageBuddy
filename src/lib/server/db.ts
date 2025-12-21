import { env } from "~/env";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "~/db/schema";
import * as authSchema from "~/db/auth-schema";

export const db = drizzle({
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: {
      requestCert: true,
      rejectUnauthorized: false,
    },
  },
  schema: {
    ...schema,
    ...authSchema,
  },
});
