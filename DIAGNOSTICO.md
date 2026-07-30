# Diagnóstico técnico — Catequese Presente

## Resultado da revisão

O projeto compila e o Prisma Schema é válido. A revisão encontrou problemas que não apareciam no build, principalmente autorização horizontal, consistência dos relatórios e validação de ações enviadas diretamente ao servidor.

## Falhas críticas corrigidas

- Catequistas agora consultam somente turmas, encontros, catequizandos e responsáveis vinculados às próprias turmas.
- A mesma restrição foi aplicada às APIs de catequizandos, QR Code e exportação de frequência.
- Encerramento de encontro verifica vínculo do catequista antes de alterar o registro.
- Chamada manual confirma se o catequizando possui matrícula ativa na turma do encontro.
- Encontros encerrados não podem ser alterados por catequistas.
- Correções de presença feitas por coordenador ou administrador exigem justificativa e usam o método `CORRECTION`.
- Status e métodos arbitrários enviados fora da interface são rejeitados por validação.
- Matrículas respeitam a capacidade da turma e transferências preservam o vínculo anterior.
- Um índice parcial no PostgreSQL impede duas matrículas ativas para o mesmo catequizando, inclusive sob concorrência.
- Comunidade/paróquia e etapa/sacramento são conferidos antes de gravar uma turma.
- Relatórios calculam frequência apenas com registros da turma correspondente.
- Sessões de usuários desativados ou excluídos deixam de ser aceitas imediatamente.
- `AUTH_SECRET` fraco ou ausente impede a inicialização em produção.
- Criação, transferência, presença, encerramento e regeneração de QR passaram a gravar dados e auditoria na mesma transação.

## Cobertura do MVP

Disponível: autenticação, permissões, catequizandos, responsáveis, sacramentos, etapas, turmas, matrículas, encontros, QR Code, chamada manual, relatório CSV, cartão imprimível, comunicados manuais e auditoria.

## Dependências externas ainda necessárias

- PostgreSQL acessível por `DATABASE_URL` para executar migrações, seed e testes de integração.
- Serviço de e-mail para recuperação de senha e envio automático.
- Armazenamento S3 compatível para fotos, certidões e anexos.
- API oficial do WhatsApp para substituir o fluxo manual.

## Dependências npm

A consulta online do `npm audit` apontou dois avisos moderados no PostCSS empacotado internamente pelo Next.js 15. O próprio npm oferece somente uma correção forçada com alteração incompatível; ela não foi aplicada para evitar a substituição indevida do framework. O pacote PostCSS usado diretamente pelo projeto já está atualizado. Esse aviso deve ser reavaliado quando o Next.js publicar uma atualização estável compatível.

Esses itens não devem ser simulados com armazenamento local em produção. As entidades de documentos, entregas e notificações já estão preparadas no banco.

## Validação recomendada antes do deploy

1. Configurar um banco PostgreSQL de homologação.
2. Executar `prisma migrate deploy` e o seed.
3. Testar login com os três perfis e confirmar o isolamento entre turmas.
4. Configurar uma chave `AUTH_SECRET` aleatória com pelo menos 32 caracteres.
5. Trocar todas as senhas fornecidas pelo seed.
