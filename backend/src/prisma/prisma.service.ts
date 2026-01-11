import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });

        // Multi-tenant middleware for automatic filtering
        this.$use(async (params, next) => {
            // Get tenant context from async local storage (set by middleware)
            const tenantId = this.getTenantContext();

            // Models that should be tenant-scoped
            const tenantScopedModels = [
                'user',
                'student',
                'teacher',
                'parent',
                'answerSheet',
                'progress',
                'examSchedule',
                'achievement',
                'leaderboard',
                'feedback',
                'chatConversation',
            ];

            if (tenantScopedModels.includes(params.model)) {
                // Add organizationId filter for read operations
                if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
                    params.args.where = {
                        ...params.args.where,
                        organizationId: tenantId,
                    };
                }

                // Add organizationId for create operations
                if (params.action === 'create') {
                    params.args.data = {
                        ...params.args.data,
                        organizationId: tenantId,
                    };
                }

                // Add organizationId for update operations
                if (params.action === 'update' || params.action === 'updateMany') {
                    params.args.where = {
                        ...params.args.where,
                        organizationId: tenantId,
                    };
                }

                // Add organizationId for delete operations
                if (params.action === 'delete' || params.action === 'deleteMany') {
                    params.args.where = {
                        ...params.args.where,
                        organizationId: tenantId,
                    };
                }
            }

            return next(params);
        });
    }

    async onModuleInit() {
        await this.$connect();
        console.log('✅ Database connected');
    }

    async onModuleDestroy() {
        await this.$disconnect();
        console.log('❌ Database disconnected');
    }

    // Tenant context management (will be set by middleware)
    private tenantContext: string | null = null;

    setTenantContext(tenantId: string) {
        this.tenantContext = tenantId;
    }

    getTenantContext(): string | null {
        return this.tenantContext;
    }

    clearTenantContext() {
        this.tenantContext = null;
    }
}
