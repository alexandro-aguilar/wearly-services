export default class Environment {
  static readonly AWS_REGION = process.env.AWS_REGION || 'us-east-1';
  static readonly STAGE = process.env.STAGE || 'local';
  static readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  static readonly POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME || 'dnd-core';
  static readonly POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL || 'INFO';
  static readonly PROJECT_NAME = process.env.PROJECT_NAME || 'DnD';

  static readonly DB_HOST = process.env.DB_HOST || 'postgres_dnd-core_db';
  static readonly DB_PORT = process.env.DB_PORT || '5432';
  static readonly DB_USER = process.env.DB_USER || 'postgres';
  static readonly DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  static readonly DB_NAME = process.env.DB_NAME || 'dnd-core';
  // Initialize LocalStack-specific settings
  static {
    if (Environment.STAGE === 'local') {
      // Disable TLS verification for LocalStack
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }
}
