import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { getBtgToken } from './auth';
import { UnifiedPosition, UnifiedAsset, AssetClass, ConsolidatorError } from '../../types';
import { logger } from '../../utils/logger';

const BASE_URL = process.env.BTG_POSITION_BASE_URL ?? 'https://api.btgpactual.com/iaas-api-position';

// ─────────────────────────────────────────────────────────────────────────────
// Busca a posição completa de uma conta no BTG
// GET /api/v1/position/{accountNumber}
// Síncrona | 120 req/min | Janela D0
// ─────────────────────────────────────────────────────────────────────────────

export async function getBtgPosition(accountNumber: string): Promise<UnifiedPosition> {
  const token = await getBtgToken();

  try {
    logger.info(`BTG: buscando posição da conta ${accountNumber}`);

    const response = await axios.get(
      `${BASE_URL}/api/v1/position/${accountNumber}`,
      {
        headers: {
          access_token: token,
          'x-id-partner-request': uuidv4(),
        },
      }
    );

    const raw = response.data;
    return mapBtgPosition(raw, accountNumber);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error(`BTG: erro ao buscar posição`, { accountNumber, status, data });

    if (status === 401) {
      throw new ConsolidatorError('BTG_UNAUTHORIZED', 'Token BTG inválido ou expirado', 'BTG', 401);
    }
    if (status === 404) {
      throw new ConsolidatorError('BTG_ACCOUNT_NOT_FOUND', `Conta ${accountNumber} não encontrada no BTG`, 'BTG', 404);
    }

    throw new ConsolidatorError(
      'BTG_POSITION_ERROR',
      `Erro ao buscar posição BTG: ${data?.errors?.[0]?.message ?? err.message}`,
      'BTG',
      status ?? 502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: BTG PositionData → UnifiedPosition
// ─────────────────────────────────────────────────────────────────────────────

function mapBtgPosition(raw: any, accountNumber: string): UnifiedPosition {
  const assets: UnifiedAsset[] = [];

  // ── Renda Fixa ──────────────────────────────────────────────────────────────
  for (const item of raw.FixedIncome ?? []) {
    assets.push({
      assetClass: 'FIXED_INCOME',
      name: item.AccountingGroupCode ?? item.Ticker ?? 'Renda Fixa',
      ticker: item.Ticker,
      securityCode: item.SecurityCode,
      quantity: parseFloat(item.Quantity ?? '0'),
      marketPrice: parseFloat(item.Price ?? '0'),
      grossValue: parseFloat(item.GrossValue ?? '0'),
      netValue: parseFloat(item.NetValue ?? '0'),
      incomeTax: parseFloat(item.IncomeTax ?? '0'),
      maturityDate: item.MaturityDate,
      benchMark: item.ReferenceIndexName,
      indexRate: item.ReferenceIndexValue,
      isLiquidity: item.IsLiquidity === 'true',
      extra: {
        // ── Identificação ─────────────────────────────────────────────────
        issuer: item.Issuer,
        isin: item.ISIN,
        cetipCode: item.CetipCode,
        selicCode: item.SelicCode ?? null,
        securityCode: item.SecurityCode ?? null,
        issuerCgeCode: item.IssuerCGECode ?? null,

        // ── Características do título ─────────────────────────────────────
        issueDate: item.IssueDate ?? null,
        issuerType: item.IssuerType ?? null,       // "Titulo Privado", etc.
        taxFree: item.TaxFree === 'true',           // LCI, LCA, CRA, CRI, DEB incentivadas
        isRepo: item.IsRepo === 'true',
        yieldAvg: item.YieldAvg != null ? parseFloat(item.YieldAvg) : null,
        iofTax: item.IOFTax != null ? parseFloat(item.IOFTax) : null,
        priceIncomeTax: item.PriceIncomeTax != null ? parseFloat(item.PriceIncomeTax) : null,
        priceVirtualIOF: item.PriceVirtualIOF != null ? parseFloat(item.PriceVirtualIOF) : null,

        // ── Aquisições (lotes de compra) ──────────────────────────────────
        acquisitions: (item.Acquisitions ?? []).map((acq: any) => ({
          acquisitionDate: acq.AcquisitionDate ?? null,
          quantity: acq.AcquisitionQuantity != null ? parseFloat(acq.AcquisitionQuantity) : null,
          costPrice: acq.CostPrice != null ? parseFloat(acq.CostPrice) : null,
          initialInvestmentValue: acq.InitialInvestmentValue != null ? parseFloat(acq.InitialInvestmentValue) : null,
          initialInvestmentQuantity: acq.InitialInvestmentQuantity != null ? parseFloat(acq.InitialInvestmentQuantity) : null,
          grossValue: acq.GrossValue != null ? parseFloat(acq.GrossValue) : null,
          netValue: acq.NetValue != null ? parseFloat(acq.NetValue) : null,
          incomeTax: acq.IncomeTax != null ? parseFloat(acq.IncomeTax) : null,
          iofTax: acq.IOFTax != null ? parseFloat(acq.IOFTax) : null,
          yieldToMaturity: acq.YieldToMaturity != null ? parseFloat(acq.YieldToMaturity) : null,
          indexYieldRate: acq.IndexYieldRate ?? null,
          ftsId: acq.FTSId ?? null,
          transferId: acq.TransferId ?? null,
          interfaceDate: acq.InterfaceDate ?? null,
          isVirtual: acq.IsVirtual === 'true',
        })),

        // ── Janelas de liquidez antecipada ────────────────────────────────
        earlyTerminationSchedules: (item.DebtEarlyTerminationSchedules ?? []).map((sched: any) => ({
          type: sched.Type ?? null,                 // "NO", "YES", etc.
          indexRateMultiplier: sched.IndexRateMultiplier != null ? parseFloat(sched.IndexRateMultiplier) : null,
          rate: sched.Rate != null ? parseFloat(sched.Rate) : null,
          fromDate: sched.EarlyTerminationPeriod?.FromDateTime ?? null,
          toDate: sched.EarlyTerminationPeriod?.ToDateTime ?? null,
        })),
      },
    });
  }

  // ── Fundos de Investimento ──────────────────────────────────────────────────
  for (const item of raw.InvestmentFund ?? []) {
    assets.push({
      assetClass: 'INVESTMENT_FUND',
      name: item.Fund?.FundName ?? 'Fundo',
      securityCode: item.Fund?.SecurityCode,
      quantity: parseFloat(item.ShareValue ?? '0'),
      grossValue: parseFloat(item.Acquisition?.[0]?.GrossAssetValue ?? '0'),
      netValue: parseFloat(item.Acquisition?.[0]?.NetAssetValue ?? '0'),
      acquisitionDate: item.Acquisition?.[0]?.AcquisitionDate,
      benchMark: item.Fund?.BenchMark,
      extra: {
        manager: item.Fund?.ManagerName,
        fundLiquidity: item.Fund?.FundLiquidity,
        cnpj: item.Fund?.FundCNPJCode,
      },
    });
  }

  // ── Ações (StockPositions) ──────────────────────────────────────────────────
  for (const eq of raw.Equities ?? []) {
    for (const item of eq.StockPositions ?? []) {
      assets.push({
        assetClass: 'EQUITIES',
        name: item.Description ?? item.Ticker,
        ticker: item.Ticker,
        securityCode: item.SecurityCode,
        quantity: parseFloat(item.Quantity ?? '0'),
        marketPrice: parseFloat(item.MarketPrice ?? '0'),
        grossValue: parseFloat(item.GrossValue ?? '0'),
        costPrice: parseFloat(item.CostPrice ?? '0'),
        extra: {
          isFII: item.IsFII,
          sector: item.SectorDescription,
          isin: item.ISINCode,
        },
      });
    }

    // ── Opções ────────────────────────────────────────────────────────────────
    for (const item of eq.OptionPositions ?? []) {
      assets.push({
        assetClass: 'DERIVATIVE',
        name: `Opção ${item.OptionType} - ${item.Ticker}`,
        ticker: item.Ticker,
        securityCode: item.SecurityCode,
        quantity: parseFloat(item.Quantity ?? '0'),
        grossValue: parseFloat(item.TotalValue ?? '0'),
        maturityDate: item.MaturityDate,
        extra: {
          buySell: item.BuySell,
          strikePrice: item.StrikePrice,
          optionType: item.OptionType,
        },
      });
    }
  }

  // ── Derivativos ─────────────────────────────────────────────────────────────
  for (const deriv of raw.Derivative ?? []) {
    for (const item of deriv.SwapPosition ?? []) {
      assets.push({
        assetClass: 'DERIVATIVE',
        name: `Swap - ${item.IndexAsset}/${item.IndexLiability}`,
        grossValue: parseFloat(item.TotalValue ?? '0'),
        maturityDate: item.MaturityDate,
        extra: { swapCode: item.SwapCode },
      });
    }
    for (const item of deriv.NDFPosition ?? []) {
      assets.push({
        assetClass: 'DERIVATIVE',
        name: `NDF - ${item.ReferencedSecurity}`,
        grossValue: parseFloat(item.GrossValue ?? '0'),
        maturityDate: item.MaturityDate,
        extra: { ndfCode: item.NDFCode, buySell: item.BuySell },
      });
    }
  }

  // ── Previdência ─────────────────────────────────────────────────────────────
  for (const item of raw.PensionInformations ?? []) {
    assets.push({
      assetClass: 'PENSION',
      name: `${item.FundType} - ${item.CertificateName}`,
      grossValue: parseFloat(item.GrossValue ?? '0'),
      netValue: parseFloat(item.NetValue ?? '0'),
      acquisitionDate: item.StartDate,
      extra: { taxRegime: item.TaxRegime, incomeType: item.IncomeType },
    });
  }

  // ── Crypto ──────────────────────────────────────────────────────────────────
  for (const item of raw.CryptoCoins ?? []) {
    assets.push({
      assetClass: 'CRYPTO',
      name: item.asset?.name ?? 'Crypto',
      quantity: parseFloat(item.quantity ?? '0'),
      marketPrice: parseFloat(item.marketPrice ?? '0'),
      grossValue: parseFloat(item.grossFinancial ?? '0'),
      netValue: parseFloat(item.financial ?? '0'),
      extra: { type: item.asset?.type },
    });
  }

  // ── Caixa ───────────────────────────────────────────────────────────────────
  for (const cashItem of raw.Cash ?? []) {
    if (cashItem.CurrentAccount?.Value) {
      assets.push({
        assetClass: 'CASH',
        name: 'Conta Corrente',
        grossValue: parseFloat(cashItem.CurrentAccount.Value),
        netValue: parseFloat(cashItem.CurrentAccount.Value),
      });
    }
  }

  // ── Commodity ───────────────────────────────────────────────────────────────
  for (const item of raw.Commodity ?? []) {
    assets.push({
      assetClass: 'COMMODITY',
      name: item.Ticker ?? 'Commodity',
      ticker: item.Ticker,
      quantity: parseFloat(item.Quantity ?? '0'),
      marketPrice: parseFloat(item.MarketPrice ?? '0'),
      grossValue: parseFloat(item.MarketValue ?? '0'),
    });
  }

  const totalAmount = parseFloat(raw.TotalAmount ?? '0');

  return {
    institution: 'BTG',
    accountNumber,
    positionDate: raw.PositionDate ?? new Date().toISOString(),
    totalAmount,
    currency: 'BRL',
    assets,
    rawMeta: {
      source: 'BTG IaaS API v1',
      fetchedAt: new Date().toISOString(),
    },
  };
}