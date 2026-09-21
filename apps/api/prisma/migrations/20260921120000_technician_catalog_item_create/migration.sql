-- Allow technicians to register catalog items for stock entry without granting
-- category creation, item editing, deletion, or broader catalog management.
INSERT INTO "ScreenPermission" ("id", "screen", "action")
VALUES (gen_random_uuid()::text, 'catalog', 'create_sku')
ON CONFLICT ("screen", "action") DO NOTHING;

INSERT INTO "RolePermission" ("id", "roleId", "screenPermissionId")
SELECT gen_random_uuid()::text, role."id", permission."id"
FROM "Role" role
JOIN "ScreenPermission" permission
  ON permission."screen" = 'catalog' AND permission."action" = 'create_sku'
WHERE role."name" = 'Técnico'
ON CONFLICT ("roleId", "screenPermissionId") DO NOTHING;
