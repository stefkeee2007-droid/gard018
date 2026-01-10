// Vercel Cron Job endpoint - runs daily at midnight (00:00 / 12 AM)
export { GET } from "../../check-memberships/route"

export const dynamic = "force-dynamic"
export const maxDuration = 60
