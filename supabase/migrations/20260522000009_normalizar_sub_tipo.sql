-- ═══════════════════════════════════════════════════════════════════════════
-- Normalização de sub_tipo para siglas padrão (BTG-style)
--
-- Atualiza dados existentes em:
--   - ativos_canonicos.sub_tipo_canonico
--   - posicao_btg_ativos.sub_tipo
--   - posicao_xp_ativos.sub_tipo
--   - posicao_agora_ativos.sub_tipo
--   - posicao_avenue_ativos.sub_tipo (passa o map mas Avenue tem productType próprio)
--
-- Mesma lógica do helper TS _shared/normalizarSubTipo.ts.
-- Entradas não mapeadas permanecem como estão (passthrough).
-- ═══════════════════════════════════════════════════════════════════════════


-- Mapping CTE — pode ser reusado entre os UPDATEs
WITH mapping(de, para) AS (VALUES
    ('CERTIFICADO DE DEPOSITO BANCARIO',           'CDB'),
    ('CERTIFICADO DE DEPÓSITO BANCÁRIO',           'CDB'),
    ('LETRA FINANCEIRA',                            'LF'),
    ('LETRA FINANCEIRA SUBORDINADA',                'LF'),
    ('LETRA DE CREDITO IMOBILIARIO',                'LCI'),
    ('LETRA DE CRÉDITO IMOBILIÁRIO',                'LCI'),
    ('LETRA DE CREDITO DO AGRONEGOCIO',             'LCA'),
    ('LETRA DE CRÉDITO DO AGRONEGÓCIO',             'LCA'),
    ('CERTIFICADO DE RECEBIVEIS DO AGRONEGOCIO',    'CRA'),
    ('CERTIFICADO DE RECEBÍVEIS DO AGRONEGÓCIO',    'CRA'),
    ('CERTIFICADO DE RECEBIVEIS IMOBILIARIOS',      'CRI'),
    ('CERTIFICADO DE RECEBÍVEIS IMOBILIÁRIOS',      'CRI'),
    ('DEBENTURE',                                   'DEB'),
    ('DEBÊNTURE',                                   'DEB'),
    ('DEBENTURES',                                  'DEB'),
    ('DEBÊNTURES',                                  'DEB'),
    ('NTN-B',                                       'NTNB'),
    ('NTN-B PRINC',                                 'NTNB'),
    ('NTN-B PRINCIPAL',                             'NTNB'),
    ('NTN-B COM JUROS SEMESTRAL',                   'NTNB'),
    ('NTN-F',                                       'NTNF'),
    ('NTN-F COM JUROS SEMESTRAL',                   'NTNF'),
    ('NTN-C',                                       'NTNC'),
    ('TESOURO PREFIXADO',                           'LTN'),
    ('TESOURO SELIC',                               'LFT'),
    ('TESOURO IPCA',                                'NTNB'),
    ('TESOURO IPCA+',                               'NTNB')
)
-- (CTE precisa pertencer a uma statement; usamos no primeiro UPDATE abaixo)
UPDATE ativos_canonicos a
SET sub_tipo_canonico = m.para
FROM mapping m
WHERE upper(trim(a.sub_tipo_canonico)) = m.de;


UPDATE posicao_btg_ativos a
SET sub_tipo = m.para
FROM (VALUES
    ('CERTIFICADO DE DEPOSITO BANCARIO',           'CDB'),
    ('CERTIFICADO DE DEPÓSITO BANCÁRIO',           'CDB'),
    ('LETRA FINANCEIRA',                            'LF'),
    ('LETRA FINANCEIRA SUBORDINADA',                'LF'),
    ('LETRA DE CREDITO IMOBILIARIO',                'LCI'),
    ('LETRA DE CRÉDITO IMOBILIÁRIO',                'LCI'),
    ('LETRA DE CREDITO DO AGRONEGOCIO',             'LCA'),
    ('LETRA DE CRÉDITO DO AGRONEGÓCIO',             'LCA'),
    ('CERTIFICADO DE RECEBIVEIS DO AGRONEGOCIO',    'CRA'),
    ('CERTIFICADO DE RECEBÍVEIS DO AGRONEGÓCIO',    'CRA'),
    ('CERTIFICADO DE RECEBIVEIS IMOBILIARIOS',      'CRI'),
    ('CERTIFICADO DE RECEBÍVEIS IMOBILIÁRIOS',      'CRI'),
    ('DEBENTURE',                                   'DEB'),
    ('DEBÊNTURE',                                   'DEB'),
    ('DEBENTURES',                                  'DEB'),
    ('DEBÊNTURES',                                  'DEB'),
    ('NTN-B',                                       'NTNB'),
    ('NTN-B PRINC',                                 'NTNB'),
    ('NTN-B PRINCIPAL',                             'NTNB'),
    ('NTN-B COM JUROS SEMESTRAL',                   'NTNB'),
    ('NTN-F',                                       'NTNF'),
    ('NTN-F COM JUROS SEMESTRAL',                   'NTNF'),
    ('NTN-C',                                       'NTNC'),
    ('TESOURO PREFIXADO',                           'LTN'),
    ('TESOURO SELIC',                               'LFT'),
    ('TESOURO IPCA',                                'NTNB'),
    ('TESOURO IPCA+',                               'NTNB')
) AS m(de, para)
WHERE upper(trim(a.sub_tipo)) = m.de;


UPDATE posicao_xp_ativos a
SET sub_tipo = m.para
FROM (VALUES
    ('CERTIFICADO DE DEPOSITO BANCARIO',           'CDB'),
    ('CERTIFICADO DE DEPÓSITO BANCÁRIO',           'CDB'),
    ('LETRA FINANCEIRA',                            'LF'),
    ('LETRA FINANCEIRA SUBORDINADA',                'LF'),
    ('LETRA DE CREDITO IMOBILIARIO',                'LCI'),
    ('LETRA DE CRÉDITO IMOBILIÁRIO',                'LCI'),
    ('LETRA DE CREDITO DO AGRONEGOCIO',             'LCA'),
    ('LETRA DE CRÉDITO DO AGRONEGÓCIO',             'LCA'),
    ('CERTIFICADO DE RECEBIVEIS DO AGRONEGOCIO',    'CRA'),
    ('CERTIFICADO DE RECEBÍVEIS DO AGRONEGÓCIO',    'CRA'),
    ('CERTIFICADO DE RECEBIVEIS IMOBILIARIOS',      'CRI'),
    ('CERTIFICADO DE RECEBÍVEIS IMOBILIÁRIOS',      'CRI'),
    ('DEBENTURE',                                   'DEB'),
    ('DEBÊNTURE',                                   'DEB'),
    ('DEBENTURES',                                  'DEB'),
    ('DEBÊNTURES',                                  'DEB'),
    ('NTN-B',                                       'NTNB'),
    ('NTN-B PRINC',                                 'NTNB'),
    ('NTN-B PRINCIPAL',                             'NTNB'),
    ('NTN-B COM JUROS SEMESTRAL',                   'NTNB'),
    ('NTN-F',                                       'NTNF'),
    ('NTN-F COM JUROS SEMESTRAL',                   'NTNF'),
    ('NTN-C',                                       'NTNC'),
    ('TESOURO PREFIXADO',                           'LTN'),
    ('TESOURO SELIC',                               'LFT'),
    ('TESOURO IPCA',                                'NTNB'),
    ('TESOURO IPCA+',                               'NTNB')
) AS m(de, para)
WHERE upper(trim(a.sub_tipo)) = m.de;


UPDATE posicao_agora_ativos a
SET sub_tipo = m.para
FROM (VALUES
    ('CERTIFICADO DE DEPOSITO BANCARIO',           'CDB'),
    ('CERTIFICADO DE DEPÓSITO BANCÁRIO',           'CDB'),
    ('LETRA FINANCEIRA',                            'LF'),
    ('LETRA FINANCEIRA SUBORDINADA',                'LF'),
    ('LETRA DE CREDITO IMOBILIARIO',                'LCI'),
    ('LETRA DE CRÉDITO IMOBILIÁRIO',                'LCI'),
    ('LETRA DE CREDITO DO AGRONEGOCIO',             'LCA'),
    ('LETRA DE CRÉDITO DO AGRONEGÓCIO',             'LCA'),
    ('CERTIFICADO DE RECEBIVEIS DO AGRONEGOCIO',    'CRA'),
    ('CERTIFICADO DE RECEBÍVEIS DO AGRONEGÓCIO',    'CRA'),
    ('CERTIFICADO DE RECEBIVEIS IMOBILIARIOS',      'CRI'),
    ('CERTIFICADO DE RECEBÍVEIS IMOBILIÁRIOS',      'CRI'),
    ('DEBENTURE',                                   'DEB'),
    ('DEBÊNTURE',                                   'DEB'),
    ('DEBENTURES',                                  'DEB'),
    ('DEBÊNTURES',                                  'DEB'),
    ('NTN-B',                                       'NTNB'),
    ('NTN-B PRINC',                                 'NTNB'),
    ('NTN-B PRINCIPAL',                             'NTNB'),
    ('NTN-B COM JUROS SEMESTRAL',                   'NTNB'),
    ('NTN-F',                                       'NTNF'),
    ('NTN-F COM JUROS SEMESTRAL',                   'NTNF'),
    ('NTN-C',                                       'NTNC'),
    ('TESOURO PREFIXADO',                           'LTN'),
    ('TESOURO SELIC',                               'LFT'),
    ('TESOURO IPCA',                                'NTNB'),
    ('TESOURO IPCA+',                               'NTNB')
) AS m(de, para)
WHERE upper(trim(a.sub_tipo)) = m.de;


-- Verificação pós-rodada
-- SELECT DISTINCT sub_tipo FROM posicao_agora_ativos ORDER BY sub_tipo;
-- SELECT DISTINCT sub_tipo_canonico FROM ativos_canonicos ORDER BY sub_tipo_canonico;
