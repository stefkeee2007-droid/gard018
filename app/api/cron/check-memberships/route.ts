// Vercel Cron Job endpoint - runs daily at 9 AM
export { GET } from "../../check-memberships/route"

export const dynamic = "force-dynamic"
export const maxDuration = 60
