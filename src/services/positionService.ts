import { getBtgPosition } from '../connectors/btg/position';
import { getXpPosition } from '../connectors/xp/position';
import { getAvenuePosition } from '../connectors/avenue/position';
import { cacheService } from '../cache';
import { logger } from '../utils/logger';
import {
  UnifiedPosition,
  ConsolidatedPosition,
  AssetClass,
  ConsolidatorError,
  Institution,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Position Service
// Orquestra as chamadas ao BTG e XP, aplica cache e consolida os dados
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL = 300; // 5 minutos — respeita os limites de rate das APIs

// ── Buscar posição de uma conta em uma instituição específica ─────────────────

export async function getPositionByInstitution(
  institution: Institution,
  accountNumber: string
): Promise<UnifiedPosition> {
  const cacheKey = `position:${institution}:${accountNumber}`;
  const cached = cacheService.get<UnifiedPosition>(cacheKey);
  if (cached) return cached;

  let position: UnifiedPosition;

  switch (institution) {
    case 'BTG':
      position = await getBtgPosition(accountNumber);
      break;
    case 'XP':
      position = await getXpPosition(accountNumber);
      break;
      case 'AVENUE': // <-- Adicionado!
      position = await getAvenuePosition(accountNumber);
      break;
    default:
      throw new ConsolidatorError('UNKNOWN_INSTITUTION', `Instituição desconhecida: ${institution}`, undefined, 400);
  }

  cacheService.set(cacheKey, position, CACHE_TTL);
  return position;
}

// ── Consolidar posições de múltiplas instituições ─────────────────────────────

export async function getConsolidatedPosition(
  accountNumber: string,
  institutions: Institution[] = ['BTG', 'XP']
): Promise<ConsolidatedPosition> {
  const cacheKey = `consolidated:${institutions.join('+')}:${accountNumber}`;
  const cached = cacheService.get<ConsolidatedPosition>(cacheKey);
  if (cached) return cached;

  logger.info(`Consolidando posição para conta ${accountNumber} em: ${institutions.join(', ')}`);

  // Busca em paralelo — falhas parciais não bloqueiam o retorno
  const results = await Promise.allSettled(
    institutions.map((inst) => getPositionByInstitution(inst, accountNumber))
  );

  const positions: UnifiedPosition[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      positions.push(result.value);
    } else {
      const inst = institutions[i];
      const reason = result.reason;
      logger.warn(`Falha ao buscar posição em ${inst}`, { error: reason?.message });
      errors.push(`${inst}: ${reason?.message}`);
    }
  }

  if (positions.length === 0) {
    throw new ConsolidatorError(
      'ALL_INSTITUTIONS_FAILED',
      `Falha ao buscar posição em todas as instituições. Erros: ${errors.join('; ')}`,
      undefined,
      502
    );
  }

  const consolidated = buildConsolidated(accountNumber, positions);
  cacheService.set(cacheKey, consolidated, CACHE_TTL);

  return consolidated;
}

// ── Builder: monta o objeto consolidado ──────────────────────────────────────

function buildConsolidated(
  accountNumber: string,
  positions: UnifiedPosition[]
): ConsolidatedPosition {
  const totalAmount = positions.reduce((sum, p) => sum + p.totalAmount, 0);

  // Agrupamento por classe de ativo
  const byAssetClassMap = new Map<AssetClass, number>();
  for (const pos of positions) {
    for (const asset of pos.assets) {
      const current = byAssetClassMap.get(asset.assetClass) ?? 0;
      byAssetClassMap.set(asset.assetClass, current + asset.grossValue);
    }
  }

  const byAssetClass = Array.from(byAssetClassMap.entries())
    .map(([assetClass, amount]) => ({
      assetClass,
      totalAmount: amount,
      percentage: totalAmount > 0 ? parseFloat(((amount / totalAmount) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    accountNumber,
    consolidatedAt: new Date().toISOString(),
    totalAmount,
    currency: 'BRL',
    byInstitution: positions.map((p) => ({
      institution: p.institution,
      totalAmount: p.totalAmount,
      positionDate: p.positionDate,
    })),
    byAssetClass,
    positions,
  };
}
