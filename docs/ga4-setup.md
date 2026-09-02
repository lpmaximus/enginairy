# Google Analytics 4 — configuração da Audiência

O painel `/admin/audiencia` tem duas metades. A de cima é o GA4 (visitante
anônimo: de onde veio, o que abriu, qual CTA clicou). A de baixo é o banco do
Enginairy (quem tem conta). Sem as credenciais abaixo, só a metade de baixo
aparece — o painel não quebra, mostra o aviso e segue.

> **Nota sobre AdSense.** O AdSense é a plataforma de *anúncios* do Google: ele
> serve para ganhar dinheiro exibindo publicidade, não para medir visita nem
> clique em CTA. Quem mede isso é o Analytics. Se um dia a Enginairy quiser
> exibir anúncios, o AdSense entra por cima disso, sem substituir nada aqui.

## 1. Criar a propriedade e pegar o ID de medição

1. <https://analytics.google.com> → **Administrador** → **Criar** → Propriedade.
2. Nome `Enginairy`, fuso `(GMT-03:00) Brasília`, moeda `BRL`.
3. Em **Fluxos de dados** → **Web**, informe `https://enginairy.com`.
4. Copie o **ID de medição** (formato `G-XXXXXXXXXX`).

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

Essa variável é pública por natureza — ela vai no HTML. É a única do GA que
pode ser `NEXT_PUBLIC_`.

Sem ela o componente `app/components/Analytics.tsx` não renderiza nada, o que é
o comportamento desejado em desenvolvimento e nos previews: só produção entra
na propriedade.

## 2. Registrar a dimensão personalizada `cta_id`

O site dispara um evento único `cta_click` com o parâmetro `cta_id` (a lista de
CTAs vive em `src/lib/analytics.ts`). O GA4 **não** relata parâmetro de evento
enquanto ele não virar dimensão registrada:

1. **Administrador** → **Definições personalizadas** → **Criar dimensão
   personalizada**.
2. Nome da dimensão: `cta_id` · Escopo: **Evento** · Parâmetro do evento:
   `cta_id`.

Feito isso, o card “Cliques em CTA” do painel começa a listar cada botão. Antes
disso ele aparece vazio — de propósito, não é erro.

Dados de evento só entram no relatório a partir do registro; a dimensão não é
retroativa. Registre antes de rodar campanha.

## 3. Autenticar a leitura server-side (OAuth, não conta de serviço)

O painel lê o GA4 pela **Data API**. A forma "de livro" seria uma conta de
serviço com uma chave JSON — mas o Google Cloud, desde jan/2026, bloqueia por
padrão a criação dessa chave em projetos novos/pessoais (política de
organização `iam.disableServiceAccountKeyCreation`), e contas Google normais
não têm permissão para desativar essa política. A alternativa que funciona sem
esbarrar nisso é autenticar como o **próprio usuário** dono da propriedade
GA4, via OAuth, com um refresh token de longa duração gerado uma única vez.

1. <https://console.cloud.google.com> → crie (ou escolha) um projeto.
2. **APIs e serviços** → **Biblioteca** → ative **Google Analytics Data API**.
3. **Google Auth Platform** → **Marca**: preencha nome do app, e-mail de
   suporte, e (para poder publicar depois) URL da página inicial e da
   política de privacidade — em **Domínios autorizados**, adicione o domínio
   do site (ex. `enginairy.com`).
4. **Público-alvo**: tipo de usuário **Externo**; em **Usuários de teste**,
   adicione o e-mail da conta dona da propriedade GA4.
5. **Acesso a dados** → **Adicionar ou remover escopos** → em "Adicionar
   escopos manualmente", cole `https://www.googleapis.com/auth/analytics.readonly`
   → **Adicionar à tabela** → **Atualizar** → **Save**.
6. **Clientes** → **Criar cliente** → tipo **Aplicativo da Web**. Em **URIs de
   redirecionamento autorizados**, adicione
   `https://developers.google.com/oauthplayground` (usado só para gerar o
   token no passo seguinte). Guarde o **ID do cliente** e a **Chave secreta**.
7. Volte em **Público-alvo** e clique **Publicar app** (confirme "Enviar para
   produção"). **Isso é obrigatório**: em status "Testando" o Google expira o
   refresh token em 7 dias; em produção (mesmo sem passar pela verificação do
   Google — o aviso "app não verificado" na tela de consentimento não impede
   nada) ele não expira.
8. Em <https://developers.google.com/oauthplayground>, clique no ícone de
   engrenagem (canto superior direito), marque **Use your own OAuth
   credentials** e cole o ID e a chave secreta do passo 6. Em **Access type**
   deixe **Offline**.
9. Na caixa de escopo (Step 1), cole
   `https://www.googleapis.com/auth/analytics.readonly` → **Authorize APIs** →
   faça login com a conta dona da propriedade GA4 → aceite os avisos ("Google
   não verificou este app" é esperado; clique em Avançado/Continuar) →
   Continuar.
10. Ainda no Playground (Step 2), clique **Exchange authorization code for
    tokens**. O JSON de resposta traz o `refresh_token` — copie-o.

O ID numérico da propriedade fica em **Administrador → Detalhes da
propriedade** (canto superior direito, não é o `G-`):

```
GA4_PROPERTY_ID=123456789
GA4_OAUTH_CLIENT_ID=123456-abc.apps.googleusercontent.com
GA4_OAUTH_CLIENT_SECRET=GOCSPX-...
GA4_OAUTH_REFRESH_TOKEN=1//...
```

Na Vercel: *Settings → Environment Variables*, marcando Production (e Preview,
se quiser conferir antes de publicar). **Nunca** commitar essas variáveis.

## 4. Conferir

1. Abra `enginairy.com` numa aba anônima e clique em “Solicitar orçamento”.
2. No GA4, **Relatórios → Tempo real**: a sessão deve aparecer em segundos e o
   evento `cta_click` em até um minuto.
3. Abra `/admin/audiencia`. Os cards de topo devem sair do zero.

O painel guarda a resposta por **10 minutos** por período (cache em memória do
processo): a cota da Data API é por propriedade e cada carregamento custa ~14
relatórios. Se acabou de configurar e o painel ainda mostra o aviso, espere o
cache virar ou troque o período (1/7/30/90 dias têm caches separados).

## O que cada fonte pode e não pode responder

| Pergunta | Fonte |
| --- | --- |
| Quantas pessoas visitaram o site? | GA4 |
| De qual rede social vieram? | GA4 |
| Qual CTA converteu mais? | GA4 |
| Quem entrou no sistema ontem? | banco (`user_activity`) |
| Quantos memoriais o fulano emitiu? | banco |
| O visitante anônimo virou conta? | **nenhuma das duas isoladamente** |

A última linha é o limite real: o GA4 não identifica pessoa e o banco só vê
quem se cadastrou. Ligar as duas pontas exigiria enviar o ID do usuário para o
GA4 no login (`user_id`), o que muda a natureza do dado e precisa entrar na
política de privacidade antes de ser implementado.

## Privacidade

- A tag sobe com Consent Mode: `analytics_storage` concedido, tudo de anúncio
  (`ad_storage`, `ad_user_data`, `ad_personalization`) negado, e `anonymize_ip`
  ligado.
- O `user_activity` do banco nunca grava IP, user-agent nem identificador de
  rastreamento (ver `src/lib/activity.ts`).
- Se um dia o site exibir anúncios ou remarketing, o consentimento passa a
  exigir banner de opt-in — hoje não exige, porque nada de publicidade é
  carregado.
