import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        // 1. Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // 2. Check if username is taken
        const existingUsername = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });

        if (existingUsername) {
            throw new ConflictException('Username already taken');
        }

        // 3. Hash password
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // 4. Generate profile slug from username
        const profileSlug = dto.username.toLowerCase();

        // 5. Create or get organization
        let organizationId = dto.organizationId;

        if (!organizationId) {
            // Create individual organization
            const subdomain = this.generateSubdomain(dto.username);

            const organization = await this.prisma.organization.create({
                data: {
                    name: `${dto.name}'s Organization`,
                    subdomain,
                    type: 'INDIVIDUAL',
                    tier: 'FREE',
                },
            });

            organizationId = organization.id;
        }

        // 6. Create user
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                name: dto.name,
                username: dto.username,
                profileSlug,
                role: dto.role,
                organizationId,
            },
            include: {
                organization: true,
            },
        });

        // 7. Create student/teacher/parent profile based on role
        if (user.role === 'STUDENT') {
            await this.prisma.student.create({
                data: {
                    userId: user.id,
                    organizationId: user.organizationId,
                    grade: 10, // Default, can be updated later
                    board: 'CBSE', // Default
                },
            });
        } else if (user.role === 'TEACHER') {
            await this.prisma.teacher.create({
                data: {
                    userId: user.id,
                },
            });
        } else if (user.role === 'PARENT') {
            await this.prisma.parent.create({
                data: {
                    userId: user.id,
                },
            });
        }

        // 8. Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                username: user.username,
                role: user.role,
                organizationId: user.organizationId,
            },
        };
    }

    async login(dto: LoginDto) {
        // 1. Find user
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { organization: true },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Account is inactive');
        }

        // 2. Verify password
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // 3. Generate tokens
        const tokens = await this.generateTokens(user);

        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                username: user.username,
                role: user.role,
                organizationId: user.organizationId,
            },
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });

            if (!user || !user.isActive) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            return this.generateTokens(user);
        } catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async getUserProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                organization: true,
                studentProfile: true,
                teacherProfile: true,
                parentProfile: true,
                publicProfile: true,
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Remove sensitive data
        const { passwordHash, ...userWithoutPassword } = user;

        return userWithoutPassword;
    }

    private async generateTokens(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET,
                expiresIn: '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: '7d',
            }),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    private generateSubdomain(username: string): string {
        // Generate unique subdomain from username
        const base = username.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const random = Math.random().toString(36).substring(2, 6);
        return `${base}-${random}`;
    }
}
