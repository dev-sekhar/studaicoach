const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedSubjects() {
    console.log('🌱 Seeding subjects for Grade 10 CBSE...');

    const subjects = [
        { name: 'Mathematics', board: 'CBSE', grade: 10 },
        { name: 'Physics', board: 'CBSE', grade: 10 },
        { name: 'Chemistry', board: 'CBSE', grade: 10 },
        { name: 'Biology', board: 'CBSE', grade: 10 },
        { name: 'English', board: 'CBSE', grade: 10 },
        { name: 'Social Science', board: 'CBSE', grade: 10 },
        { name: 'Computer Science', board: 'CBSE', grade: 10 },
        { name: 'Hindi', board: 'CBSE', grade: 10 },
    ];

    for (const subject of subjects) {
        await prisma.subject.upsert({
            where: {
                name_board_grade: {
                    name: subject.name,
                    board: subject.board,
                    grade: subject.grade,
                },
            },
            update: {},
            create: subject,
        });
        console.log(`✅ Created subject: ${subject.name} (${subject.board} Grade ${subject.grade})`);
    }

    console.log('\n✅ Subjects seeded successfully!\n');
}

seedSubjects()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
