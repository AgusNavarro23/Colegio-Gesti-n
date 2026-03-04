/*
  Warnings:

  - A unique constraint covering the columns `[numerodj,registroId]` on the table `DeclaracionJurada` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DeclaracionJurada_numerodj_registroId_key" ON "DeclaracionJurada"("numerodj", "registroId");
