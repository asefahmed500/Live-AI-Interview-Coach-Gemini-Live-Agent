import { plainToInstance, ClassTransformOptions } from 'class-transformer';
import { validateSync, ValidationError, IsString, IsInt, IsOptional, IsIn, IsNotEmpty, Min, Max, Matches, MinLength } from 'class-validator';

class EnvironmentVariables {
  // =====================
  // Application
  // =====================
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test';

  @IsOptional()
  @IsString()
  APP_VERSION?: string;

  @IsOptional()
  @IsInt()
  @Min(1024)
  @Max(65535)
  PORT?: number; // Cloud Run sets this automatically

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsString()
  K_SERVICE?: string; // Cloud Run service name

  @IsOptional()
  @IsString()
  K_REVISION?: string; // Cloud Run revision

  @IsOptional()
  @IsString()
  K_CONFIGURATION?: string; // Cloud Run configuration

  // =====================
  // Database (MongoDB Atlas)
  // =====================
  @IsString()
  @IsNotEmpty()
  @Matches(/^mongodb(\+srv)?:\/\//, { message: 'MONGODB_URI must be a valid MongoDB connection string' })
  MONGODB_URI: string;

  @IsOptional()
  @IsString()
  MONGODB_DB_NAME?: string; // Optional, defaults to URI database

  // =====================
  // Gemini / Vertex AI
  // =====================
  @IsOptional()
  @IsString()
  @Matches(/^AIza[A-Za-z0-9_-]{35}$/, { message: 'Invalid Gemini API key format' })
  GEMINI_API_KEY?: string;

  @IsOptional()
  @IsString()
  @Matches(/^projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+$/, {
    message: 'VERTEX_AI_LOCATION must be in format: projects/{project}/locations/{location}'
  })
  VERTEX_AI_LOCATION?: string;

  @IsOptional()
  @IsString()
  VERTEX_AI_MODEL?: string;

  // =====================
  // Security
  // =====================
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRATION?: string;

  // =====================
  // CORS
  // =====================
  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS: string; // Comma-separated list of URLs

  @IsOptional()
  @IsString()
  ALLOWED_ORIGINS?: string; // Alias for CORS_ORIGINS

  // =====================
  // Rate Limiting
  // =====================
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(600000)
  THROTTLE_TTL?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  THROTTLE_LIMIT?: number;

  // =====================
  // Logging
  // =====================
  @IsOptional()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug' | 'verbose';

  @IsOptional()
  @IsBoolean()
  GEMINI_ENABLE_LOGGING?: boolean;

  @IsOptional()
  @IsBoolean()
  GEMINI_ENABLE_METRICS?: boolean;

  // =====================
  // External URLs
  // =====================
  @IsOptional()
  @IsString()
  WEB_URL?: string;

  @IsOptional()
  @IsString()
  FRONTEND_URL?: string; // Alias for WEB_URL
}

// Helper decorator for boolean env vars
function IsBoolean(): PropertyDecorator {
  return function (target: Object, propertyKey: string | symbol) {
    // Boolean validation is handled in transformation
  };
}

export function validate(config: Record<string, unknown>) {
  const transformed = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  } as ClassTransformOptions);

  const errors = validateSync(transformed, {
    skipMissingProperties: false,
    whitelist: true, // Remove extra properties
    forbidNonWhitelisted: false, // Don't throw on extra properties
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error: ValidationError) => {
        const constraints = error.constraints || {};
        const messages = Object.values(constraints);
        return `${error.property}: ${messages.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Configuration validation error:\n${errorMessages}`);
  }

  // Additional production validation
  if (transformed.NODE_ENV === 'production') {
    const prodErrors: string[] = [];

    // Check JWT secret is not default
    if (transformed.JWT_SECRET?.length < 64) {
      prodErrors.push('JWT_SECRET must be at least 64 characters in production');
    }

    // Check MongoDB URI is not localhost
    if (transformed.MONGODB_URI?.includes('localhost') || transformed.MONGODB_URI?.includes('127.0.0.1')) {
      prodErrors.push('MONGODB_URI cannot use localhost in production');
    }

    if (prodErrors.length > 0) {
      throw new Error(`Production configuration validation error:\n${prodErrors.join('\n')}`);
    }
  }

  return transformed;
}

/**
 * Get MongoDB connection options based on environment
 */
export function getMongoOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Connection pool settings for Cloud Run
    maxPoolSize: isProduction ? 50 : 10,
    minPoolSize: isProduction ? 10 : 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,

    // Retry settings
    retryWrites: true,
    retryReads: true,

    // TLS for Atlas
    tls: true,
    tlsAllowInvalidCertificates: false,

    // Serverless optimization
    autoIndex: !isProduction, // Don't auto-create indexes in production
  };
}

/**
 * Get CORS origins from environment
 */
export function getCorsOrigins(): string[] {
  const corsOrigins = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS || '';

  return corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
}

