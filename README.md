# Financial Consolidator

Backend consolidador de APIs bancárias em **Node.js + TypeScript**.
Integra **BTG Pactual (IaaS)** e **XP Inc. (Data Access)** em uma API unificada.

---

## Arquitetura

```
[BTG IaaS]       ──┐
[XP Data Access] ──┤──► [Financial Consolidator] ──► [Seus Sistemas]
[Outros bancos]  ──┘    (API REST unificada)          (Next.js, etc.)
```

---

## Endpoints Disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check |
| GET | `/api/v1/position/btg/:accountNumber` | Posição BTG de uma conta |
| GET | `/api/v1/position/xp/:accountNumber` | Posição XP de uma conta |
| GET | `/api/v1/position/consolidated/:accountNumber` | Posição consolidada (BTG + XP) |
| GET | `/api/v1/position/cache/stats` | Estatísticas do cache |
| DELETE | `/api/v1/position/cache` | Limpa o cache |

### Query params — Consolidated

```
GET /api/v1/position/consolidated/001234567?institutions=BTG,XP
```

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Certificado XP (mTLS)

```bash
mkdir -p certs
# Coloque seus arquivos:
# certs/xp-certificado.crt
# certs/xp-chave-privada.key
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

### 5. Build para produção

```bash
npm run build
npm start
```

---

## Formato de Resposta Unificada

### Posição por Instituição

```json
{
  "success": true,
  "data": {
    "institution": "BTG",
    "accountNumber": "001234567",
    "positionDate": "2025-03-27T00:00:00Z",
    "totalAmount": 150000.00,
    "currency": "BRL",
    "assets": [
      {
        "assetClass": "FIXED_INCOME",
        "name": "TESOURO DIRETO - NTNB-P",
        "ticker": "NTNB-P",
        "grossValue": 50000.00,
        "netValue": 48500.00,
        "maturityDate": "2035-05-15T00:00:00Z",
        "benchMark": "IPCA"
      },
      {
        "assetClass": "EQUITIES",
        "name": "PETRORIO ON NM",
        "ticker": "PRIO3",
        "quantity": 100,
        "marketPrice": 45.20,
        "grossValue": 4520.00
      }
    ]
  },
  "meta": { "fetchedAt": "2025-03-27T10:00:00Z" }
}
```

### Posição Consolidada

```json
{
  "success": true,
  "data": {
    "accountNumber": "001234567",
    "consolidatedAt": "2025-03-27T10:00:00Z",
    "totalAmount": 300000.00,
    "currency": "BRL",
    "byInstitution": [
      { "institution": "BTG", "totalAmount": 150000.00, "positionDate": "..." },
      { "institution": "XP",  "totalAmount": 150000.00, "positionDate": "..." }
    ],
    "byAssetClass": [
      { "assetClass": "FIXED_INCOME", "totalAmount": 180000.00, "percentage": 60.0 },
      { "assetClass": "EQUITIES",     "totalAmount": 90000.00,  "percentage": 30.0 },
      { "assetClass": "CASH",         "totalAmount": 30000.00,  "percentage": 10.0 }
    ],
    "positions": [ ...posições completas de cada instituição... ]
  }
}
```

### Erro

```json
{
  "success": false,
  "error": {
    "code": "BTG_ACCOUNT_NOT_FOUND",
    "message": "Conta 001234567 não encontrada no BTG",
    "institution": "BTG"
  }
}
```

---

## Classes de Ativos (AssetClass)

| Valor | Descrição |
|-------|-----------|
| `FIXED_INCOME` | Renda fixa (CDB, LCI, LCA, Tesouro, etc.) |
| `EQUITIES` | Renda variável (Ações, FIIs, BDRs) |
| `INVESTMENT_FUND` | Fundos de investimento |
| `PENSION` | Previdência privada (PGBL, VGBL) |
| `CRYPTO` | Criptomoedas |
| `DERIVATIVE` | Derivativos (Opções, Swap, NDF, Futuros) |
| `COMMODITY` | Commodities |
| `CASH` | Caixa e conta corrente |
| `OTHER` | Outros |

---

## Cache

- TTL padrão: **5 minutos** (configurável via `CACHE_TTL_SECONDS`)
- Cache em memória por padrão (`node-cache`)
- Para produção com múltiplas instâncias: substituir por **Redis**

---

## Adicionar Nova Instituição

1. Criar pasta `src/connectors/{instituição}/`
2. Implementar `auth.ts` e `position.ts` seguindo o mesmo padrão
3. Adicionar o tipo em `Institution` (`src/types/index.ts`)
4. Registrar no `positionService.ts` no switch de `getPositionByInstitution`
5. Adicionar variáveis de ambiente no `.env.example`

---

## Próximos Passos Sugeridos

- [ ] Adicionar autenticação na API do consolidador (JWT / API Key)
- [ ] Redis para cache distribuído (múltiplas instâncias)
- [ ] Endpoint de rentabilidade (BTG) + custódia (XP)
- [ ] Suporte a webhooks do BTG (posição assíncrona)
- [ ] Logs estruturados + APM (Datadog, New Relic)
- [ ] Docker + docker-compose
- [ ] Testes unitários (Jest)
