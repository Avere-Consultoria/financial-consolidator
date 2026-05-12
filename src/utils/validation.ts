import { ConsolidatorError } from '../types';

/**
 * Remove formatação, valida comprimento (11 = CPF, 14 = CNPJ) e retorna só dígitos.
 * Lança ConsolidatorError 400 se inválido.
 */
export function parseCpfCnpj(value: string, fieldName = 'cpfCnpj'): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length !== 11 && digits.length !== 14) {
    throw new ConsolidatorError(
      'INVALID_CPF_CNPJ',
      `${fieldName} inválido: CPF deve ter 11 dígitos e CNPJ 14 dígitos (recebido: ${digits.length})`,
      undefined,
      400
    );
  }

  return digits;
}
