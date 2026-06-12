-- Opção B: emissor-empresa para RV/FIIs listados (idempotente).
-- SÓ ALTA CONFIANÇA — média/sem mapa fica vazia pro Master (regra da casa).
-- ETFs ficam sem emissor (diversificados). Só preenche emissor_id vazio.

-- ── 1. Emissores-empresa (insere se novo + alinha setor pela Lei) ──
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Allos', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BB Seguridade', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BB Seguridade')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BB Seguridade'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BTG Pactual', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Agronegócio'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BTG Pactual', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BTG Pactual', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Banco Inter', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco Inter')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco Inter'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Banco do Brasil', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco do Brasil')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco do Brasil'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Bradesco', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Bradesco')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Bradesco'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'CPFL Energia', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CPFL Energia')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Energia Elétrica'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('CPFL Energia'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'CSN Mineração', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN Mineração')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Indústria'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN Mineração'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'CSU Digital', 'Tecnologia', (SELECT id FROM setores WHERE nome = 'Tecnologia')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSU Digital')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Tecnologia'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSU Digital'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Caixa Seguridade', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caixa Seguridade')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caixa Seguridade'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Casas Bahia', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Cyrela', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cyrela')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cyrela'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Embraer', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Embraer')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Indústria'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Embraer'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Energisa', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energisa')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Energia Elétrica'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energisa'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Engie Brasil', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Engie Brasil')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Energia Elétrica'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Engie Brasil'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Fleury', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Fleury')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Saúde'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Fleury'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Itaú Unibanco', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaú Unibanco')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaú Unibanco'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Itaúsa', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaúsa')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaúsa'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Kinea', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Lavvi', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lavvi')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lavvi'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Log Commercial Properties', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Log Commercial Properties')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Log Commercial Properties'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Lojas Renner', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lojas Renner')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lojas Renner'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'MRV', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Imobiliário'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Motiva', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Motiva')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Motiva'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Petrobras', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Prio', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Prio')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Prio'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Sanepar', 'Saneamento', (SELECT id FROM setores WHERE nome = 'Saneamento')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Sanepar')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Saneamento'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Sanepar'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Santander Brasil', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Santander Brasil')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Financeiro'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Santander Brasil'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Schulz', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Schulz')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Indústria'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Schulz'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Suzano', 'Papel & Celulose', (SELECT id FROM setores WHERE nome = 'Papel & Celulose')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Suzano')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Papel & Celulose'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Suzano'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Taesa', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Energia Elétrica'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Totvs', 'Tecnologia', (SELECT id FROM setores WHERE nome = 'Tecnologia')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Totvs')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Tecnologia'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Totvs'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vale', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Indústria'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vivara', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vivara')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vivara'));
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'WEG', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('WEG')));
UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, (SELECT id FROM setores WHERE nome = 'Indústria'))
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('WEG'));

-- ── 2. Linka os ativos (por id, só onde emissor_id está vazio) ──
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos')) LIMIT 1) WHERE id = '10e8772c-0c0a-4762-bf57-6c10f3759bd1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BB Seguridade')) LIMIT 1) WHERE id = 'cfdd4995-73b8-447b-a662-777302ecf70e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = '03907639-af47-4afd-a86e-8e331c3fe175' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = '35224e6a-e471-4668-bf35-f3a68a5fc3a9' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = '3ff3d487-2313-4a1d-b018-248102f37aab' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = 'a334191b-689d-4647-bb94-e064b30d1c58' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = 'c197d403-6539-430c-b1b6-b23084078c22' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = '59a6022b-1dbf-47fd-9396-9dd1eba55063' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) WHERE id = 'b0e36dbb-fc0f-4b06-ab51-18e6346763ba' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco Inter')) LIMIT 1) WHERE id = 'abf51e72-ccd4-4472-b645-de86278e951b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco do Brasil')) LIMIT 1) WHERE id = '8963d87a-1bb1-4c3e-9a7e-bcec1f06459a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Bradesco')) LIMIT 1) WHERE id = 'a13b6cb8-cb7b-40ec-89ff-9a8784f38a99' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CPFL Energia')) LIMIT 1) WHERE id = '30f6ea82-288c-43c1-88f2-45c04cd0aa28' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN Mineração')) LIMIT 1) WHERE id = '0eaa4b66-70be-4638-87be-e81c1e1c1f70' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSU Digital')) LIMIT 1) WHERE id = 'd2b0d052-9ba4-43ce-9a92-7fb9d6d454c2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caixa Seguridade')) LIMIT 1) WHERE id = '2e8eb337-323b-43e7-9c7b-63625bec8dad' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')) LIMIT 1) WHERE id = '07892e1d-19f5-4c0b-b358-18cbc780d7f7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cyrela')) LIMIT 1) WHERE id = '58ec22a3-07ae-450f-a4b1-f91b5db3e527' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Embraer')) LIMIT 1) WHERE id = '92e2389a-667a-4385-b7be-9f5a2061006e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energisa')) LIMIT 1) WHERE id = '41aee919-65ed-42b6-ad4a-66f16c2816dc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Engie Brasil')) LIMIT 1) WHERE id = '2e121270-c533-4d3a-9c72-ac5267101418' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Fleury')) LIMIT 1) WHERE id = '281e4f03-8cae-4a21-a2aa-6b46213c5fd5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaú Unibanco')) LIMIT 1) WHERE id = 'd0741c04-b3b3-4dc0-89a9-750ecbcb19c8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaúsa')) LIMIT 1) WHERE id = 'a58d86b0-aff3-40dd-a449-1160871cef87' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Itaúsa')) LIMIT 1) WHERE id = 'cdf3df7b-c09a-47ee-a29f-100c10114fd1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea')) LIMIT 1) WHERE id = '8c84f4c2-c75e-429d-90f3-705facc2f333' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea')) LIMIT 1) WHERE id = '60148e48-fd81-4b9a-b4f0-0ff2fc3ca858' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea')) LIMIT 1) WHERE id = 'aa21b9db-f333-4672-b6e5-559fafa095fd' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea')) LIMIT 1) WHERE id = 'd27c0c02-4985-4551-8cb4-e0ed3740a26d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kinea')) LIMIT 1) WHERE id = 'e5f380d5-8758-4944-9bf0-20b2ca808d07' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lavvi')) LIMIT 1) WHERE id = '1827e994-09b0-4163-828e-067323c85f69' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Log Commercial Properties')) LIMIT 1) WHERE id = 'a39117ba-e1ad-4ba8-9df1-d98518b51829' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lojas Renner')) LIMIT 1) WHERE id = '8b487e7c-c024-45e6-8059-236d0f94da10' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1) WHERE id = '2cb464bd-d6b0-4b71-a05f-cbd54f60b116' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Motiva')) LIMIT 1) WHERE id = 'd8a91cd4-1127-4ca8-bd1a-04b16e535545' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1) WHERE id = 'b265924e-ba95-47e9-8cb6-f0e8aa2630d4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1) WHERE id = 'bb431608-011d-47c4-9000-1d6f04207b20' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Prio')) LIMIT 1) WHERE id = '387a412c-ffeb-4a27-a47e-d09de80681fa' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Sanepar')) LIMIT 1) WHERE id = 'ba7f4303-ae43-4cc5-a36c-f404fe45cdd7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Santander Brasil')) LIMIT 1) WHERE id = 'c0d50016-c6e7-48e9-996c-3a9193a4c93d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Santander Brasil')) LIMIT 1) WHERE id = '34047c71-6e59-4be2-8fa4-6c99fd818d09' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Schulz')) LIMIT 1) WHERE id = '263e4ec9-9411-4adc-a4ee-952381a4cc2f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Suzano')) LIMIT 1) WHERE id = '48672058-e540-406d-bd68-11f863ef2b56' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')) LIMIT 1) WHERE id = 'e9c63fd3-688f-40ec-bade-092b243aed79' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Totvs')) LIMIT 1) WHERE id = '67154c9c-9c1c-4c14-9193-6163bc85f1ea' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale')) LIMIT 1) WHERE id = '88539c8e-4b4b-4eda-b2b8-a461830b6907' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vivara')) LIMIT 1) WHERE id = 'bdd55cde-eb36-47e5-a3f1-477d5ca10529' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('WEG')) LIMIT 1) WHERE id = '523d54c8-b175-48e4-b5d6-ff8530c4518b' AND emissor_id IS NULL;
