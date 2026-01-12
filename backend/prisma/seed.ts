import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create default organization
    const organization = await prisma.organization.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'StudAICoach Admin',
            type: 'SCHOOL',
            contactEmail: 'admin@studaicoach.com',
            isActive: true,
        },
    });

    console.log('✅ Created organization:', organization.name);

    // Create SUPER_ADMIN user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@studaicoach.com' },
        update: {},
        create: {
            email: 'admin@studaicoach.com',
            password: hashedPassword,
            name: 'Super Admin',
            role: Role.SUPER_ADMIN,
            organizationId: organization.id,
            isActive: true,
        },
    });

    console.log('✅ Created SUPER_ADMIN user:', adminUser.email);
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
