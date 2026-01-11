import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let accessToken: string;
    let refreshToken: string;
    let userId: string;

    const testUser = {
        email: `test-${Date.now()}@example.com`,
        password: 'Test123!',
        name: 'Test User',
        username: `testuser${Date.now()}`,
        role: 'STUDENT',
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
                forbidNonWhitelisted: true,
            }),
        );

        await app.init();

        prisma = app.get<PrismaService>(PrismaService);
    });

    afterAll(async () => {
        // Cleanup: Delete test user and organization
        if (userId) {
            await prisma.student.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        }

        await app.close();
    });

    describe('/api/health (GET)', () => {
        it('should return health status', () => {
            return request(app.getHttpServer())
                .get('/api/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('status', 'ok');
                    expect(res.body).toHaveProperty('timestamp');
                });
        });
    });

    describe('/api/auth/register (POST)', () => {
        it('should register a new user', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send(testUser)
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    expect(res.body).toHaveProperty('user');
                    expect(res.body.user).toHaveProperty('id');
                    expect(res.body.user.email).toBe(testUser.email);
                    expect(res.body.user.role).toBe(testUser.role);

                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                    userId = res.body.user.id;
                });
        });

        it('should reject duplicate email', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send(testUser)
                .expect(409)
                .expect((res) => {
                    expect(res.body.message).toContain('already exists');
                });
        });

        it('should reject invalid email format', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    email: 'invalid-email',
                })
                .expect(400);
        });

        it('should reject weak password', () => {
            return request(app.getHttpServer())
                .post('/api/auth/register')
                .send({
                    ...testUser,
                    email: 'another@test.com',
                    password: 'weak',
                })
                .expect(400);
        });
    });

    describe('/api/auth/login (POST)', () => {
        it('should login with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password,
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    expect(res.body).toHaveProperty('user');
                });
        });

        it('should reject invalid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword123!',
                })
                .expect(401);
        });

        it('should reject non-existent user', () => {
            return request(app.getHttpServer())
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'Test123!',
                })
                .expect(401);
        });
    });

    describe('/api/auth/me (GET)', () => {
        it('should get user profile with valid token', () => {
            return request(app.getHttpServer())
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id', userId);
                    expect(res.body).toHaveProperty('email', testUser.email);
                    expect(res.body).toHaveProperty('organizationId');
                    expect(res.body).not.toHaveProperty('passwordHash');
                });
        });

        it('should reject request without token', () => {
            return request(app.getHttpServer())
                .get('/api/auth/me')
                .expect(401);
        });

        it('should reject request with invalid token', () => {
            return request(app.getHttpServer())
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });

    describe('/api/auth/refresh (POST)', () => {
        it('should refresh access token', () => {
            return request(app.getHttpServer())
                .post('/api/auth/refresh')
                .send({ refreshToken })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                });
        });

        it('should reject invalid refresh token', () => {
            return request(app.getHttpServer())
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' })
                .expect(401);
        });
    });

    describe('/api/auth/logout (POST)', () => {
        it('should logout successfully', () => {
            return request(app.getHttpServer())
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('message');
                });
        });

        it('should reject logout without token', () => {
            return request(app.getHttpServer())
                .post('/api/auth/logout')
                .expect(401);
        });
    });
});
