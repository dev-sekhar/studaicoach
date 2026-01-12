const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Reseeding database...');

    // Delete existing admin user if exists
    await prisma.user.deleteMany({
        where: { email: 'admin@studaicoach.com' },
    });
    console.log('🗑️  Deleted existing admin user');

    // Get or create organization
    let organization = await prisma.organization.findUnique({
        where: { subdomain: 'admin' },
    });

    if (!organization) {
        organization = await prisma.organization.create({
            data: {
                name: 'StudAICoach Admin',
                subdomain: 'admin',
                type: 'SCHOOL',
                tier: 'PREMIUM_SCHOOL',
                isActive: true,
            },
        });
        console.log('✅ Created organization:', organization.name);
    } else {
        console.log('✅ Using existing organization:', organization.name);
    }

    // Create SUPER_ADMIN user with fresh hash
    const password = 'Admin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('🔐 Generated password hash');

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@studaicoach.com',
            passwordHash: hashedPassword,
            name: 'Super Admin',
            username: 'superadmin',
            profileSlug: 'superadmin',
            role: Role.SUPER_ADMIN,
            organizationId: organization.id,
            isActive: true,
        },
    });

    console.log('✅ Created SUPER_ADMIN user:', adminUser.email);

    // Verify the password immediately
    const isValid = await bcrypt.compare(password, adminUser.passwordHash);
    console.log('🔍 Password verification:', isValid ? '✅ VALID' : '❌ INVALID');

    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@studaicoach.com');
    console.log('   Password: Admin@123');
    console.log('\n⚠️  Please change the password after first login!\n');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
