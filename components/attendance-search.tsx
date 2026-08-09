"use client";

import { Search } from "lucide-react";

export function AttendanceSearch() {
  return <div className="attendance-search search"><span><Search size={16} /></span><input aria-label="Buscar catequizando na chamada" placeholder="Buscar catequizando..." onChange={event => {
    const term = event.target.value.trim().toLocaleLowerCase("pt-BR");
    document.querySelectorAll<HTMLElement>("[data-attendee]").forEach(row => {
      row.hidden = Boolean(term && !row.dataset.attendee?.includes(term));
    });
  }} /></div>;
}
