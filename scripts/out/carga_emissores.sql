-- Carga crédito privado em dicionario_emissores (idempotente).
-- cnpj_raiz fica null (crédito casa por nome/alias). Bancos = FGC, fora daqui.

-- ── 1+2. Emissores: insere se novo, e alinha setor_id pela Lei ──
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Minerva', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'FS', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Saneamento (SPEs)', 'Saneamento', (SELECT id FROM setores WHERE nome = 'Saneamento')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saneamento'), setor = 'Saneamento'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saneamento');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BTG Commodities', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'CSN', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Indústria'), setor = 'Indústria'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Indústria');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Brava Energia', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'), setor = 'Petróleo & Gás'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Petróleo & Gás');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vamos', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BTG Pactual', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Financeiro'), setor = 'Financeiro'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Financeiro');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Dasa', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Marfrig', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BRF', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('BRF')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BRF'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Camil', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Caramuru', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'JBS', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Localiza', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Movida', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Movida')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Movida'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Petrobras', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'), setor = 'Petróleo & Gás'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Petróleo & Gás');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Rede D''Or', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Allos', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'MRV', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Oncoclínicas', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Rede Sim', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede Sim')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede Sim'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Seara', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Seara')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Seara'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Simpar', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Simpar')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Simpar'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'ACP Bioenergia', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('ACP Bioenergia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('ACP Bioenergia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Adecoagro', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Adecoagro')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Adecoagro'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Casas Bahia', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Concessionárias de rodovia', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Dufrio', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dufrio')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dufrio'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Eneva', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eneva')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eneva'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'GPA', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('GPA')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('GPA'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Hortus', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hortus')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hortus'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Incorporadoras (diversas)', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ipiranga', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ipiranga')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'), setor = 'Petróleo & Gás'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ipiranga'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Petróleo & Gás');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Irani', 'Papel & Celulose', (SELECT id FROM setores WHERE nome = 'Papel & Celulose')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Irani')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Papel & Celulose'), setor = 'Papel & Celulose'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Irani'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Papel & Celulose');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'JF Citrus', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('JF Citrus')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('JF Citrus'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'JSL', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('JSL')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('JSL'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Jalles Machado', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Jalles Machado')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Jalles Machado'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Lar Cooperativa', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lar Cooperativa')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lar Cooperativa'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Madero', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Madero')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Madero'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Olfar', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Olfar')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Olfar'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Origem Energia', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Origem Energia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'), setor = 'Petróleo & Gás'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Origem Energia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Petróleo & Gás');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Rio Amambai', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rio Amambai')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rio Amambai'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Rtdr', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rtdr')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rtdr'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Solar (geração distribuída)', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Taesa', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Termelétricas (SPE)', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Terracap', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terracap')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terracap'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Transmissoras (SPE)', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Unidas', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Unidas')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Unidas'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vero', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vero')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vero'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Yduqs', 'Educação', (SELECT id FROM setores WHERE nome = 'Educação')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Yduqs')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Educação'), setor = 'Educação'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Yduqs'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Educação');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ânima', 'Educação', (SELECT id FROM setores WHERE nome = 'Educação')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ânima')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Educação'), setor = 'Educação'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ânima'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Educação');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT '3tentos', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('3tentos')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('3tentos'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Aché', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Aché')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Aché'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Agrion', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Agrion')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Agrion'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Alares', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alares')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alares'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Alumbra', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alumbra')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alumbra'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Arteris', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Arteris')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Arteris'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Artesanal Securitizadora De Creditos S/A', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Artesanal Securitizadora De Creditos S/A')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Artesanal Securitizadora De Creditos S/A'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Assaí', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Assaí')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Assaí'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BR Properties', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('BR Properties')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BR Properties'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'BV', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('BV')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Financeiro'), setor = 'Financeiro'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('BV'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Financeiro');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Banco ABC', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco ABC')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Financeiro'), setor = 'Financeiro'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco ABC'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Financeiro');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Banco Pan', 'Financeiro', (SELECT id FROM setores WHERE nome = 'Financeiro')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco Pan')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Financeiro'), setor = 'Financeiro'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco Pan'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Financeiro');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Basesul', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Basesul')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Basesul'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Birigui', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Birigui')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Birigui'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Boa Safra', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Boa Safra')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Boa Safra'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Brasil Tecnologia', 'Tecnologia', (SELECT id FROM setores WHERE nome = 'Tecnologia')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brasil Tecnologia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Tecnologia'), setor = 'Tecnologia'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brasil Tecnologia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Tecnologia');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Brookfield', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brookfield')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brookfield'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Btg Prime Log', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Btg Prime Log')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Btg Prime Log'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'CESP', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('CESP')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('CESP'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Cabo Verde', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cabo Verde')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cabo Verde'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Canopus', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Canopus')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Canopus'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Caprem', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caprem')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caprem'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Cereal', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cereal')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cereal'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ceres', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ceres')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ceres'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Coop. General Osório', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Coop. General Osório')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Coop. General Osório'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Cury', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cury')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cury'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Day Medical', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Day Medical')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Day Medical'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Diamond Hill', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Diamond Hill')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Diamond Hill'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Due Iii', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Due Iii')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Due Iii'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Eben', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eben')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eben'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ectp', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ectp')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ectp'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ectp Ii', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ectp Ii')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ectp Ii'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Edson Ignacio', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Edson Ignacio')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Edson Ignacio'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Eldorado', 'Papel & Celulose', (SELECT id FROM setores WHERE nome = 'Papel & Celulose')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eldorado')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Papel & Celulose'), setor = 'Papel & Celulose'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eldorado'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Papel & Celulose');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Elektro', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Elektro')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Elektro'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Eletrobras', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eletrobras')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eletrobras'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Energética Sinop', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energética Sinop')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energética Sinop'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Equatorial Transmissão', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Equatorial Transmissão')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Equatorial Transmissão'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Estapar', 'Infraestrutura & Transporte', (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Estapar')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte'), setor = 'Infraestrutura & Transporte'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Estapar'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Infraestrutura & Transporte');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Eucatex', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eucatex')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Indústria'), setor = 'Indústria'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eucatex'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Indústria');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Even', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Even')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Even'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Fazenda Lageado', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Fazenda Lageado')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Fazenda Lageado'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Gja Ii', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Gja Ii')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Gja Ii'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Globo', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Globo')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Globo'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Grupo Masutti', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Grupo Masutti')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Grupo Masutti'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Grupo Mateus', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Grupo Mateus')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Grupo Mateus'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Hapvida', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hapvida')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hapvida'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Holding Do Araguaia S.A.', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Holding Do Araguaia S.A.')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Holding Do Araguaia S.A.'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Hospital Albert Einstein', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hospital Albert Einstein')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hospital Albert Einstein'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Kora Saúde', 'Saúde', (SELECT id FROM setores WHERE nome = 'Saúde')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kora Saúde')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Saúde'), setor = 'Saúde'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kora Saúde'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Saúde');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ligga', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ligga')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ligga'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Longitude', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Longitude')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Longitude'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'M. Dias Branco', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('M. Dias Branco')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('M. Dias Branco'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Magazine Luiza', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Magazine Luiza')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Magazine Luiza'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Mitre', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Mitre')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Mitre'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Moura Dubeux', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Moura Dubeux')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Moura Dubeux'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Neoenergia', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Neoenergia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Neoenergia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'New Inc', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('New Inc')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('New Inc'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Nissei', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Nissei')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Nissei'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Norsa', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Norsa')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Norsa'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Norte Energia', 'Energia Elétrica', (SELECT id FROM setores WHERE nome = 'Energia Elétrica')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Norte Energia')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Energia Elétrica'), setor = 'Energia Elétrica'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Norte Energia'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Energia Elétrica');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'PRIO', 'Petróleo & Gás', (SELECT id FROM setores WHERE nome = 'Petróleo & Gás')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('PRIO')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Petróleo & Gás'), setor = 'Petróleo & Gás'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('PRIO'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Petróleo & Gás');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Pantanal', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Pantanal')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Pantanal'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Patense', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Patense')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Patense'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Poti Junior', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Poti Junior')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Poti Junior'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Projeto Cat', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Projeto Cat')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Projeto Cat'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Pulverizado', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Pulverizado')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Pulverizado'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'SLC Agrícola', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('SLC Agrícola')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('SLC Agrícola'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Stellantis', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Stellantis')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Indústria'), setor = 'Indústria'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Stellantis'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Indústria');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Summer Park', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Summer Park')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Summer Park'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'São Martinho', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('São Martinho')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('São Martinho'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Tenda', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tenda')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tenda'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Terra Mundi', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terra Mundi')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terra Mundi'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Times Square', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Times Square')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Times Square'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Tmi', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tmi')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tmi'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Triple Play', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Triple Play')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Triple Play'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Ujay Trevo Boa Vista', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ujay Trevo Boa Vista')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ujay Trevo Boa Vista'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Urba', 'Imobiliário', (SELECT id FROM setores WHERE nome = 'Imobiliário')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Urba')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Imobiliário'), setor = 'Imobiliário'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Urba'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Imobiliário');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'V.tal', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('V.tal')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('V.tal'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vale', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Indústria'), setor = 'Indústria'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Indústria');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vale do Tijuco', 'Agronegócio', (SELECT id FROM setores WHERE nome = 'Agronegócio')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale do Tijuco')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Agronegócio'), setor = 'Agronegócio'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale do Tijuco'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Agronegócio');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Verticale', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Verticale')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Verticale'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Verticale Iii', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Verticale Iii')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Verticale Iii'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Vicunha', 'Indústria', (SELECT id FROM setores WHERE nome = 'Indústria')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vicunha')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Indústria'), setor = 'Indústria'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vicunha'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Indústria');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Weclix', 'Telecomunicações', (SELECT id FROM setores WHERE nome = 'Telecomunicações')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Weclix')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Telecomunicações'), setor = 'Telecomunicações'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Weclix'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Telecomunicações');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Zamp', 'Varejo & Consumo', (SELECT id FROM setores WHERE nome = 'Varejo & Consumo')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Zamp')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Varejo & Consumo'), setor = 'Varejo & Consumo'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Zamp'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Varejo & Consumo');
INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)
  SELECT 'Zarin', 'Outros', (SELECT id FROM setores WHERE nome = 'Outros')
  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores
    WHERE lower(btrim(nome_fantasia)) = lower(btrim('Zarin')));
UPDATE dicionario_emissores SET setor_id = (SELECT id FROM setores WHERE nome = 'Outros'), setor = 'Outros'
  WHERE lower(btrim(nome_fantasia)) = lower(btrim('Zarin'))
    AND setor_id IS DISTINCT FROM (SELECT id FROM setores WHERE nome = 'Outros');

-- ── 3. Aliases (variações que as APIs usam) ──
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1), 'MINERVA FOODS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('MINERVA FOODS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1), 'FS AGRISOLUTIONS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('FS AGRISOLUTIONS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1), 'FS BIO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('FS BIO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1), 'FS BIOENERGIA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('FS BIOENERGIA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1), 'FS FLORESTAL'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('FS FLORESTAL')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1), 'FS Florestal'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('FS Florestal')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1), 'AGUAS DO RIO 1 SPE S.A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('AGUAS DO RIO 1 SPE S.A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1), 'AGUAS DO RIO 4 SPE S.A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('AGUAS DO RIO 4 SPE S.A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1), 'AGUAS DO SERTAO S/A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('AGUAS DO SERTAO S/A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1), 'COMPANHIA AGUAS DE ITAPEMA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('COMPANHIA AGUAS DE ITAPEMA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1), 'EQUIPAV SANEAMENTO S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('EQUIPAV SANEAMENTO S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1), 'IGUA RIO DE JANEIRO S.A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('IGUA RIO DE JANEIRO S.A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1), 'BTG Commodities 1a Serie'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BTG Commodities 1a Serie')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1), 'BTG Commodities 2a Serie'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BTG Commodities 2a Serie')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1), 'BTG PACTUAL COMMODITIES SERTRADING S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BTG PACTUAL COMMODITIES SERTRADING S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1), 'ENGELHART CTP'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ENGELHART CTP')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1), 'COMPANHIA SIDERURGICA NACIONAL'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('COMPANHIA SIDERURGICA NACIONAL')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1), 'CSN MINERACAO S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CSN MINERACAO S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1), 'VAMOS LOCACAO DE CAMINHOES MAQUINAS E EQUIPAMENTO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('VAMOS LOCACAO DE CAMINHOES MAQUINAS E EQUIPAMENTO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1), 'VAMOS LOCAÇÃO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('VAMOS LOCAÇÃO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1), 'BANCO BTG PACTUAL S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BANCO BTG PACTUAL S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1), 'BTG PACTUAL HOLDING S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BTG PACTUAL HOLDING S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1), 'MARFRIG ALIMENTOS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('MARFRIG ALIMENTOS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1), 'MARFRIG GLOBAL FOODS S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('MARFRIG GLOBAL FOODS S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')) LIMIT 1), 'CAMIL ALIMENTOS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CAMIL ALIMENTOS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')) LIMIT 1), 'CARAMURU ALIMENTOS II'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CARAMURU ALIMENTOS II')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1), 'JBS IV'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('JBS IV')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1), 'JBS V'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('JBS V')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1), 'JBS | VIRGO COMPANHIA DE SECURITIZACAO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('JBS | VIRGO COMPANHIA DE SECURITIZACAO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')) LIMIT 1), 'LOCALIZA RENT A CAR SA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('LOCALIZA RENT A CAR SA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1), 'PETROLEO BRASILEIRO S A PETROBRAS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('PETROLEO BRASILEIRO S A PETROBRAS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1), 'RB CAPITAL COMPANHIA DE SECURITIZACAO | REDE D''OR'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('RB CAPITAL COMPANHIA DE SECURITIZACAO | REDE D''OR')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1), 'REDE D''OR SAO LUIZ'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('REDE D''OR SAO LUIZ')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1), 'Rede D`Or São Luiz'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('Rede D`Or São Luiz')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1), 'ARENA MRV'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ARENA MRV')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1), 'MRV ENGENHARIA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('MRV ENGENHARIA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1), 'ONCOCLINICAS DO BRASIL SERVICOS MEDICOS S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ONCOCLINICAS DO BRASIL SERVICOS MEDICOS S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1), 'ONCOCLINICAS II'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ONCOCLINICAS II')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')) LIMIT 1), 'GRUPO CASAS BAHIA S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('GRUPO CASAS BAHIA S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')) LIMIT 1), 'CONCESSIONARIA ROTA DAS BANDEIRAS S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CONCESSIONARIA ROTA DAS BANDEIRAS S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')) LIMIT 1), 'VIA BRASIL BR 163 CONCESSIONARIA DE RODOVIAS S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('VIA BRASIL BR 163 CONCESSIONARIA DE RODOVIAS S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('GPA')) LIMIT 1), 'COMPANHIA BRASILEIRA DE DISTRIBUICAO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('GPA')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('COMPANHIA BRASILEIRA DE DISTRIBUICAO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hortus')) LIMIT 1), 'HORTUS COMERCIO DE ALIMENTOS S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hortus')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('HORTUS COMERCIO DE ALIMENTOS S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')) LIMIT 1), 'BAIT INCORPORADORA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BAIT INCORPORADORA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')) LIMIT 1), 'BRASIL TERRENOS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BRASIL TERRENOS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ipiranga')) LIMIT 1), 'IPIRANGA PRODUTOS DE PETRÓLEO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ipiranga')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('IPIRANGA PRODUTOS DE PETRÓLEO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Olfar')) LIMIT 1), 'OLFAR ALIMENTO E ENERGIA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Olfar')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('OLFAR ALIMENTO E ENERGIA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')) LIMIT 1), 'Brasol'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('Brasol')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')) LIMIT 1), 'FORGREEN V'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('FORGREEN V')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')) LIMIT 1), 'TRANSMISSORA ALIANCA DE ENERGIA ELETRICA S/A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('TRANSMISSORA ALIANCA DE ENERGIA ELETRICA S/A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')) LIMIT 1), 'USINA TERMELETRICA PAMPA SUL S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('USINA TERMELETRICA PAMPA SUL S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')) LIMIT 1), 'UTE GNA I GERACAO DE ENERGIA S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('UTE GNA I GERACAO DE ENERGIA S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')) LIMIT 1), 'MATA DE SANTA GENEBRA TRANSMISSAO S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('MATA DE SANTA GENEBRA TRANSMISSAO S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')) LIMIT 1), 'SERRA DE IBIAPABA TRANSMISSORA DE ENERGIA S A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('SERRA DE IBIAPABA TRANSMISSORA DE ENERGIA S A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alares')) LIMIT 1), 'ALARES INTERNET PARTICIPACOES S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alares')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ALARES INTERNET PARTICIPACOES S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco ABC')) LIMIT 1), 'ABC'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco ABC')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ABC')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brasil Tecnologia')) LIMIT 1), 'BRASIL TECNOLOGIA E PARTICIPACOES S.A'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brasil Tecnologia')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('BRASIL TECNOLOGIA E PARTICIPACOES S.A')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CESP')) LIMIT 1), 'CESP - COMPANHIA ENERGETICA DE SAO PAULO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CESP')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CESP - COMPANHIA ENERGETICA DE SAO PAULO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Coop. General Osório')) LIMIT 1), 'COOP. AGRÍCOLA MISTA GENERAL OSÓRIO'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Coop. General Osório')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('COOP. AGRÍCOLA MISTA GENERAL OSÓRIO')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cury')) LIMIT 1), 'CURY CONSTRUTORA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cury')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CURY CONSTRUTORA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Elektro')) LIMIT 1), 'ELEKTRO REDES S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Elektro')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('ELEKTRO REDES S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eletrobras')) LIMIT 1), 'CENTRAIS ELETRICAS BRASILEIRAS SA ELETROBRAS'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eletrobras')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('CENTRAIS ELETRICAS BRASILEIRAS SA ELETROBRAS')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energética Sinop')) LIMIT 1), 'COMPANHIA ENERGETICA SINOP SA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energética Sinop')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('COMPANHIA ENERGETICA SINOP SA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Equatorial Transmissão')) LIMIT 1), 'EQUATORIAL TRANSMISSORA 7 SPE S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Equatorial Transmissão')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('EQUATORIAL TRANSMISSORA 7 SPE S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ligga')) LIMIT 1), 'LIGGA TELECOMUNICACOES S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ligga')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('LIGGA TELECOMUNICACOES S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('PRIO')) LIMIT 1), 'PRIO FORTE S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('PRIO')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('PRIO FORTE S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Patense')) LIMIT 1), 'INDÚSTRIA DE RAÇÕES PATENSE'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Patense')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('INDÚSTRIA DE RAÇÕES PATENSE')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tenda')) LIMIT 1), 'TENDA CONSTRUTORA'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tenda')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('TENDA CONSTRUTORA')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Triple Play')) LIMIT 1), 'TRIPLE PLAY BRASIL PARTICIPACOES S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Triple Play')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('TRIPLE PLAY BRASIL PARTICIPACOES S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('V.tal')) LIMIT 1), 'V.TAL - REDE NEUTRA DE TELECOMUNICACOES S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('V.tal')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('V.TAL - REDE NEUTRA DE TELECOMUNICACOES S.A.')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale do Tijuco')) LIMIT 1), 'VALE DO TIJUCO AÇÚCAR E ÁLCOOL'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale do Tijuco')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('VALE DO TIJUCO AÇÚCAR E ÁLCOOL')));
INSERT INTO emissor_aliases (emissor_id, alias) SELECT (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Weclix')) LIMIT 1), 'WECLIX TELECOM S.A.'
  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Weclix')) LIMIT 1) AND lower(btrim(a.alias)) = lower(btrim('WECLIX TELECOM S.A.')));

-- ── 4. Linka ativos_canonicos.emissor_id (só onde está vazio) ──
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cereal')) LIMIT 1)
  WHERE id = '3fae6e8e-127f-47d9-b7b0-cc9f65b7aaae' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JF Citrus')) LIMIT 1)
  WHERE id = 'f6274628-8f70-470e-acff-c80ff90158fc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Zamp')) LIMIT 1)
  WHERE id = 'e636f7d4-f7b6-449b-97a1-173f1cd724dc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Madero')) LIMIT 1)
  WHERE id = 'e419b17d-7f95-4d6c-8d21-3228527a6fe9' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Artesanal Securitizadora De Creditos S/A')) LIMIT 1)
  WHERE id = '83e6e88b-82be-4754-aab4-8c8cf0714ec7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rio Amambai')) LIMIT 1)
  WHERE id = '1de0d927-4ce3-47fc-b127-75df6c12fd88' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Seara')) LIMIT 1)
  WHERE id = 'e38ecc0c-de30-4537-ab12-864f97c3ab05' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = '1e779f7e-f1aa-4c1d-862f-6c0b3779cabe' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1)
  WHERE id = '1e90921e-057c-4774-8e90-0973c7c1fb21' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco ABC')) LIMIT 1)
  WHERE id = '1f4c5369-d593-4431-8b12-7a2eaf3a0f39' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JSL')) LIMIT 1)
  WHERE id = 'f0418e31-2db8-44a5-a58f-74cb69436b4e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = 'b13a0281-c926-4cca-90a1-4517c7efc6b6' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = '4128a218-af19-48e4-b1ed-f0e5c73bae30' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = '20211699-e800-468e-b5ad-8f511281cfb5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')) LIMIT 1)
  WHERE id = '833507e9-9ed2-4cc8-9633-bfc094116016' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BRF')) LIMIT 1)
  WHERE id = '206d273a-c60e-4ce4-8cf9-d8aa725a750b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('ACP Bioenergia')) LIMIT 1)
  WHERE id = 'b1065c9a-b228-4061-869a-393e93add6a8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '56b1a644-9ed1-46dc-8a2c-9452cdbd6227' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Adecoagro')) LIMIT 1)
  WHERE id = 'e1cd7960-5d16-4a07-b602-f90c8d321105' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = '20efda50-d447-45e3-9609-f37373920a11' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eucatex')) LIMIT 1)
  WHERE id = '091f6989-3d15-44f8-9cff-298bf40430b4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Irani')) LIMIT 1)
  WHERE id = '21b82ce3-1b07-40b8-b5d1-a48d1ad64fb8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JF Citrus')) LIMIT 1)
  WHERE id = '21df25e7-3a1c-4d5e-bfd7-7f2c542deb89' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede Sim')) LIMIT 1)
  WHERE id = '99b19484-1832-40e5-9d5e-3505cad46a2d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = '82db1a08-9158-441c-b542-1290be8ca3fd' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = '98a47c0d-d190-40b5-aa95-c20adf0eec91' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Madero')) LIMIT 1)
  WHERE id = '2237ab60-cc0a-4cd6-8e41-c2c4c4c178ce' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede Sim')) LIMIT 1)
  WHERE id = 'f0654037-0c4b-469a-87a4-b394759dbd0c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = 'dff2b037-bba7-41ed-ade5-350a32012374' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BRF')) LIMIT 1)
  WHERE id = 'af288d2f-719e-4765-82b6-d467fe5c4e2b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Agrion')) LIMIT 1)
  WHERE id = '22e7b7be-c66f-4519-bd6f-dcbc4055a08a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '97d27771-8459-40ea-93e9-24d2aa48fc1c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('3tentos')) LIMIT 1)
  WHERE id = 'df72168f-486a-498b-9db0-f4f40e5f8796' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = 'de71d7dd-932a-42e5-b4d3-b48d52a80412' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Adecoagro')) LIMIT 1)
  WHERE id = 'ddb6d197-b0ca-45c7-9c93-5e2b4a27f9e5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vicunha')) LIMIT 1)
  WHERE id = '25fad71a-9a94-429c-908a-76d268e2b62c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = 'feea763e-c954-496b-8422-0808043d86d3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ipiranga')) LIMIT 1)
  WHERE id = 'd9803ad3-a1ce-40af-a2a8-2db5db984b04' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = '0ed0f383-3ac6-4846-a333-6d77e67795c5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Patense')) LIMIT 1)
  WHERE id = '7fd99bf9-4745-4356-beed-538ed1fd1b3c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BRF')) LIMIT 1)
  WHERE id = 'd8d38341-a7ba-4c52-a480-5823ed8921cd' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('M. Dias Branco')) LIMIT 1)
  WHERE id = '962263b8-df0f-49b3-ace2-066ad932a760' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cabo Verde')) LIMIT 1)
  WHERE id = 'aa868d26-83bf-4428-8291-0e1947904955' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')) LIMIT 1)
  WHERE id = 'fe8665b7-9f20-4f08-9804-42d2625a5626' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')) LIMIT 1)
  WHERE id = '956f86d2-1cf5-4e2e-9027-49592f87ea08' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale do Tijuco')) LIMIT 1)
  WHERE id = '7eae02dd-bbcf-4314-a857-5933bfdf82ec' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '9548ecc3-3809-49e2-aaea-05710a307010' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Norsa')) LIMIT 1)
  WHERE id = 'fb900556-ea1f-4ea9-84bc-fc4c54c95308' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = '624fc82f-f640-4f82-bfe9-3348050d667c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Irani')) LIMIT 1)
  WHERE id = 'cfbe0fa7-2a2f-421f-993c-8716989997f7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1)
  WHERE id = 'ce71589e-d165-4b8e-b1d0-d32482f6c5ce' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1)
  WHERE id = '2bafd74c-e8e4-4de3-a927-0ca1ece6a6ee' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BV')) LIMIT 1)
  WHERE id = 'ce53f5d3-8541-47e8-84b6-8d67b0023127' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1)
  WHERE id = 'cde80d2d-b878-428e-a2ca-e37e323c6a45' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BRF')) LIMIT 1)
  WHERE id = '7e25a32b-f04f-4b65-9718-f2da7208002f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Seara')) LIMIT 1)
  WHERE id = '691f15b1-c62f-470b-af67-c2168c5f5ebf' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = 'a68dc4c7-8daa-4565-a69b-c45b397b0cb1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')) LIMIT 1)
  WHERE id = '7d230706-d7fb-4ed5-b649-d50ec28e3a80' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Boa Safra')) LIMIT 1)
  WHERE id = '045ac17e-473b-4aa2-b99b-60fbc1f131a7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rio Amambai')) LIMIT 1)
  WHERE id = '2e37325e-55b7-4bed-a664-2d71922bfbfe' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JSL')) LIMIT 1)
  WHERE id = 'a61207d6-55b4-4825-93f7-5e006e378451' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ipiranga')) LIMIT 1)
  WHERE id = '92904fa0-ad17-4891-bff3-3838ebea03cc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '0e60e77e-ae1d-417d-a834-ba8e678bec04' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = 'a3b44260-1318-4b91-a1ac-e85abf99a8b8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Grupo Masutti')) LIMIT 1)
  WHERE id = 'f0ae70b9-e32f-47a5-86a0-81b2f1b327f8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Projeto Cat')) LIMIT 1)
  WHERE id = 'c9d3fb64-dfa9-4950-be69-6dff307b3938' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = 'c8622127-3d23-41f2-b36f-e1e095537ec9' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Olfar')) LIMIT 1)
  WHERE id = 'a338de3b-f9a7-418a-bbd0-29e3f73e7a6a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = 'c80f22f2-7efd-49f5-adc0-f68dc7798ec9' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Edson Ignacio')) LIMIT 1)
  WHERE id = '75f5ac45-c14d-467b-bd26-d9945331c722' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '8eef4bb0-ec9d-4e8a-87e0-521c6f19c9bc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Fazenda Lageado')) LIMIT 1)
  WHERE id = 'c6998efc-9cc1-4533-8c88-6a84f61fee4b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = 'c4576747-c172-4ef4-adf1-939f036b944c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')) LIMIT 1)
  WHERE id = '7bdd217f-f5fb-49a7-bb9f-002e52d0cd45' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = '6e69673f-ac80-41c9-a2af-7aad12ee58e4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '334f8289-739e-4e1c-8e73-fe61fb2f4e8a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = '8bf063bf-287a-476e-8895-844d6c24f5f6' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = '4e72d01c-fd3f-401a-a341-45d023c6de79' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lar Cooperativa')) LIMIT 1)
  WHERE id = '3445801f-85aa-4352-ae98-d56e264644f1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('São Martinho')) LIMIT 1)
  WHERE id = 'fb5d019a-ff85-4227-8633-1077e8f06fd0' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1)
  WHERE id = 'f2a6a894-d58a-4194-a877-92c261e5903b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('ACP Bioenergia')) LIMIT 1)
  WHERE id = 'f368f213-be16-4e3d-bcc6-91fb5acd72d8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = 'a10d8e28-b69f-4caf-964c-f6aa42f67fab' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1)
  WHERE id = '03c146ee-aca8-4221-9ccd-5ca3b4d195a8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '6f8ab1d3-f8c7-4cc8-818e-64a4465f8ad5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Pantanal')) LIMIT 1)
  WHERE id = 'eeb712ad-6623-4b6d-809a-efb1af6dd073' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caramuru')) LIMIT 1)
  WHERE id = '05bae650-9975-410c-a3d4-fda5821fe818' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '1332b738-6809-44a3-9646-527925988965' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1)
  WHERE id = 'ee86d211-aa97-461f-85aa-9b53e145643e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Unidas')) LIMIT 1)
  WHERE id = 'bb7ad622-a062-43ce-ae4e-c35dc4258c7e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = '0393e055-2480-422d-9848-3273bd2fa8c5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eldorado')) LIMIT 1)
  WHERE id = 'ede0cf7f-c0bf-4506-a2bf-c2388d15199d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('SLC Agrícola')) LIMIT 1)
  WHERE id = '168bc049-e840-40cf-8cb0-4fb2c2fb7fad' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '9c89f1e5-c2d6-4e17-90c1-b199ad07081d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1)
  WHERE id = '739306a7-b1b3-4152-b400-1072fcf1eee3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ectp')) LIMIT 1)
  WHERE id = 'ec60e8fb-f08d-48fc-9f18-492a7c1435f3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Olfar')) LIMIT 1)
  WHERE id = 'fe8b4bbc-217b-41d8-8622-b24e8d51ed30' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede Sim')) LIMIT 1)
  WHERE id = '3b63cc72-36c4-425c-bc19-cf58a7421490' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Unidas')) LIMIT 1)
  WHERE id = '05a36b38-f58e-4404-9108-ea94210c5eb5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '53a75fc4-ec1f-46a3-92cf-324e647ec039' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Seara')) LIMIT 1)
  WHERE id = 'e9fb472f-6dfb-4904-ad98-996452925441' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')) LIMIT 1)
  WHERE id = '3e10c408-a510-4627-a82f-5aaa49d65ab4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('FS')) LIMIT 1)
  WHERE id = '3e2b010a-02a3-40d0-81c1-9af628501aa5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Camil')) LIMIT 1)
  WHERE id = 'fe916cb0-8520-4ac0-9fb0-5d8efdfe03b2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1)
  WHERE id = '3fa4bc7c-ba64-436f-8809-c2ca54770d11' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ceres')) LIMIT 1)
  WHERE id = 'ef54bd7e-e9b9-4aa6-bf0e-0ae85d482649' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '3660f90d-6c60-44d1-a089-ec7230931667' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = 'a0bb80aa-e133-4e14-920b-a94e25c8ec7c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '51733b1c-87c3-4c64-8d15-566615dd5dcb' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1)
  WHERE id = 'be1e4297-7c17-4c55-ad6d-9ce2f84d9428' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ectp Ii')) LIMIT 1)
  WHERE id = 'a09d93b4-c6a1-4964-9a14-b3d57a98e587' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = '6fbe63d4-b115-4e49-ba77-aa551f55f130' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Minerva')) LIMIT 1)
  WHERE id = '51d902fd-cb00-4c6b-aa73-fd19ccc7f7cb' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('JBS')) LIMIT 1)
  WHERE id = 'd2354ae3-b559-4900-90ca-9e8780f4814c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')) LIMIT 1)
  WHERE id = '20b0a6fe-b9f9-4a82-b9e1-b059293664b4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1)
  WHERE id = 'e0dee42e-1ca6-4672-b51f-19d565959c52' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Movida')) LIMIT 1)
  WHERE id = '78132e18-271d-492b-8d89-3483b6945fe4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1)
  WHERE id = 'e05dd088-1edc-436f-9cd8-6c76020d8680' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Urba')) LIMIT 1)
  WHERE id = '38055093-5002-4121-9b60-17eab3ca9d1c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Pulverizado')) LIMIT 1)
  WHERE id = 'b54c851f-1d89-46a7-82e5-d41897124526' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Caprem')) LIMIT 1)
  WHERE id = '228d06aa-9574-465e-9096-ec92d5ed4c8f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')) LIMIT 1)
  WHERE id = 'bcd4cc47-86ab-4b7b-be69-e85b989d7776' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Poti Junior')) LIMIT 1)
  WHERE id = '8a6702d7-43a4-4eef-9d1c-e9de33f4b288' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dufrio')) LIMIT 1)
  WHERE id = '782cc806-d97d-4bb4-828d-f90f88061f3f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos')) LIMIT 1)
  WHERE id = '23356eda-7b24-4c98-8b10-9270c5021af5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa')) LIMIT 1)
  WHERE id = '136f8ece-5687-4184-9ba7-b0cfd9e10e15' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1)
  WHERE id = 'df4ac0ff-3426-4d59-b181-c02c489e9cfc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Coop. General Osório')) LIMIT 1)
  WHERE id = 'a8654241-295d-4f57-afb2-b5590e0ed598' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alumbra')) LIMIT 1)
  WHERE id = 'ee72862b-29ee-4d62-b6c2-6a82c1740924' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Grupo Mateus')) LIMIT 1)
  WHERE id = '13c05e36-5bb7-40f5-9562-ec90b9fb4078' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Solar (geração distribuída)')) LIMIT 1)
  WHERE id = '67d37695-64c6-4c18-a26b-aa90562e2530' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ânima')) LIMIT 1)
  WHERE id = 'c0403cf9-2392-4298-baf0-1132e3743a7b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa')) LIMIT 1)
  WHERE id = '6e4f5231-3c55-4038-9031-a1b51c948c65' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Cury')) LIMIT 1)
  WHERE id = '13cd88d4-959f-4807-839d-d0b255b243c3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rtdr')) LIMIT 1)
  WHERE id = '3644f83d-8fe3-4961-994b-fe01214638c0' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dufrio')) LIMIT 1)
  WHERE id = 'edbfa508-c42d-4284-ac54-a4f4fd5d1949' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Movida')) LIMIT 1)
  WHERE id = '34ff0954-86cf-4d9c-afee-9e03458eb57a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Incorporadoras (diversas)')) LIMIT 1)
  WHERE id = '279fd50a-6fca-4500-8ccd-47ce7ac36d7a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa')) LIMIT 1)
  WHERE id = '5a6d6049-b9a9-4559-b5c0-b00458a7fd96' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Birigui')) LIMIT 1)
  WHERE id = '8ef40bbe-62de-4134-b4c8-55ce853e4b00' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eben')) LIMIT 1)
  WHERE id = 'ff96663c-3d9d-4e72-b1f9-3c62c29a0987' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Banco Pan')) LIMIT 1)
  WHERE id = '742eb9f1-1845-412c-9fee-e75b7de57006' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Moura Dubeux')) LIMIT 1)
  WHERE id = 'a7463d50-4607-49bf-bf61-a697c40bfb5c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tmi')) LIMIT 1)
  WHERE id = 'e37cffba-7fe1-4381-bbd1-7fa0390d9a97' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa')) LIMIT 1)
  WHERE id = 'fff169bc-ef66-4de9-bc00-07ea86d7351d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Estapar')) LIMIT 1)
  WHERE id = '87ec4902-38ba-4efc-9396-d54e6d4fd41d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('New Inc')) LIMIT 1)
  WHERE id = 'e2db46a1-e7e8-4d1b-82ba-e7c1c85df0b3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Day Medical')) LIMIT 1)
  WHERE id = '5e6a7f16-d788-4d42-aee9-24e0e47bb2a4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos')) LIMIT 1)
  WHERE id = 'e169b433-9601-4f36-bb70-0eecd855d187' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1)
  WHERE id = '06039ce0-c5ac-4df8-b9ce-790ebc12137e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Allos')) LIMIT 1)
  WHERE id = 'c292eeff-59cc-4a6a-96ee-fd705dc4996f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Basesul')) LIMIT 1)
  WHERE id = '285f0b85-e6da-4681-8c53-1a9007b375f2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Verticale Iii')) LIMIT 1)
  WHERE id = '59ce94ac-d048-48d0-a179-0b43ee19292f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hapvida')) LIMIT 1)
  WHERE id = '9d98a937-0fe5-43c5-959e-8708f92af0db' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Globo')) LIMIT 1)
  WHERE id = '74c33039-57f9-421f-9a03-5e0b1bf0f20b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Zarin')) LIMIT 1)
  WHERE id = 'ffd04c9c-1b2d-4e0e-90c9-5d9f4195ca0f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Nissei')) LIMIT 1)
  WHERE id = '0002a511-8be9-4812-b9f5-c85e293d0e9d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Dasa')) LIMIT 1)
  WHERE id = '6cac33c0-7215-4463-89fb-11030e1c4ee5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Mitre')) LIMIT 1)
  WHERE id = 'f5221ce3-dbeb-4640-a752-bd0cdb26a125' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Aché')) LIMIT 1)
  WHERE id = '2918ad75-065f-47fb-adbf-23d4519b40a3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Stellantis')) LIMIT 1)
  WHERE id = 'b6d100c4-0c64-4c9a-ac29-968818c05ce3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BR Properties')) LIMIT 1)
  WHERE id = '7e26156e-513d-466c-900c-8d902c77576e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Times Square')) LIMIT 1)
  WHERE id = '32f2fe31-eaa2-43af-b64c-af770bb106e8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1)
  WHERE id = '6ed17bc3-7846-428d-96c6-e584a1feca2e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terra Mundi')) LIMIT 1)
  WHERE id = '9c2171e1-62fe-46dd-bbcd-5abc8bcbf4b5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brookfield')) LIMIT 1)
  WHERE id = '541a860a-ce8e-45af-846a-803854841216' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Gja Ii')) LIMIT 1)
  WHERE id = 'cdcf73e8-981e-4934-bf93-85c0d1c12686' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1)
  WHERE id = '306580e3-f06c-46a0-aba8-232f74bdf765' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Canopus')) LIMIT 1)
  WHERE id = '7ebfc217-a8a7-4784-b5a9-39bb0de9ec4d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ujay Trevo Boa Vista')) LIMIT 1)
  WHERE id = '9981d26b-a527-44d4-ba82-6770d2103039' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terracap')) LIMIT 1)
  WHERE id = 'a4c55cec-cdd0-4034-a46c-f2e7cbd6db4c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Terracap')) LIMIT 1)
  WHERE id = '2fac3dbd-2e6c-4e81-a9de-43aa3623c9d6' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1)
  WHERE id = 'b9b6104f-5bbf-48a9-a66d-21d08e5d3311' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Longitude')) LIMIT 1)
  WHERE id = '441c6b9a-1311-4fc7-a17f-35fb7d7da559' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('MRV')) LIMIT 1)
  WHERE id = 'e8546e4e-37f2-46a7-8c72-66b5d1777af4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1)
  WHERE id = '3bfe386d-04bb-4f5c-aa46-915afe14c5f3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rtdr')) LIMIT 1)
  WHERE id = '573e0161-a6c6-46ec-9eed-ccaf2c23cccb' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hospital Albert Einstein')) LIMIT 1)
  WHERE id = '71d95a25-7433-4158-8b4e-4ddb091effa5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Tenda')) LIMIT 1)
  WHERE id = 'c93c78df-2880-44ea-8fd6-05ef401a0e5e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Verticale')) LIMIT 1)
  WHERE id = 'e74f5ce8-19b7-42fe-8ef0-35d94c1820f0' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Due Iii')) LIMIT 1)
  WHERE id = '996cae19-7120-44c3-9d9a-5c02fc962328' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Even')) LIMIT 1)
  WHERE id = '1b93610d-edd1-4215-9bbb-a11c60ef1384' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Btg Prime Log')) LIMIT 1)
  WHERE id = 'e6e8de6f-9922-4f0a-9312-203175c474be' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1)
  WHERE id = '1d2fe729-64e8-46f8-8bb2-ebdbd5fe769e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ânima')) LIMIT 1)
  WHERE id = '5f3a4a04-6ce4-4791-8a5b-3771bf02096d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Summer Park')) LIMIT 1)
  WHERE id = '460285ca-7dbf-4831-b642-0551b7a0b9a5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Assaí')) LIMIT 1)
  WHERE id = '3ae0037c-8aae-4ab4-aee1-33c1290f3253' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1)
  WHERE id = '84ac0b67-533e-4891-b5b5-1bc7ef2af927' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Yduqs')) LIMIT 1)
  WHERE id = '69034202-6e86-49aa-ba2d-4a488d29dd1a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Diamond Hill')) LIMIT 1)
  WHERE id = '03af6a06-8fe6-4963-8fd3-7d42cc656bfc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')) LIMIT 1)
  WHERE id = '86646a1f-3625-4e4b-a01d-b6309d0ff4bd' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Lar Cooperativa')) LIMIT 1)
  WHERE id = '6b1beac1-8178-48ba-b70e-e26d1ffde63c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Yduqs')) LIMIT 1)
  WHERE id = '86d830c4-779d-4103-b39d-13f9a1f12fb2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('GPA')) LIMIT 1)
  WHERE id = 'a2e19a4c-0391-4183-9c4a-b9bbe5a2b607' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Rede D''Or')) LIMIT 1)
  WHERE id = '5ed1b20b-8975-419b-b5ff-369320f69be3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Simpar')) LIMIT 1)
  WHERE id = '9c29cfb3-cf08-42e7-aff4-0931808fb8be' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1)
  WHERE id = '6fc7c33d-7298-43a7-99f9-524bfd9d2e1c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CESP')) LIMIT 1)
  WHERE id = '01f806b2-fbb2-4393-a20c-b998b712f5ba' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = 'fcf705a1-96d3-4096-a856-af1ddf0174e1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('GPA')) LIMIT 1)
  WHERE id = '741e525f-06df-4b0c-bc17-126485eb047f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Commodities')) LIMIT 1)
  WHERE id = '06e3f9ea-7c6e-4c21-8d8d-af2fec929ab7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')) LIMIT 1)
  WHERE id = '0905fda6-a1ce-4675-808e-58df68295dce' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = 'f2227438-2a3d-4656-8950-4564229132a0' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')) LIMIT 1)
  WHERE id = '0f6dcaa6-8865-4958-8928-262a7da09c6c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = 'ef680f34-660b-4f64-989c-9b796935c15f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vero')) LIMIT 1)
  WHERE id = '12ab9c80-3d45-4d51-96cb-55a3ecd1a8b6' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Equatorial Transmissão')) LIMIT 1)
  WHERE id = '12d0a5aa-2015-4d36-a4fd-afc3ba0ce403' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hortus')) LIMIT 1)
  WHERE id = '78013847-0a7a-4244-b6c2-74264be4dfe6' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Origem Energia')) LIMIT 1)
  WHERE id = '66e9709a-7e0b-4f7e-abb4-e9db3ad31ca8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '65f9fd3b-2719-48ef-8bed-4ae3cec82b83' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')) LIMIT 1)
  WHERE id = '7c8c4c85-c854-4ae1-a7e9-6fdf374a54d9' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Norte Energia')) LIMIT 1)
  WHERE id = 'ed8b2db0-d490-4521-b5cb-e8c8c0043add' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eneva')) LIMIT 1)
  WHERE id = '7d22fd8f-1f08-4956-9910-1beff9ef9f1b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')) LIMIT 1)
  WHERE id = 'ed150733-9735-4b45-a945-51a7d98230b7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Movida')) LIMIT 1)
  WHERE id = 'ecbdd0e8-72d0-4bbc-8f53-95541247a6c4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Weclix')) LIMIT 1)
  WHERE id = 'ec08cc17-82fa-4230-9626-2455033497ae' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Simpar')) LIMIT 1)
  WHERE id = 'ea502cad-2407-45ee-ac99-e8dac9ab3852' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')) LIMIT 1)
  WHERE id = 'e9c7beb4-1782-464a-b0de-d2bb7e66c79c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eneva')) LIMIT 1)
  WHERE id = 'e932fd96-db58-4846-acb0-20f6a2abd131' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Casas Bahia')) LIMIT 1)
  WHERE id = '1ac3cd8a-5807-49d1-bdfa-5f6b82f11386' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Triple Play')) LIMIT 1)
  WHERE id = '8231ceab-7cf8-4a27-b314-8a962c1c34c2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = 'e3a4ee9e-1f85-4d1e-b779-6c34ab6e0efc' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Holding Do Araguaia S.A.')) LIMIT 1)
  WHERE id = '84db56c1-485b-45c5-a8cd-b85cd98e2262' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Alares')) LIMIT 1)
  WHERE id = '86088a76-b24e-4134-ba69-5286632f53c6' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Termelétricas (SPE)')) LIMIT 1)
  WHERE id = '867bfee7-80ca-427d-9af7-324d0e032b7f' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = '1ea5cec8-70bd-40fe-bc13-cac15befafc4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Magazine Luiza')) LIMIT 1)
  WHERE id = '21f920c6-db28-4503-b7ba-75c846f7d077' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Movida')) LIMIT 1)
  WHERE id = 'df5134ee-6d6f-4aa0-9531-7c1373cc36cf' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')) LIMIT 1)
  WHERE id = 'df13ae3e-2acd-4222-aa7f-b04d25b193f2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Elektro')) LIMIT 1)
  WHERE id = '25287855-4e68-42c6-b90f-40815c94e27a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = 'ddbeffd2-9b4d-4b7b-9ab5-a39093bdd8ec' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '8d3c6b77-68a8-4b4e-bd53-5b3ffbfe7a22' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Taesa')) LIMIT 1)
  WHERE id = '25bc0640-5ead-4b56-9c2c-f41dae3dc4b1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Concessionárias de rodovia')) LIMIT 1)
  WHERE id = '26b8fb02-8d73-4688-871e-43a2c6fc7578' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('BTG Pactual')) LIMIT 1)
  WHERE id = 'd6e87454-4365-4ba9-892a-0e84c01be4b2' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Jalles Machado')) LIMIT 1)
  WHERE id = '8fbb416e-c3bf-43b4-948a-babab015107d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Energética Sinop')) LIMIT 1)
  WHERE id = 'd3d40f3d-1ed6-4e96-adeb-3f946ce1a00d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Origem Energia')) LIMIT 1)
  WHERE id = '5a3ae0eb-7492-485e-93d8-dbf16fe037d1' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')) LIMIT 1)
  WHERE id = '599fdce7-d9bf-4421-a271-0a1399b8284c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Transmissoras (SPE)')) LIMIT 1)
  WHERE id = '92d9c84a-1c07-4ef6-a82d-e41bed23b478' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = '92e55a6f-16c1-4324-b165-b48a72efd812' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Jalles Machado')) LIMIT 1)
  WHERE id = 'd1678641-cca3-4a49-9c56-bd63fe8cde6e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Eletrobras')) LIMIT 1)
  WHERE id = 'cfe9638f-ab0c-4cc3-9238-47e8cedbcb5e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vale')) LIMIT 1)
  WHERE id = '58a87b30-24e4-4864-add8-0426be8a388a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '586c7f59-ea8b-4062-b4e5-226565c3eb6c' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '2c587532-d1c0-4de0-8aab-8d662c92d80a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = 'ccb48c97-c370-4b23-9fa7-c4179a0888ce' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brasil Tecnologia')) LIMIT 1)
  WHERE id = '96d65a39-4226-4d1a-926a-19d35fbb88a3' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = '9724f15d-dff2-491e-8941-ba0b5cfc7e40' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = '5758e786-5e86-4978-9dd3-1d2dc80fcb8e' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('V.tal')) LIMIT 1)
  WHERE id = '5758b81c-7476-4ef1-9f50-a24b88e4d21d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Localiza')) LIMIT 1)
  WHERE id = '301cb01c-a46d-4b2f-a8dc-c769689d43b5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '5707dada-2412-4461-af2a-4eda2154806b' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vamos')) LIMIT 1)
  WHERE id = '98fcef48-3c58-4b42-b2c8-135a85a294b0' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Marfrig')) LIMIT 1)
  WHERE id = '3070951e-4b42-45d0-a3af-2b89876dd72a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = '54c3a73b-7db6-4628-aa6a-3402903d1cb8' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '3079a71a-dfa9-44ed-962f-5a93e3cc1a9a' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = 'c5f9d7c9-a12d-46c4-be76-8c241b8a78c7' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Oncoclínicas')) LIMIT 1)
  WHERE id = '9bb2fc2a-c23d-4a03-a1e6-23bce4e95e0d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Ligga')) LIMIT 1)
  WHERE id = '43b8af3c-2202-47b2-b8b5-5d380ea02066' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = '52e6b3f9-e951-40ec-b158-1705906c192d' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = '529f0018-efc4-4c8e-b962-cd3a2ce000a4' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = 'c247ffac-44f0-4558-8127-70dac0d33370' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Petrobras')) LIMIT 1)
  WHERE id = 'c2128dd6-4c10-40b1-975c-3ea9c26926bb' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Saneamento (SPEs)')) LIMIT 1)
  WHERE id = '35407066-166e-4518-944a-67c09751b673' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Hortus')) LIMIT 1)
  WHERE id = 'a0f08265-d0c5-47a3-bb93-a47a2eaa3187' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Neoenergia')) LIMIT 1)
  WHERE id = '3b33013a-35ff-4bdd-afba-4bb7c7760154' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Vero')) LIMIT 1)
  WHERE id = '3c9bcb2c-b341-48ef-b6ae-40a66eb58948' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('PRIO')) LIMIT 1)
  WHERE id = 'a504a047-e9fe-4369-9614-32cd8781c7d5' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('CSN')) LIMIT 1)
  WHERE id = '40745c84-e1d1-48f8-aa0c-08746364d545' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Arteris')) LIMIT 1)
  WHERE id = 'b5c16675-8fed-4dd7-8445-ef6bb8730348' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Kora Saúde')) LIMIT 1)
  WHERE id = '40df37af-250c-4422-9edd-eb8465fea296' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Simpar')) LIMIT 1)
  WHERE id = 'af8c2e97-a1b4-401e-8712-3155515fb358' AND emissor_id IS NULL;
UPDATE ativos_canonicos SET emissor_id = (SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim('Brava Energia')) LIMIT 1)
  WHERE id = '4238fc51-1ec8-4e66-af56-4e4a97c43c11' AND emissor_id IS NULL;
