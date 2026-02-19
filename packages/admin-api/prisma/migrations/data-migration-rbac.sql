-- Data Migration: RBAC - Application Members & Root User
-- Run this AFTER the Prisma schema migration has been applied.
--
-- 1. Create OWNER membership for all existing Application owners
INSERT INTO application_members (id, application_id, user_id, role, created_at, updated_at)
SELECT gen_random_uuid(), id, user_id, 'OWNER', NOW(), NOW()
FROM applications
ON CONFLICT (application_id, user_id) DO NOTHING;

-- 2. Set the first registered user as root
UPDATE users SET is_root = true
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);
