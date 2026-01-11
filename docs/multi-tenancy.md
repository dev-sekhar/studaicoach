# Multi-Tenancy Architecture - StudAICoach

## Overview

StudAICoach implements a **shared database, row-level security (RLS)** multi-tenancy model where all tenants share the same database instance, but data is strictly isolated using `organizationId` as the tenant identifier.

---

## Tenant Isolation Strategy

### 1. Organization-Based Tenancy

Every entity in the system belongs to an **Organization**:
- **B2C Users**: Individual students belong to a default "Individual" organization
- **B2B Users**: Schools/colleges have their own organization
- **Data Isolation**: All queries are filtered by `organizationId`

### 2. Tenant Identifier

```prisma
model Organization {
  id            String   @id @default(uuid())
  name          String
  subdomain     String   @unique  // e.g., "greenwood-high"
  type          OrgType  // INDIVIDUAL, SCHOOL, COLLEGE
  // ... other fields
}

// Every tenant-scoped entity has organizationId
model User {
  id             String   @id @default(uuid())
  organizationId String   // TENANT IDENTIFIER
  organization   Organization @relation(fields: [organizationId], references: [id])
  // ... other fields
}

model Student {
  id             String   @id @default(uuid())
  organizationId String   // TENANT IDENTIFIER
  organization   Organization @relation(fields: [organizationId], references: [id])
  // ... other fields
}
```

---

## Implementation Details

### 1. Tenant Context Middleware

All API requests must include tenant context. The middleware extracts the tenant from:
- **Subdomain**: `greenwood-high.studaicoach.com` → `organizationId`
- **JWT Token**: Contains `organizationId` claim
- **API Key**: Associated with specific `organizationId`

```typescript
// backend/src/common/middleware/tenant-context.middleware.ts
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant from subdomain
    const subdomain = this.extractSubdomain(req.hostname);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      // B2B: School/College subdomain
      req['tenantId'] = await this.getOrgIdBySubdomain(subdomain);
    } else {
      // B2C: Extract from JWT token
      req['tenantId'] = req.user?.organizationId;
    }
    
    if (!req['tenantId']) {
      throw new UnauthorizedException('Tenant context required');
    }
    
    next();
  }
}
```

### 2. Tenant-Scoped Queries

All database queries MUST include `organizationId` filter:

```typescript
// ❌ WRONG - No tenant filter
const students = await this.prisma.student.findMany();

// ✅ CORRECT - Tenant-scoped
const students = await this.prisma.student.findMany({
  where: { organizationId: req.tenantId }
});
```

### 3. Prisma Middleware for Automatic Filtering

```typescript
// backend/src/database/prisma.service.ts
prisma.$use(async (params, next) => {
  // Get tenant ID from async context
  const tenantId = this.getTenantFromContext();
  
  if (!tenantId) {
    throw new Error('Tenant context missing');
  }
  
  // Automatically add organizationId filter
  if (params.action === 'findMany' || params.action === 'findFirst') {
    params.args.where = {
      ...params.args.where,
      organizationId: tenantId,
    };
  }
  
  // Automatically set organizationId on create
  if (params.action === 'create') {
    params.args.data = {
      ...params.args.data,
      organizationId: tenantId,
    };
  }
  
  return next(params);
});
```

### 4. Tenant Context Decorator

```typescript
// backend/src/common/decorators/tenant.decorator.ts
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);

// Usage in controllers
@Get('students')
async getStudents(@TenantId() tenantId: string) {
  return this.studentService.findAll(tenantId);
}
```

---

## Subdomain Routing

### DNS Configuration

```
# Wildcard DNS record
*.studaicoach.com → Load Balancer IP

# Main domains
www.studaicoach.com → Frontend (B2C)
app.studaicoach.com → Frontend (B2C)
api.studaicoach.com → Backend API
admin.studaicoach.com → Admin Dashboard

# School subdomains (dynamic)
greenwood-high.studaicoach.com → Frontend (B2B)
delhi-public.studaicoach.com → Frontend (B2B)
```

### Subdomain Validation

```typescript
// On organization creation
async createOrganization(dto: CreateOrganizationDto) {
  // Validate subdomain
  const subdomain = this.sanitizeSubdomain(dto.name);
  
  // Check availability
  const exists = await this.prisma.organization.findUnique({
    where: { subdomain }
  });
  
  if (exists) {
    throw new ConflictException('Subdomain already taken');
  }
  
  // Reserved subdomains
  const reserved = ['www', 'app', 'api', 'admin', 'mail', 'ftp'];
  if (reserved.includes(subdomain)) {
    throw new BadRequestException('Subdomain is reserved');
  }
  
  return this.prisma.organization.create({
    data: { ...dto, subdomain }
  });
}
```

---

## Data Isolation Guarantees

### 1. Database Level
- Every query filtered by `organizationId`
- Foreign key constraints ensure referential integrity within tenant
- Indexes on `organizationId` for performance

### 2. Application Level
- Middleware enforces tenant context
- Decorators simplify tenant-scoped operations
- Service layer validates tenant ownership

### 3. API Level
- JWT tokens include `organizationId` claim
- API keys are tenant-specific
- Webhook signatures validated per tenant

---

## Security Considerations

### 1. Prevent Tenant Leakage

```typescript
// ❌ DANGEROUS - Direct ID access
@Get(':id')
async getStudent(@Param('id') id: string) {
  return this.prisma.student.findUnique({ where: { id } });
}

// ✅ SAFE - Tenant-scoped access
@Get(':id')
async getStudent(
  @Param('id') id: string,
  @TenantId() tenantId: string
) {
  const student = await this.prisma.student.findFirst({
    where: { id, organizationId: tenantId }
  });
  
  if (!student) {
    throw new NotFoundException();
  }
  
  return student;
}
```

### 2. Tenant Context Validation

```typescript
// Validate user belongs to tenant
async validateTenantAccess(userId: string, tenantId: string) {
  const user = await this.prisma.user.findFirst({
    where: { id: userId, organizationId: tenantId }
  });
  
  if (!user) {
    throw new ForbiddenException('Access denied');
  }
  
  return user;
}
```

### 3. Cross-Tenant Operations

Some operations may need to access multiple tenants (e.g., super admin):

```typescript
@Roles('SUPER_ADMIN')
@Get('all-organizations')
async getAllOrganizations() {
  // Super admin can bypass tenant filter
  return this.prisma.organization.findMany();
}
```

---

## Testing Multi-Tenancy

### Unit Tests

```typescript
describe('StudentService', () => {
  it('should only return students from tenant', async () => {
    const tenant1Students = await service.findAll('tenant-1-id');
    const tenant2Students = await service.findAll('tenant-2-id');
    
    expect(tenant1Students).not.toContainEqual(
      expect.objectContaining({ organizationId: 'tenant-2-id' })
    );
  });
});
```

### Integration Tests

```typescript
describe('Student API (e2e)', () => {
  it('should prevent cross-tenant access', async () => {
    const tenant1Token = await getAuthToken('tenant-1-user');
    const tenant2StudentId = 'student-from-tenant-2';
    
    const response = await request(app.getHttpServer())
      .get(`/students/${tenant2StudentId}`)
      .set('Authorization', `Bearer ${tenant1Token}`)
      .expect(404); // Not found (not forbidden to avoid info leak)
  });
});
```

---

## Performance Optimization

### 1. Indexes

```sql
-- Composite indexes for tenant-scoped queries
CREATE INDEX idx_student_org_id ON student(organization_id, id);
CREATE INDEX idx_answer_sheet_org_student ON answer_sheet(organization_id, student_id);
CREATE INDEX idx_progress_org_student ON progress(organization_id, student_id);
```

### 2. Query Optimization

```typescript
// Use select to reduce data transfer
const students = await this.prisma.student.findMany({
  where: { organizationId: tenantId },
  select: {
    id: true,
    name: true,
    grade: true,
    // Don't select unnecessary fields
  }
});
```

### 3. Caching

```typescript
// Cache tenant metadata
@Cacheable({ ttl: 3600 })
async getOrganization(tenantId: string) {
  return this.prisma.organization.findUnique({
    where: { id: tenantId }
  });
}
```

---

## Migration from Single-Tenant

If migrating from single-tenant:

1. **Add organizationId column** to all tenant-scoped tables
2. **Create default organization** for existing data
3. **Update all existing records** with default organizationId
4. **Add foreign key constraints**
5. **Update application code** to use tenant context
6. **Test thoroughly** before production deployment

---

## Monitoring & Auditing

### 1. Tenant Activity Logs

```prisma
model AuditLog {
  id              String   @id @default(uuid())
  organizationId  String
  userId          String
  action          String
  resource        String
  resourceId      String?
  metadata        Json?
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime @default(now())
  
  @@index([organizationId, createdAt])
}
```

### 2. Tenant Metrics

Track per-tenant:
- API request count
- Storage usage
- AI token consumption
- Active users
- Error rates

---

## Best Practices

1. ✅ **Always filter by organizationId** in queries
2. ✅ **Use tenant context middleware** on all routes
3. ✅ **Validate tenant ownership** before operations
4. ✅ **Use decorators** for cleaner code
5. ✅ **Test cross-tenant isolation** thoroughly
6. ✅ **Monitor tenant-specific metrics**
7. ✅ **Document tenant-scoped APIs** clearly
8. ❌ **Never trust client-provided tenant IDs**
9. ❌ **Never expose tenant IDs** in public URLs
10. ❌ **Never skip tenant validation** for "convenience"

---

## Conclusion

The multi-tenant architecture ensures:
- **Data Isolation**: No tenant can access another's data
- **Scalability**: Shared infrastructure reduces costs
- **Flexibility**: Easy to onboard new tenants
- **Security**: Multiple layers of tenant validation
- **Performance**: Optimized with proper indexing

All developers MUST follow these guidelines to maintain data integrity and security.
