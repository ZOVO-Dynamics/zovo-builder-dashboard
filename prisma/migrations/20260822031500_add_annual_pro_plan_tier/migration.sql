-- AlterEnum
-- The annual_pro plan (tier "ANNUAL_PRO") was introduced without a matching
-- migration, so the PlanTier enum type in the database may already have
-- this value added manually. IF NOT EXISTS makes this migration safe to
-- apply regardless, and brings prisma/schema.prisma back in sync with the
-- database and with any environment that never got the manual patch.
ALTER TYPE "PlanTier" ADD VALUE IF NOT EXISTS 'ANNUAL_PRO';
