import Link from "next/link";
import { MessageCircle, Search } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";
import { createGuardian } from "./actions";

export const dynamic = "force-dynamic";
export default async function GuardiansPage({ searchParams }: { searchParams: Promise<{ q?: string; novo?: string; erro?: string; sucesso?: string }> }) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const personScope = catechistCatechumenFilter(session);
  const guardianScope = session.role === "CATECHIST" ? { catechumens: { some: { catechumen: personScope } } } : {};
  const [rows, students] = await Promise.all([
    prisma.guardian.findMany({ where: { deletedAt: null, fullName: query.q ? { contains: query.q, mode: "insensitive" } : undefined, ...guardianScope }, include: { catechumens: { where: { catechumen: personScope }, include: { catechumen: true } } }, orderBy: { fullName: "asc" } }),
    query.novo && session.role !== "CATECHIST"
      ? prisma.catechumen.findMany({ where: { deletedAt: null, ...personScope }, orderBy: { fullName: "asc" } })
      : Promise.resolve([]),
  ]);
  const canManage = session.role !== "CATECHIST";
  return <AppShell current="/responsaveis"><PageHeader title="Responsáveis" description="Contatos, autorizações e vínculos familiares" action={canManage ? <Link className="btn btn-primary" href="/responsaveis?novo=1">+ Novo responsável</Link> : undefined} />
    {query.sucesso && <div className="alert success">Responsável cadastrado com sucesso.</div>}{query.erro && <div className="alert error">Revise os campos informados.</div>}
    {query.novo && canManage && <form action={createGuardian} className="card form-card" style={{ marginBottom: 18 }}><section className="form-section"><h2>Novo responsável</h2><div className="form-grid"><div className="field"><label>Nome completo *</label><input name="fullName" required /></div><div className="field"><label>Telefone *</label><input name="phone" required /></div><div className="field"><label>WhatsApp</label><input name="whatsapp" /></div><div className="field"><label>E-mail</label><input name="email" type="email" /></div><div className="field"><label>Catequizando</label><select name="catechumenId"><option value="">Vincular depois</option>{students.map(x => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select></div><div className="field"><label>Parentesco *</label><input name="relationship" placeholder="Mãe, pai, avó..." required /></div><label className="checkbox"><input name="allowMessages" type="checkbox" defaultChecked />Autoriza mensagens</label><label className="checkbox"><input name="allowImageUse" type="checkbox" />Autoriza uso de imagem</label></div></section><div className="form-actions"><Link href="/responsaveis" className="btn btn-secondary">Cancelar</Link><button className="btn btn-primary">Salvar responsável</button></div></form>}
    <form className="toolbar"><div className="search"><span><Search size={17} /></span><input name="q" defaultValue={query.q} placeholder="Buscar responsável..." /></div><button className="btn btn-secondary">Buscar</button></form>
    <div className="card table-wrap"><table className="table"><thead><tr><th>Responsável</th><th>Contato</th><th>Catequizandos</th><th>Mensagens</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><div className="person"><div className="person-avatar">{row.fullName.slice(0, 2).toUpperCase()}</div><strong>{row.fullName}</strong></div></td><td>{row.phone}<small>{row.email}</small></td><td>{row.catechumens.map(x => x.catechumen.fullName).join(", ") || "Sem vínculo"}</td><td>{row.allowMessages ? <span className="badge">Autorizado</span> : <span className="badge warn">Não autorizado</span>}</td><td>{row.whatsapp && row.allowMessages && <a className="btn btn-secondary" target="_blank" rel="noreferrer" href={`https://wa.me/${row.whatsapp.replace(/\D/g, "")}`}><MessageCircle size={14} />WhatsApp</a>}</td></tr>)}</tbody></table>{!rows.length && <div className="empty">Nenhum responsável disponível.</div>}</div>
  </AppShell>;
}
