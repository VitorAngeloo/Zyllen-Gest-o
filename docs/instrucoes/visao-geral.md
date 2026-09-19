# Zyllen Gestão

Sistema de gestão operacional da Skyline: estoque, patrimônio, compras, chamados, manutenção, acompanhamentos, agenda e etiquetas, com portais para colaboradores, clientes e terceirizados.

## Aplicações

| Componente | Stack | Execução |
|---|---|---|
| `apps/web` | Next.js 16, React 19, TypeScript | Vercel / `skylineti.com`; porta local 3000 |
| `apps/api` | NestJS 10, Prisma 6, TypeScript | Windows Server / `api.skylineti.com`; porta 3001 |
| `packages/shared` | Tipos, enums e schemas Zod | Contratos usados pelos dois apps |
| Banco | PostgreSQL no Supabase | Único, compartilhado com produção |

O banco contém dados reais. Não usar reset, migrate dev, push com perda de dados, seed automático ou testes de escrita no ambiente compartilhado. Seguir o [guia de banco de dados](banco-de-dados.md).

## Começar

Requisitos, instalação, comandos, verificação de tipos e execução em máquina de desenvolvimento estão no [guia de desenvolvimento](desenvolvimento.md). Nesta máquina de produção a API usa `node dist/main.js`; não iniciar watch nem o launcher local.

## Documentação

- [Índice completo e organização dos documentos](README.md).
- [Arquitetura e localização do código](arquitetura.md).
- [Configuração de ambiente](variaveis-de-ambiente.md).
- [Implantação no Vercel e Windows](implantacao.md).
- [Autenticação, permissões e PIN](autenticacao-e-permissoes.md).
- [Auditoria de segurança, remediação e registros](auditoria-de-seguranca.md).
- [Instruções para agentes](instrucoes-para-agentes.md).

Os arquivos `historico-*.md` desta pasta preservam a especificação inicial e os marcos históricos; não substituem instruções atuais. A estrutura de código por funcionalidades está aplicada e descrita no guia de arquitetura.

## Licença

Projeto proprietário — Zyllen Gestão. Todos os direitos reservados.
