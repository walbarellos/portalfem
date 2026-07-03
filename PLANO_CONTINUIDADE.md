# Guia de Continuidade de Projeto — Portal FEM Cultura

Este documento resume as melhorias e integrações implementadas no portal da Fundação de Cultura Elias Mansour (FEM), descrevendo o progresso de hoje e mapeando as etapas pendentes para a finalização e publicação do projeto.

---

## 🚀 1. Trabalho Realizado Hoje (Progresso do Projeto)

### A. Notícias Históricas Integradas com Sucesso
* **Raspagem de Corpo Completo:** O script `scrape_noticias.py` foi atualizado para varrer de forma completa o conteúdo HTML de **todas as 126 notícias** das 14 páginas selecionadas do portal antigo.
* **Tratamento de Lazy-Loading e Imagens:** Corrigimos o tratamento de imagens lazy-loaded (atributos `data-lazy-src`), baixamos todas as imagens de destaque e imagens internas, fazendo upload para a biblioteca do Directus e reescrevendo as URLs no HTML para o endpoint `/api/file/<uuid>` local.
* **Limpeza e Eliminação de Mock-data:** Removemos os dados fictícios originais (IDs 1-8) que continham datas futuras (2026) e causavam desordenamento na listagem, deixando o acervo com **119 notícias válidas** com suas datas históricas de publicação preservadas.
* **Ajuste na Exibição (Sem Imagem Duplicada):** O arquivo `noticias/[id].astro` foi editado para remover a imagem de destaque do topo da página de leitura, evitando duplicação visual com as imagens já embutidas no conteúdo do post, mantendo a imagem apenas no cabeçalho de SEO.
* **Ajuste de Limite de Rotas Estáticas:** Elevamos o limite do `getStaticPaths` do Astro de 100 para 500 no arquivo de rotas das notícias, gerando a compilação completa de todas as notícias sem páginas quebradas (404).

### B. Correção dos Filtros de Editais (Banco & API)
* **Configuração de Relação no Directus:** Criamos a relação formal Many-to-One (M2O) em `/relations` no Directus mapeando a coluna `categoria` de `editais` para a coleção `categorias_editais`.
* **Resolução do Bug "Filtro Zerado":** Isso corrigiu o problema em que o Directus retornava apenas o ID numérico bruto em vez de resolver o objeto com a propriedade `.slug` nas requisições do frontend, permitindo que a filtragem por categoria (ex: *Lei Paulo Gustavo*, *FEC*, etc.) no menu lateral funcione de ponta a ponta.
* **Persistência de Setup:** Adicionamos o helper `createRelation` ao script `setup.ts` para garantir que qualquer recriação futura do banco configure a FK automaticamente.

### C. Espaços Culturais CMS-Driven com Imagens
* **Carga de Imagens Reais:** Atualizamos o `load_espacos_to_directus.py` para limpar duplicados e carregar com sucesso as fotos reais de cada um dos **15 espaços**, incluindo a imagem específica fornecida para o *Cine Recreio*.
* **Migração do Frontend:** Alteramos `espacos.astro` e `espacos/[id].astro` para que os dados e imagens sejam puxados dinamicamente do banco de dados Directus ao invés do fallback estático.
* **Categorização Manual:** Atribuímos manualmente as categorias corretas no JSON para os 4 espaços que estavam sem tag:
  * *O Casarão* -> `centro_cultural`
  * *Usina de Arte João Donato* -> `centro_cultural`
  * *Salão Cultural Cordélia Lima* -> `centro_cultural`
  * *Casa dos Povos da Floresta* -> `espaco_memoria`

### D. Git Sincronizado
* Commits realizados e enviados com sucesso para a branch `main` da origem (`git@github.com:walbarellos/portalfem.git`).

---

## 📊 2. Estado Atual do Sistema

* **Banco de Dados Local (Directus):**
  * `editais`: 38 publicados, todos com resultados e anexos mapeados.
  * `noticias`: 119 publicadas, sem duplicatas, com links internos ("Clique Aqui") e imagens embutidas apontando para a API local.
  * `espacos_culturais`: 15 publicados, todos com imagem e tags de categoria corretas.
* **Compilação do Frontend (Astro):** O build final (`npm run build`) roda com sucesso em menos de 2 segundos, pré-renderizando todas as páginas estáticas perfeitamente.

---

## 🎯 3. Próximos Passos (O que ainda falta)

### Fase A: Deploy e Configurações de Servidor
1. **Configuração de Variáveis de Ambiente no Servidor:** Ajustar as variáveis `PUBLIC_DIRECTUS_URL` e `DIRECTUS_TOKEN` no ambiente de homologação/produção para que o frontend se conecte ao banco definitivo da FEM.
2. **Carga Inicial em Produção:** Rodar os scripts de importação de editais, notícias e espaços apontando para a URL do Directus de produção utilizando o token de administrador do servidor oficial.

### Fase B: Auditoria de SEO e Performance
1. **Validação de Sitemap e Robots.txt:** Garantir que o sitemap gerado pelo `@astrojs/sitemap` contenha as novas URLs geradas dinamicamente e submeter para o Google Search Console.
2. **Teste de Links Quebrados:** Rodar uma ferramenta de varredura de links (ex: `linkchecker`) na versão de homologação para garantir que nenhuma notícia antiga faça referência a domínios de testes ou URLs de desenvolvimento local.

### Fase C: Ajustes Finais de UI/UX
1. **Verificação de Acessibilidade (VLibras):** Garantir que o widget do VLibras carregue sem problemas de CSP (Content Security Policy) em produção.
2. **Páginas Institucionais:** Revisar se existem páginas institucionais pendentes de preenchimento (ex: "Quem Somos" ou "Organograma") na coleção `paginas_institucionais` no Directus.
