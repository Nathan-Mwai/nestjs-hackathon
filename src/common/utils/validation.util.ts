import type { ValidationError } from 'class-validator';

export interface ValidationErrorFormat {
  property: string;
  message: string;
}

export function formatValidationErrors(
  errors: ValidationError[],
  parentProperty = '',
): ValidationErrorFormat[] {
  const result: ValidationErrorFormat[] = [];

  for (const error of errors) {
    const property = parentProperty
      ? `${parentProperty}.${error.property}`
      : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        result.push({ property, message });
      }
    }

    if (error.children && error.children.length > 0) {
      result.push(...formatValidationErrors(error.children, property));
    }
  }

  return result;
}
