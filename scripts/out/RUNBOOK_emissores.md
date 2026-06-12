# Runbook — Emissores (crédito privado)

> Bancos já estão resolvidos via FGC (240 conglomerados, 298 ativos). Aqui é só o crédito privado.
> Setor 1:1 com a lista "Lei" (`setores`). cnpj_raiz fica null (crédito casa por nome/alias).
> Tudo idempotente.

---

## 0. Backup
```sql
CREATE TABLE backup_dicionario_emissores_20260621 AS SELECT * FROM dicionario_emissores;
CREATE TABLE backup_ativos_emissor_20260621 AS
  SELECT id, emissor_id FROM ativos_canonicos;
```
**Rollback do link dos ativos:**
```sql
UPDATE ativos_canonicos a SET emissor_id = b.emissor_id
  FROM backup_ativos_emissor_20260621 b WHERE a.id = b.id;
```

---

## 1. Carga
Rodar: `scripts/out/carga_emissores.sql`
(140 emissores · 72 aliases · 274 links — só preenche o que está vazio)

**Confere:**
```sql
SELECT count(*) FROM dicionario_emissores;                              -- ~151 (11 + 140)
SELECT count(*) FROM emissor_aliases;                                   -- ~72
SELECT count(*) FROM ativos_canonicos WHERE emissor_id IS NOT NULL;     -- subiu p/ ~298
-- nenhum emissor curado ficou sem setor_id:
SELECT count(*) FROM dicionario_emissores WHERE setor_id IS NULL;       -- só os 11 antigos a alinhar
```

---

## 2. (Opcional) Linkar ativos futuros / não mapeados
Rodar a Edge Function `classificar-riscos` uma vez — com os aliases no lugar, ela casa
qualquer crédito que não estava no mapa determinístico (e os bancos novos via FGC).

---

## 3. Distribuição setorial (na tela)
Home → gráfico de **Distribuição Setorial**: agora deve abrir por setor da Lei
(Agronegócio, Energia Elétrica, Imobiliário…), não mais "sem emissor".
```sql
SELECT s.nome, count(*) FROM ativos_canonicos a
  JOIN dicionario_emissores e ON e.id = a.emissor_id
  JOIN setores s ON s.id = e.setor_id
 GROUP BY s.nome ORDER BY 2 DESC;
```

---

## 4. Limpeza manual (Gestão Master → Emissores) — pequena, sem pressa
Os 11 emissores que já existiam:
- **2 são teste** → apagar: `1 - Teste novo`, `XP XYZ`.
- **9 reais sem setor_id** (Klabin, Raizen, Rumo, BR Foods, Autopista, Echoenergia,
  Grupo Light, Light Serviços, São Salvador) → atribuir o setor da Lei pela UI.
  (Não toquei neles via SQL pra não sobrescrever ajuste manual seu.)

---

## Checklist
- [ ] 0. backups criados
- [ ] 1. carga ok (emissores ~151, aliases ~72, com_emissor ~298)
- [ ] 2. (opc) classificar-riscos rodado
- [ ] 3. Distribuição Setorial abrindo por setor
- [ ] 4. 2 testes apagados + 9 reais com setor
