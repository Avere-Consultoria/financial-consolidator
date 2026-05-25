# Edge Functions — Financial Consolidator

## Estrutura

```
supabase/
└── functions/
    ├── _shared/                ← código reutilizado entre funções
    │   ├── cors.ts             ← CORS + helpers de Response
    │   ├── dates.ts            ← parseDataFlexivel, toDateOnly, todayISO
    │   ├── assetClassMap.ts    ← mapTipoLabel, mapSubTipoPadrao
    │   ├── consolidator.ts     ← fetchConsolidator (com timeout)
    │   ├── supabaseClient.ts   ← createServiceClient
    │   ├── auth.ts             ← validarAuth, validarOwnershipCliente, exigirMaster
    │   ├── canonico.ts         ← resolverOuCriarCanonico
    │   ├── types.ts            ← UnifiedAsset, Institution, DicionarioRow
    │   └── classifyAvere.ts    ← classificação Avere + sugestão de liquidez
    ├── get-btg-position/       ← busca posição BTG + salva no banco
    ├── get-xp-position/        ← busca posição XP + salva no banco
    ├── get-avenue-position/    ← busca posição Avenue + salva no banco
    ├── get-agora-position/     ← busca posição Ágora + salva no banco
    └── invite-consultor/       ← convida usuário via Supabase Auth
```

## Como fazer deploy

⚠️ **Importante:** todas as funções agora exigem JWT válido. Não use `--no-verify-jwt`.

```powershell
# Na pasta C:\0_Avere\financial-consolidator

supabase functions deploy get-btg-position
supabase functions deploy get-xp-position
supabase functions deploy get-avenue-position
supabase functions deploy get-agora-position
supabase functions deploy invite-consultor
```

## Modelo de autorização

| Function | Quem pode chamar |
|---|---|
| `get-btg-position` | MASTER **ou** consultor responsável pelo cliente (`clientes.consultor_id = auth.uid()`) |
| `get-xp-position` | MASTER **ou** consultor responsável |
| `get-avenue-position` | MASTER **ou** consultor responsável |
| `get-agora-position` | MASTER **ou** consultor responsável |
| `invite-consultor` | Somente MASTER |

A role é lida da tabela `perfis` (coluna `role`).
- `403` se o usuário não é dono nem MASTER
- `404` se o cliente referenciado não existe
- `401` se o JWT é inválido ou ausente

## Variáveis de ambiente necessárias

Configure no Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Variável | Valor |
|----------|-------|
| `CONSOLIDATOR_URL` | URL do backend consolidador em produção |

Em desenvolvimento o valor padrão é `http://localhost:3333`.

## Como o front chama as funções

```typescript
import { supabase } from './services/supabase'

// BTG
const { data, error } = await supabase.functions.invoke('get-btg-position', {
  body: { account: '008170324' }
})

// XP
const { data, error } = await supabase.functions.invoke('get-xp-position', {
  body: { account: '412196', clientId: 'uuid-do-cliente' }
})

// Avenue
const { data, error } = await supabase.functions.invoke('get-avenue-position', {
  body: { clientId: 'uuid-do-cliente' }
})

// Ágora
const { data, error } = await supabase.functions.invoke('get-agora-position', {
  body: { cpfCnpj: '00000000000', accountCode: '000000', clientId: 'uuid-do-cliente' }
})
```
