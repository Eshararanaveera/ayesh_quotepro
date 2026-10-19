import type { Prisma } from '@prisma/client';

/**
 * Next document number such as QT-2026-0007 or INV-2026-0003.
 * Must be called inside a transaction. MySQL's INSERT … ON DUPLICATE KEY UPDATE
 * locks the counter row until the transaction ends, so two people saving at the
 * same moment always get different numbers. Numbers restart each year.
 */
export async function nextDocumentNumber(tx: Prisma.TransactionClient, prefix: string, year: number): Promise<string> {
  const key = `${prefix}-${year}`;
  await tx.$executeRaw`
    INSERT INTO document_sequences (\`key\`, \`last\`) VALUES (${key}, 1)
    ON DUPLICATE KEY UPDATE \`last\` = \`last\` + 1`;
  const rows = await tx.$queryRaw<{ last: number | bigint }[]>`
    SELECT \`last\` FROM document_sequences WHERE \`key\` = ${key}`;
  const last = Number(rows[0]?.last ?? 1);
  return `${key}-${String(last).padStart(4, '0')}`;
}
