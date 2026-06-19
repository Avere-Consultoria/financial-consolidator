import { mapXpPosition } from '../connectors/xp/position';
import { mapBtgPosition } from '../connectors/btg/position';
import { mapAgoraBundle } from '../connectors/agora/detailedPosition';
import { mapAvenueToUnifiedPosition } from '../connectors/avenue/mapper';
import { UnifiedPosition, Institution, ConsolidatorError } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Transform Service — replay do mapeamento do connector a partir do payload CRU
// já arquivado (posicao_raw), SEM tocar na corretora.
//
// É o motor do reprocesso de canônicos: a edge reprocessar-canonicos lê o payload
// guardado e chama /transform, que devolve o UnifiedPosition re-mapeado com a
// lógica ATUAL do connector. Assim, conserto de mapeamento se reaplica ao que já
// entrou, sem gastar a janela de chamada (ex.: XP).
//
// Cada instituição tem um shape de payload próprio:
//   XP/BTG → resposta inteira da API.
//   AGORA  → bundle { equities, fixedIncome, treasuryDirect, funds, ... } (multi-call).
//   AVENUE → { items, targetDate } (o mapper precisa da data de referência).
// (AVENUE também é reprocessável item-a-item direto na edge; o /transform existe
//  por completude/diagnóstico.)
// ─────────────────────────────────────────────────────────────────────────────

export function transformPayload(
  institution: Institution,
  accountNumber: string,
  payload: any,
): UnifiedPosition {
  switch (institution) {
    case 'XP':
      return mapXpPosition(payload, accountNumber);
    case 'BTG':
      return mapBtgPosition(payload, accountNumber);
    case 'AGORA':
      return mapAgoraBundle(payload, accountNumber);
    case 'AVENUE':
      return mapAvenueToUnifiedPosition(accountNumber, payload?.items ?? [], payload?.targetDate ?? '');
    default:
      throw new ConsolidatorError(
        'TRANSFORM_UNSUPPORTED',
        `Replay/transform ainda não suportado para ${institution}`,
        institution,
        400,
      );
  }
}
