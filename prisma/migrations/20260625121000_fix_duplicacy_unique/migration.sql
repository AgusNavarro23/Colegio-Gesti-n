-- DropIndex
DROP INDEX IF EXISTS "DeclaracionJurada_numerodj_registroId_anio_key";

-- CreateIndex
CREATE UNIQUE INDEX "DeclaracionJurada_registroId_anio_numerodj_codigodj_key" ON "DeclaracionJurada"("registroId", "anio", "numerodj", "codigodj");
