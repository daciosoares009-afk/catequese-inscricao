export function PageHeader({ title, description, action, eyebrow = "Gestão pastoral" }: { title: string; description: string; action?: React.ReactNode; eyebrow?: string }) {
  return <header className="page-head"><div className="page-title-wrap"><span className="page-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-action">{action}</div>}</header>;
}
