/**
 * Converte string camelCase para snake_case
 */
export function camelToSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Converte recursivamente as chaves de um objeto para snake_case.
 * Preserva arrays, datas e valores primitivos.
 * Suporta instâncias Sequelize (usa toJSON).
 */
export function toSnakeCaseKeys<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (
    typeof obj === 'object' &&
    'toJSON' in obj &&
    typeof (obj as { toJSON: () => unknown }).toJSON === 'function'
  ) {
    return toSnakeCaseKeys((obj as { toJSON: () => unknown }).toJSON()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => toSnakeCaseKeys(item)) as T;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        camelToSnake(key),
        toSnakeCaseKeys(value),
      ]),
    ) as T;
  }

  return obj;
}
