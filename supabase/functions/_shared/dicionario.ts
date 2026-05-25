// ─────────────────────────────────────────────────────────────────────────────
// Upsert genérico em dicionario_ativos
// Cada Edge Function monta suas próprias rows (extractor é específico por
// instituição); aqui só executamos o estágio final de gravação.
// ─────────────────────────────────────────────────────────────────────────────

import type { DicionarioRow, Institution } from './types.ts'

export async function upsertDicionarioRows(
  supabase: any,
  rows: DicionarioRow[],
  institution: Institution
): Promise<void> {
  if (rows.length === 0) {
    console.log(`Dicionário ${institution}: nenhum ativo candidato`)
    return
  }

  const { error } = await supabase
    .from('dicionario_ativos')
    .upsert(rows, {
      onConflict:       'codigo_identificador,tipo_identificador',
      ignoreDuplicates: true,
    })

  if (error) console.error(`Erro ao popular dicionário ${institution}:`, error.message)
  else console.log(`Dicionário ${institution}: upsert de ${rows.length} ativo(s) concluído`)
}
