const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function verify() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@studaicoach.com' },
    });

    if (!user) {
        console.log('❌ User not found!');
        return;
    }

    console.log('✅ User found:');
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  Role:', user.role);
    console.log('  Username:', user.username);
    console.log('  Password Hash:', user.passwordHash ? 'EXISTS' : 'MISSING');
    console.log('  Is Active:', user.isActive);

    // Test password
    const testPassword = 'Admin@123';
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('\n🔐 Password Test:');
    console.log('  Testing password:', testPassword);
    console.log('  Result:', isValid ? '✅ VALID' : '❌ INVALID');
}

verify()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
