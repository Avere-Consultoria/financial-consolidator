# Edge Functions — Financial Consolidator

## Estrutura

```
supabase/
└── functions/
    ├── get-btg-position/
    │   └── index.ts        ← busca posição BTG + salva no banco
    └── get-consolidated-position/
        └── index.ts        ← consolida BTG + XP
```

## Como fazer deploy

```powershell
# Na pasta C:\0_Avere\financial-consolidator

# Deploy da função BTG
supabase functions deploy get-btg-position --no-verify-jwt

# Deploy da função consolidada
supabase functions deploy get-consolidated-position --no-verify-jwt
```

## Variáveis de ambiente necessárias

Configure no Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| Variável | Valor |
|----------|-------|
| `CONSOLIDATOR_URL` | URL do seu backend consolidador em produção |

Em desenvolvimento o valor padrão é `http://localhost:3333`.

## Como o front chama as funções

```typescript
import { supabase } from './services/supabase'

// Buscar posição BTG
const { data, error } = await supabase.functions.invoke('get-btg-position', {
  body: { account: '008170324' }
})

// Buscar posição consolidada
const { data, error } = await supabase.functions.invoke('get-consolidated-position', {
  body: { cliente_id: 'uuid-do-cliente', institutions: 'BTG,XP' }
})
```
