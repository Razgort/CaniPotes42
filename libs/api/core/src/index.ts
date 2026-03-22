// Module
export { CoreModule } from './lib/api-core.js';

// Services
export { PrismaService } from './lib/prisma.service.js';

// Guards
export { JwtAuthGuard } from './lib/guards/jwt-auth.guard.js';
export { ClubGuard } from './lib/guards/club.guard.js';
export { RolesGuard } from './lib/guards/roles.guard.js';

// Decorators
export { CurrentUser } from './lib/decorators/current-user.decorator.js';
export { CurrentClub } from './lib/decorators/current-club.decorator.js';
export { Roles, ROLES_KEY } from './lib/decorators/roles.decorator.js';

// Pipes
export { ZodValidationPipe } from './lib/pipes/zod-validation.pipe.js';

// Filters
export { AllExceptionsFilter } from './lib/filters/all-exceptions.filter.js';

// Interceptors
export { ResponseWrapperInterceptor } from './lib/interceptors/response-wrapper.interceptor.js';

// Config
export { jwtConfig, jwtConstants } from './lib/config/jwt.config.js';
export { getCorsConfig } from './lib/config/cors.config.js';

// Strategies
export { JwtStrategy } from './lib/strategies/jwt.strategy.js';
export type { JwtPayload } from './lib/strategies/jwt.strategy.js';
