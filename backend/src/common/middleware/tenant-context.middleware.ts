import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
    constructor(private prisma: PrismaService) { }

    async use(req: Request, res: Response, next: NextFunction) {
        try {
            let tenantId: string | null = null;

            // Extract subdomain from hostname
            const subdomain = this.extractSubdomain(req.hostname);

            if (subdomain && subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'api' && subdomain !== 'admin') {
                // B2B: School/College subdomain
                const organization = await this.prisma.organization.findUnique({
                    where: { subdomain },
                    select: { id: true, isActive: true },
                });

                if (!organization) {
                    throw new UnauthorizedException('Invalid subdomain');
                }

                if (!organization.isActive) {
                    throw new UnauthorizedException('Organization is inactive');
                }

                tenantId = organization.id;
            } else {
                // B2C: Extract from JWT token (will be set by auth guard)
                tenantId = (req as any).user?.organizationId;
            }

            if (!tenantId) {
                // For public routes, we might not have a tenant yet
                // This will be validated by route guards
                return next();
            }

            // Set tenant context in Prisma service
            this.prisma.setTenantContext(tenantId);

            // Store tenant ID in request for easy access
            (req as any).tenantId = tenantId;

            next();
        } catch (error) {
            throw new UnauthorizedException('Tenant context required');
        }
    }

    private extractSubdomain(hostname: string): string | null {
        // Remove port if present
        const host = hostname.split(':')[0];

        // Split by dots
        const parts = host.split('.');

        // If localhost or IP, no subdomain
        if (parts.length < 3 || host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
            return null;
        }

        // Return first part as subdomain
        return parts[0];
    }
}
