"use client";

import { useMemo, useState } from "react";

type Sacrament = { id: string; name: string };
type ClassOption = {
  id: string;
  name: string;
  year: number;
  sacramentId: string;
  communityName: string;
};

export function CatechumenEnrollmentFields({
  sacraments,
  classes,
}: {
  sacraments: Sacrament[];
  classes: ClassOption[];
}) {
  const [sacramentId, setSacramentId] = useState("");
  const availableClasses = useMemo(
    () => classes.filter((item) => item.sacramentId === sacramentId),
    [classes, sacramentId],
  );

  return (
    <>
      <div className="field">
        <label htmlFor="sacramentId">Sacramento *</label>
        <select
          id="sacramentId"
          name="sacramentId"
          required
          value={sacramentId}
          onChange={(event) => setSacramentId(event.target.value)}
        >
          <option value="" disabled>Selecione o sacramento</option>
          {sacraments.map((sacrament) => (
            <option key={sacrament.id} value={sacrament.id}>{sacrament.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="classId">Turma *</label>
        <select id="classId" name="classId" required disabled={!sacramentId} defaultValue="">
          <option value="" disabled>
            {sacramentId ? "Selecione a turma" : "Primeiro selecione o sacramento"}
          </option>
          {availableClasses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.year}) — {item.communityName}
            </option>
          ))}
        </select>
        <small className="field-help">
          {sacramentId && !availableClasses.length
            ? "Não há turmas disponíveis para este sacramento."
            : "Escolha uma turma do sacramento selecionado."}
        </small>
      </div>
    </>
  );
}
