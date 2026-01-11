import { IsEmail, IsString, MinLength, IsEnum, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecurePassword123!' })
    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must contain uppercase, lowercase, and number/special character',
    })
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'johndoe' })
    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-z0-9-]+$/, {
        message: 'Username can only contain lowercase letters, numbers, and hyphens',
    })
    username: string;

    @ApiProperty({ enum: Role, example: 'STUDENT' })
    @IsEnum(Role)
    role: Role;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    organizationId?: string;
}
