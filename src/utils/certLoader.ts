import * as fs from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// certLoader — lê certificado de base64 (Railway) ou de arquivo (local)
// ─────────────────────────────────────────────────────────────────────────────

export function loadCert(base64Env: string, pathEnv: string): Buffer {
  const base64 = process.env[base64Env];
  if (base64) {
    return Buffer.from(base64, 'base64');
  }

  const path = process.env[pathEnv];
  if (path && fs.existsSync(path)) {
    return fs.readFileSync(path);
  }

  throw new Error(
    `Certificado não encontrado. Configure ${base64Env} (base64) ou ${pathEnv} (caminho do arquivo).`
  );
}