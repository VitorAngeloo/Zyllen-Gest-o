import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ── 1. Create Roles ─────────────────────────
    const adminRole = await prisma.role.upsert({
        where: { name: 'Administrador' },
        update: { description: 'Administrador com acesso total ao sistema' },
        create: {
            name: 'Administrador',
            description: 'Administrador com acesso total ao sistema',
        },
    });

    const tecnicoRole = await prisma.role.upsert({
        where: { name: 'Técnico' },
        update: {},
        create: {
            name: 'Técnico',
            description: 'Técnico de campo com acesso a operações de estoque e manutenção',
        },
    });

    const gestorRole = await prisma.role.upsert({
        where: { name: 'Gestor' },
        update: {},
        create: {
            name: 'Gestor',
            description: 'Gestor com acesso a relatórios e aprovações',
        },
    });

    const internosRole = await prisma.role.upsert({
        where: { name: 'Internos' },
        update: { description: 'Colaborador interno — acesso apenas a chamados TI próprios' },
        create: {
            name: 'Internos',
            description: 'Colaborador interno — acesso apenas a chamados TI próprios',
        },
    });

    console.log('  ✅ Roles created:', adminRole.name, tecnicoRole.name, gestorRole.name, internosRole.name);

    // ── 2. Create Screen Permissions ────────────
    const permissions = [
        // Dashboard
        { screen: 'dashboard', action: 'view' },
        // Inventory
        { screen: 'inventory', action: 'view' },
        { screen: 'inventory', action: 'bipar_entrada' },
        { screen: 'inventory', action: 'bipar_saida' },
        { screen: 'inventory', action: 'historico' },
        // Assets
        { screen: 'assets', action: 'view' },
        { screen: 'assets', action: 'create' },
        { screen: 'assets', action: 'lookup' },
        // Catalog
        { screen: 'catalog', action: 'view' },
        { screen: 'catalog', action: 'create' },
        { screen: 'catalog', action: 'update' },
        { screen: 'catalog', action: 'delete' },
        // Locations
        { screen: 'locations', action: 'view' },
        { screen: 'locations', action: 'create' },
        { screen: 'locations', action: 'update' },
        { screen: 'locations', action: 'delete' },
        // Suppliers
        { screen: 'suppliers', action: 'view' },
        { screen: 'suppliers', action: 'create' },
        { screen: 'suppliers', action: 'update' },
        { screen: 'suppliers', action: 'delete' },
        // Purchases
        { screen: 'purchases', action: 'view' },
        { screen: 'purchases', action: 'create' },
        { screen: 'purchases', action: 'approve' },
        { screen: 'purchases', action: 'receive' },
        // Tickets
        { screen: 'tickets', action: 'view' },
        { screen: 'tickets', action: 'triage' },
        { screen: 'tickets', action: 'assign' },
        { screen: 'tickets', action: 'close' },
        // Maintenance
        { screen: 'maintenance', action: 'view' },
        { screen: 'maintenance', action: 'open' },
        { screen: 'maintenance', action: 'execute' },
        { screen: 'maintenance', action: 'close' },
        // Approvals
        { screen: 'approvals', action: 'view' },
        { screen: 'approvals', action: 'approve' },
        { screen: 'approvals', action: 'reject' },
        // Access (roles/permissions management)
        { screen: 'access', action: 'view' },
        { screen: 'access', action: 'manage' },
        { screen: 'access', action: 'manage_roles' },
        { screen: 'access', action: 'manage_permissions' },
        // Labels
        { screen: 'labels', action: 'view' },
        { screen: 'labels', action: 'print' },
        // Product Exits
        { screen: 'inventory', action: 'exit' },
        // Audit
        { screen: 'audit', action: 'view' },
        // Settings
        { screen: 'settings', action: 'view' },
        { screen: 'settings', action: 'manage' },
    ];

    const createdPermissions: { id: string; screen: string; action: string }[] = [];
    for (const perm of permissions) {
        const sp = await prisma.screenPermission.upsert({
            where: { screen_action: { screen: perm.screen, action: perm.action } },
            update: {},
            create: perm,
        });
        createdPermissions.push(sp);
    }
    console.log(`  ✅ ${createdPermissions.length} screen permissions created`);

    // ── 3. Assign ALL permissions to Admin ──────
    for (const perm of createdPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_screenPermissionId: {
                    roleId: adminRole.id,
                    screenPermissionId: perm.id,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                screenPermissionId: perm.id,
            },
        });
    }
    console.log('  ✅ All permissions assigned to Admin role');

    // ── 3b. Assign permissions to Técnico ─────
    const tecnicoScreens = [
        'dashboard.view',
        'inventory.view', 'inventory.bipar_entrada', 'inventory.bipar_saida', 'inventory.historico', 'inventory.exit',
        'assets.view', 'assets.lookup',
        'catalog.view',
        'locations.view',
        'tickets.view',
        'maintenance.view', 'maintenance.open', 'maintenance.execute', 'maintenance.close',
        'labels.view', 'labels.print',
    ];
    for (const key of tecnicoScreens) {
        const [screen, action] = key.split('.');
        const sp = createdPermissions.find((p) => p.screen === screen && p.action === action);
        if (sp) {
            await prisma.rolePermission.upsert({
                where: { roleId_screenPermissionId: { roleId: tecnicoRole.id, screenPermissionId: sp.id } },
                update: {},
                create: { roleId: tecnicoRole.id, screenPermissionId: sp.id },
            });
        }
    }
    console.log(`  ✅ ${tecnicoScreens.length} permissions assigned to Técnico role`);

    // ── 3c. Assign permissions to Gestor ──────
    const gestorScreens = [
        'dashboard.view',
        'inventory.view', 'inventory.bipar_entrada', 'inventory.bipar_saida', 'inventory.historico', 'inventory.exit',
        'assets.view', 'assets.create', 'assets.lookup',
        'catalog.view', 'catalog.create', 'catalog.update', 'catalog.delete',
        'locations.view', 'locations.create', 'locations.update', 'locations.delete',
        'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
        'purchases.view', 'purchases.create', 'purchases.approve', 'purchases.receive',
        'tickets.view', 'tickets.triage', 'tickets.assign', 'tickets.close',
        'maintenance.view', 'maintenance.open', 'maintenance.execute', 'maintenance.close',
        'approvals.view', 'approvals.approve', 'approvals.reject',
        'labels.view', 'labels.print',
        'audit.view',
        'settings.view',
    ];
    for (const key of gestorScreens) {
        const [screen, action] = key.split('.');
        const sp = createdPermissions.find((p) => p.screen === screen && p.action === action);
        if (sp) {
            await prisma.rolePermission.upsert({
                where: { roleId_screenPermissionId: { roleId: gestorRole.id, screenPermissionId: sp.id } },
                update: {},
                create: { roleId: gestorRole.id, screenPermissionId: sp.id },
            });
        }
    }
    console.log(`  ✅ ${gestorScreens.length} permissions assigned to Gestor role`);

    // ── 3d. Assign permissions to Internos ────
    const internosScreens: string[] = [
    ];
    for (const key of internosScreens) {
        const [screen, action] = key.split('.');
        const sp = createdPermissions.find((p) => p.screen === screen && p.action === action);
        if (sp) {
            await prisma.rolePermission.upsert({
                where: { roleId_screenPermissionId: { roleId: internosRole.id, screenPermissionId: sp.id } },
                update: {},
                create: { roleId: internosRole.id, screenPermissionId: sp.id },
            });
        }
    }
    console.log(`  ✅ ${internosScreens.length} permissions assigned to Internos role`);

    // ── 4. Create Admin User ────────────────────
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminPinHash = await bcrypt.hash('0000', 10);

    const adminUser = await prisma.internalUser.upsert({
        where: { email: 'admin@zyllen.com' },
        update: {},
        create: {
            name: 'Administrador',
            email: 'admin@zyllen.com',
            passwordHash: adminPasswordHash,
            pin4Hash: adminPinHash,
            roleId: adminRole.id,
            isActive: true,
        },
    });
    console.log('  ✅ Admin user created:', adminUser.email, '(PIN: 0000)');

    // ── 5. Create Default Location ──────────────
    const defaultLocation = await prisma.location.upsert({
        where: { name: 'Almoxarifado Central' },
        update: {},
        create: {
            name: 'Almoxarifado Central',
            description: 'Local principal de armazenamento de estoque',
        },
    });
    console.log('  ✅ Default location created:', defaultLocation.name);

    // ── 6. Create Default Movement Types ────────
    const movementTypes = [
        {
            name: 'Entrada',
            requiresApproval: false,
            isFinalWriteOff: false,
            setsAssetStatus: null,
            defaultToLocationId: defaultLocation.id,
        },
        {
            name: 'Saída',
            requiresApproval: false,
            isFinalWriteOff: false,
            setsAssetStatus: null,
            defaultToLocationId: null,
        },
        {
            name: 'Transferência',
            requiresApproval: false,
            isFinalWriteOff: false,
            setsAssetStatus: null,
            defaultToLocationId: null,
        },
        {
            name: 'Baixa',
            requiresApproval: true,
            isFinalWriteOff: true,
            setsAssetStatus: 'BAIXADO',
            defaultToLocationId: null,
        },
    ];

    for (const mt of movementTypes) {
        await prisma.movementType.upsert({
            where: { name: mt.name },
            update: {},
            create: mt,
        });
    }
    console.log('  ✅ Movement types created:', movementTypes.map((m) => m.name).join(', '));

    // ── 7. Create Default Category ──────────────
    const defaultCategory = await prisma.category.upsert({
        where: { name: 'Geral' },
        update: {},
        create: { name: 'Geral' },
    });
    console.log('  ✅ Default category created:', defaultCategory.name);

    console.log('');
    console.log('🎉 Seed completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   Admin login: admin@zyllen.com / admin123');
    console.log('   Admin PIN: 0000');
    console.log('   Roles: Admin, Técnico, Gestor, Internos');
    console.log(`   Permissions: ${createdPermissions.length} screen permissions`);
    console.log('   Location: Almoxarifado Central');
    console.log('   Movement Types: Entrada, Saída, Transferência, Baixa');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
