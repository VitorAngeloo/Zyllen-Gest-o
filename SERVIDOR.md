# Zyllen Gestão — Iniciar Servidor

## Como usar

Dê **duplo clique** no arquivo `iniciar-servidor.bat` na raiz do projeto. Não é necessário ter o VS Code aberto.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|------------|---------------|------------|
| Node.js    | 18+           | [nodejs.org](https://nodejs.org) |
| pnpm       | 9+            | `npm install -g pnpm` |

---

## O que o script faz

1. **Verifica** se Node.js e pnpm estão instalados
2. **Instala dependências** (`pnpm install`)
3. **Gera o Prisma Client** (`prisma generate`)
4. **Detecta o IP local** da máquina na rede
5. **Inicia os servidores** em janelas minimizadas:
   - **API** (NestJS) na porta `3001`
   - **Web** (Next.js) na porta `3000`

---

## Endereços de acesso

### Acesso local (na própria máquina)

| Serviço | URL |
|---------|-----|
| API     | http://localhost:3001 |
| Web     | http://localhost:3000 |

### Acesso externo (outros dispositivos na mesma rede)

| Serviço | URL |
|---------|-----|
| API     | `http://<IP_DO_SERVIDOR>:3001` |
| Web     | `http://<IP_DO_SERVIDOR>:3000` |

> O IP é exibido automaticamente ao iniciar o script.  
> Exemplo: `http://192.168.1.100:3000`

---

## Encerrar os servidores

Pressione **qualquer tecla** na janela principal do `.bat` — todos os processos serão encerrados automaticamente.

---

## Observações

- O script encerra **todos os processos `node.exe`** ao parar. Se houver outros serviços Node rodando na máquina, encerre manualmente as janelas "Zyllen API" e "Zyllen Web" em vez de usar a tecla de encerramento.
- Para acesso externo funcionar, a **porta 3000 e 3001** devem estar liberadas no firewall do Windows.
- Dispositivos precisam estar na **mesma rede local** (Wi-Fi ou cabo).
