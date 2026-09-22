# Manutenção e ordens de serviço

## Seis tipos de formulário

Discriminadores e validação compartilhada em `packages/shared/src/maintenance/schemas.ts`; configuração visual em `apps/web/src/features/maintenance/types/os-form.types.ts`:

`TERCEIRIZADO` · `INSTALACAO_SALA` · `INSTALACAO_TELA` · `DESINSTALACAO` · `SUPORTE_REMOTO` · `MANUTENCAO_TELA_SALA`

O `MaintenanceOS.formData` é um **blob JSON** — os campos variam por `formType`. `OS_FORM_CONFIG` mapeia cada tipo para label, campos e configuração; `lib/os-form-view.ts` (`getOsFieldRows`) transforma o blob em linhas renderizáveis.

Limite de `formData`: **64 KB** (validado em `maintenance.service.ts`).

## Listagem interna

Em **Minhas OS**, Administrador e Gestor começam na visão **Todas as OS**. Podem consultar também as OS abertas por si, por colaboradores e por parceiros. Os demais colaboradores veem apenas as OS que abriram nessa página. A visão geral inclui inclusive registros antigos ou sem autor identificado; filtros por situação e busca por número, cliente ou projeto são aplicados no servidor antes da paginação. **Abertura de OS** também usa paginação e busca. Ambas as telas mostram o total retornado pela API e permitem avançar por todas as páginas, sem limitar a consulta às 20 OS mais recentes.

`GET /maintenance` e `GET /maintenance/my-orders` aceitam `page`, `limit`, `status` e `search`; somente a listagem interna geral aceita `origin=INTERNAL|CONTRACTOR`. Os portais de cliente e parceiro mantêm seus escopos próprios por empresa e autor, respectivamente. Uma falha de consulta aparece como erro com opção de tentar novamente, não como lista vazia.

Regressão da interface: `pnpm test:maintenance:browser`, após `pnpm validate:isolated`. O teste usa respostas sintéticas e não grava no banco compartilhado.

## Criação de OS e upload em duas etapas

```ts
POST /maintenance           → cria a OS, devolve id
POST /maintenance/:id/attachments  → sobe os arquivos
```

**A segunda etapa pode falhar depois da primeira ter sucesso.** Isso já causou um bug grave em produção: terceirizados viam erro, achavam que a OS não foi criada, tentavam de novo, e geravam duplicatas em série (um usuário criou 10 OS em 20 minutos).

O tratamento correto — já implementado em ambas as páginas — rastreia o id antes do try e distingue os dois casos:

```ts
let createdId: string | undefined;
try {
    const created = await apiClient.post(...);
    createdId = created?.data?.id ?? created?.id ?? created?.data?.data?.id;
    await uploadMaintenanceAttachments(basePath, createdId, localFiles, fetchOpts);
    // sucesso
} catch (e: any) {
    if (createdId) {
        // OS existe — NÃO deixe o usuário retentar o formulário
        toast.warning("OS criada! Erro ao enviar arquivos. Abra a OS na lista para adicionar as fotos.");
        setTab("list");
    } else {
        toast.error(e.message);
        throw e;   // relança para o wizard preservar os arquivos locais
    }
}
```

**Não simplifique esse bloco.** O `throw e` no ramo `else` é intencional: o `os-form-wizard.tsx` captura para manter `localFiles` e permitir retry sem reanexar.

## Blocos de acompanhamento (só `INSTALACAO_SALA`)

`MaintenanceOSFollowupBlock` com `type`: `TEXT` | `MEDIA` | `SIGNATURE`. Bloco com `isLocked: true` (assinatura confirmada) é **imutável** — a API rejeita alteração.

Além disso, quando `formData.witnessSignature` existe numa OS `INSTALACAO_SALA`, o formulário inteiro fica travado (`isSignatureLocked` no frontend, validado também no serviço).

## Armazenamento e entrega de mídia

`maintenance-media-storage.service.ts` tem duas estratégias:

- **Supabase Storage** quando `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` estão definidos — `filePath` fica prefixado com `supabase:` e o serve redireciona para URL assinada (expiração configurável).
- **Disco local** (`apps/api/uploads/`) como fallback privado — entregue pelo módulo `media` após autorização. Não há `ServeStaticModule` público em `/uploads`.

Limites de upload: **20 MB** por arquivo, **10 arquivos** por request. MIME permitido: imagens (jpeg, png, gif, webp, bmp) e vídeos (mp4, webm, quicktime, x-msvideo).

O upload faz **rollback**: se a persistência no banco falhar, os arquivos já gravados são removidos.

## Segurança e validação

Uploads são classificados pelo cabeçalho binário; extensão e MIME são derivados dos bytes, com nomes aleatórios. Não confiar apenas no nome ou Content-Type enviado. PDF é permitido no acompanhamento correspondente, não no upload de imagens/vídeos de OS.

O bucket Supabase precisa ser privado; o startup recusa configuração pública ou bucket cuja privacidade não possa ser confirmada. Fotos/vídeos dentro do sistema usam a sessão de mídia httpOnly, sem JWT na URL. A chave de CPF não deve ser alterada durante manutenção de JWT.

Assinatura confirmada não tem retificação, inclusive por administrador. As mutações de uma OS são serializadas por trava no PostgreSQL. O bloqueio aplicativo não equivale a assinatura digital certificada nem a congelamento criptográfico de PDF, mídia e metadados. Encerramento interno exige `maintenance.close`.

Ao alterar OS, validar os controllers `/maintenance`, `/client/maintenance` e `/contractor/maintenance`, suas páginas e permissões específicas. Preservar os arquivos locais no wizard quando a criação falhar, e impedir nova criação quando só o upload falhar.

## Referências

- [Autenticação e autorização](autenticacao-e-permissoes.md).
- [Variáveis de ambiente](variaveis-de-ambiente.md).
- [Implantação](implantacao.md).
