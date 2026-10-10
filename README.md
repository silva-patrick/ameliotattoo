# Amélio Tattoo Designer

Site do estúdio **Amélio Tattoo Designer**, publicado em <https://www.ameliotattoo.com.br> pelo GitHub Pages (plano gratuito).

O site não tem etapa de build: é HTML, CSS e JavaScript puros. As fotos e os textos que mudam com frequência ficam em arquivos JSON em `content/` e podem ser editados por um painel no navegador, sem usar git.

```
index.html              página inicial
cuidados/index.html     página de cuidados pós-tatuagem
assets/css/main.css     estilos
assets/js/main.js       galeria, lightbox, depoimentos, Instagram, menu
assets/img/besouro.png  logo (besouro) com fundo transparente
content/galeria.json    fotos da galeria (título + estilo)
content/depoimentos.json
content/avaliacoes.json  avaliações do Google em destaque (até 6) + link do perfil
content/site.json       foto do topo, foto do tatuador, fotos do "Como funciona"
content/instagram.json  preenchido automaticamente na publicação
content/dados-offline.js  cópia dos JSON para abrir o site offline (gerado automaticamente)
images/amelio-galeria/  todas as fotos (é onde o painel salva os envios)
admin/                  painel de edição (Sveltia CMS)
scripts/instagram.mjs   busca os posts do Instagram durante a publicação
scripts/gerar-dados-offline.ps1  gera content/dados-offline.js
.github/workflows/deploy.yml        publica o site no GitHub Pages
.github/workflows/dados-offline.yml mantém content/dados-offline.js atualizado
```

## Ver o site no computador

Basta abrir o `index.html` com dois cliques.

O navegador não deixa uma página aberta do computador (`file://`) ler arquivos `.json`. Nesse caso, o site usa `content/dados-offline.js`, uma cópia dos JSON de `content/`. Essa cópia é atualizada sozinha no GitHub sempre que o conteúdo muda (workflow *Atualizar dados offline*), então basta dar `git pull` depois de editar pelo painel.

Se você editar os JSON à mão no computador, regenere a cópia antes de abrir offline:

```
powershell -ExecutionPolicy Bypass -File scripts/gerar-dados-offline.ps1
```

Offline, a seção do Instagram mostra as fotos da galeria: os posts reais são baixados só durante a publicação.

## Configuração inicial (uma vez)

### 1. Publicar pelo GitHub Actions

Em **Settings → Pages → Build and deployment → Source**, escolha **GitHub Actions**.

A partir daí, o workflow `Publicar site` roda a cada push na `main` (inclusive as alterações feitas pelo painel) e também uma vez por dia, para atualizar o Instagram. O domínio personalizado continua configurado pelo arquivo `CNAME`.

### 2. Acesso ao painel para o tatuador

O painel fica em <https://www.ameliotattoo.com.br/admin/>. Ele grava as alterações direto no repositório pela API do GitHub, então quem edita precisa de um token com permissão de escrita neste repositório.

1. Em GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**, clique em **Generate new token**.
2. **Repository access**: *Only select repositories* → `ameliotattoo`.
3. **Permissions → Repository permissions → Contents**: *Read and write*.
4. Escolha a validade (máximo de 1 ano) e gere o token.
5. No painel, clique em **Entrar Usando Token de Acesso** e cole o token. O navegador lembra o login.

O token pode ser gerado na sua conta (o mais simples) ou na conta do tatuador, se ele tiver uma e for adicionado como colaborador do repositório. Anote a data de expiração para gerar um novo token antes de vencer.

> O botão **Entrar com GitHub** do painel só funciona com um servidor de autenticação OAuth (por exemplo, o [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) num Cloudflare Worker gratuito). Para um único editor, o token é suficiente.

### 3. Instagram (opcional)

Sem configuração, a seção do Instagram mostra 4 fotos da galeria com link para o perfil. Para exibir os posts reais:

1. O perfil `@ameliotattoodesigner` precisa ser **profissional** (Criador de conteúdo ou Empresa). Isso é configurado no app do Instagram e é gratuito.
2. Em <https://developers.facebook.com>, crie um app do tipo **Empresa** e adicione o produto **Instagram → API com login do Instagram**.
3. Em *Gerar tokens de acesso*, adicione a conta do Instagram e gere o token (ele já é de longa duração, válido por 60 dias).
4. No repositório: **Settings → Secrets and variables → Actions → New repository secret**
   - Nome: `INSTAGRAM_TOKEN`
   - Valor: o token gerado.
5. Rode o workflow manualmente em **Actions → Publicar site → Run workflow**.

O workflow renova o token a cada execução diária, então ele não deve expirar enquanto o site for publicado ao menos uma vez a cada 60 dias. Se a Meta devolver um token diferente na renovação, o workflow só consegue salvá-lo sozinho se existir também o secret `GH_ADMIN_TOKEN`: um fine-grained token deste repositório com permissão **Secrets: Read and write**. Sem ele, o log do workflow mostra um aviso e o token precisa ser atualizado manualmente.

Atenção: o GitHub pausa workflows agendados de repositórios sem nenhum commit há 60 dias. Qualquer edição pelo painel conta como commit; se o site ficar muito tempo sem mudanças, reative o workflow na aba **Actions**.

---

## Guia rápido para o tatuador

**Endereço do painel:** <https://www.ameliotattoo.com.br/admin/>

**Adicionar uma tatuagem na galeria**
1. Entre no painel e abra **Site → Galeria de tatuagens**.
2. Clique em **Adicionar foto**. A foto nova entra no topo da lista e aparece primeiro no site.
3. Em **Foto**, envie a imagem (pode ser direto do celular; ela é otimizada automaticamente).
4. Preencha o **Título** e escolha o **Estilo** (é o que aparece nos filtros da galeria).
5. Clique em **Salvar**. Em 1 ou 2 minutos o site está atualizado.

**Reordenar ou remover:** na mesma tela, arraste as fotos para mudar a ordem ou use o menu de cada foto para removê-la. Depois, **Salvar**.

**Depoimentos:** **Site → Depoimentos** (nome do cliente, texto e uma foto da tatuagem).

**Avaliações do Google:** **Site → Avaliações do Google**. Cadastre até 6 avaliações (copie o texto exatamente como está no Google), a nota, o total e o link do perfil. A seção só aparece no site quando houver pelo menos uma avaliação.

**Fotos de destaque:** **Site → Fotos de destaque** troca a foto grande do topo, a sua foto na seção "Quem sou" e as duas fotos de "Como funciona".
