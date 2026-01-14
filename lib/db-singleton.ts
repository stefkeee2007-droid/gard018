import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

const globalForDb = global as unknown as {
  sql: NeonQueryFunction<false, false> | undefined
}

export const sql = globalForDb.sql ?? neon(process.env.DATABASE_URL!)

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql
}
