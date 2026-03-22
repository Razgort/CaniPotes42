export interface CorsConfig {
  origin: string[] | false;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export function getCorsConfig(): CorsConfig {
  const origins = process.env['CORS_ORIGINS']?.split(',').map((o) => o.trim()) ?? [];

  return {
    origin: origins.length > 0 ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
}
