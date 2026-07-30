import Ajv, { ErrorObject } from 'ajv'

export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
}

export const validateJsonSchema = (jsonInput: string, schemaInput: string): SchemaValidationResult => {
  try {
    const data = JSON.parse(jsonInput)
    const schema = JSON.parse(schemaInput)
    const ajv = new Ajv({ allErrors: true, strict: false })
    const valid = ajv.validate(schema, data)
    if (valid) return { valid: true, errors: [] }
    return {
      valid: false,
      errors: (ajv.errors ?? []).map((error: ErrorObject) => {
        const path = error.instancePath || '$'
        return `${path}: ${error.message ?? '校验失败'}`
      }),
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'JSON Schema 校验失败'],
    }
  }
}
