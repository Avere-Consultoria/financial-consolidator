import { mapXpPosition } from '../connectors/xp/position';
import { UnifiedPosition, Institution, ConsolidatorError } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Transform Service — replay do mapeamento do connector a partir do payload CRU
// já arquivado (posicao_raw), SEM tocar na corretora.
//
// É o motor do reprocesso de canônicos: a edge reprocessar-canonicos lê o payload
// guardado e chama /transform, que devolve o UnifiedPosition re-mapeado com a
// lógica ATUAL do connector. Assim, conserto de mapeamento se reaplica ao que já
// entrou, sem gastar a janela de chamada (ex.: XP).
// ─────────────────────────────────────────────────────────────────────────────

export function transformPayload(
  institution: Institution,
  accountNumber: string,
  payload: any,
): UnifiedPosition {
  switch (institution) {
    case 'XP':
      return mapXpPosition(payload, accountNumber);
    // BTG / AGORA / AVENUE: habilitar conforme os mappers forem exportados.
    default:
      throw new ConsolidatorError(
        'TRANSFORM_UNSUPPORTED',
        `Replay/transform ainda não suportado para ${institution}`,
        institution,
        400,
      );
  }
}
