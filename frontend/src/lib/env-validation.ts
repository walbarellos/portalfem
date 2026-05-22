// src/lib/env-validation.ts
/**
 * Environment variables validation
 * Ensures required environment variables are present and valid at startup
 */

interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 * @returns Validation result with errors and warnings
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredVars = [
    { name: 'PUBLIC_DIRECTUS_URL', description: 'Directus API URL' },
    { name: 'PUBLIC_SITE_URL', description: 'Site URL for SEO and canonical links' }
  ];

  // Check required variables
  for (const { name, description } of requiredVars) {
    const value = import.meta.env[name];
    if (!value) {
      errors.push(`Missing required environment variable: ${name} (${description})`);
    } else if (name === 'PUBLIC_DIRECTUS_URL' || name === 'PUBLIC_SITE_URL') {
      // Validate URL format
      try {
        new URL(value);
      } catch {
        errors.push(`Invalid URL format for ${name}: ${value}`);
      }
    }
  }

  // Optional but recommended variables
  const recommendedVars = [
    { name: 'PUBLIC_GOOGLE_ANALYTICS_ID', description: 'Google Analytics tracking ID' },
    { name: 'PUBLIC_GTAG_ID', description: 'Google Tag Manager ID' }
  ];

  for (const { name, description } of recommendedVars) {
    if (!import.meta.env[name]) {
      warnings.push(`Recommended environment variable not set: ${name} (${description})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Log validation results (development only)
 * In production, consider throwing or logging to monitoring service
 */
export function logEnvironmentValidation(): void {
  const { isValid, errors, warnings } = validateEnvironment();

  if (import.meta.env.DEV) {
    if (!isValid) {
      console.error('❌ Environment Validation Failed:');
      errors.forEach(error => console.error(`  • ${error}`));
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Environment Validation Warnings:');
      warnings.forEach(warning => console.warn(`  • ${warning}`));
    }

    if (isValid && warnings.length === 0) {
      console.log('✅ Environment validation passed');
    }
  }
}

// Auto-validate in development
if (import.meta.env.DEV) {
  logEnvironmentValidation();
}
