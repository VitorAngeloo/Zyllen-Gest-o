-- Keep operational exits in identified internal locations. Existing locations and assets are untouched.
INSERT INTO "Location" (id, name, kind, "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'Manutenção', 'INTERNAL', NOW(), NOW()),
    (gen_random_uuid()::text, 'Uso interno - Skyline', 'INTERNAL', NOW(), NOW()),
    (gen_random_uuid()::text, 'Baixa', 'INTERNAL', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;
