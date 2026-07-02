# Ciclo 00 — Raspagem `/editais/` → Encaixe no schema Directus

Método Caracol + Cascata. Um arquivo por responsabilidade, ciclos sequenciais gated.

## Pipeline

```
femcultura.ac.gov.br/editais/
        │
        ▼
scrape_editais.py  ──►  raw_tree.json
  (Stage A: coleta bruta, sem interpretação semântica)
        │
        ▼
classify_and_transform.py  ──►  out/editais.json
  (Stage B: classificação +          out/categorias_editais.json
   encaixe no schema Directus)       out/resultados.json
                                      out/chamamentos.json
                                      out/_nao_classificados.json
```

## Como rodar

```bash
pip install requests beautifulsoup4

python3 scrape_editais.py https://www.femcultura.ac.gov.br/editais/ --out raw_tree.json
python3 classify_and_transform.py --in raw_tree.json --out-dir out
```

## Restrição conhecida (bloqueio no meu ambiente, não no seu)

O `robots.txt` do site impediu minha ferramenta de fetch de baixar o HTML real,
então **não vi o DOM verdadeiro**. `scrape_editais.py` foi escrito com heurísticas
genéricas de WordPress (procura o container de conteúdo com mais `<a>`, desce
recursivamente `<ul>/<ol>` aninhados, com fallback por headings se não achar lista).

**Gate para o Ciclo 01:** depois de rodar Stage A, confira o campo
`"extraction_mode"` em `raw_tree.json`:
- `"nested-list"` → provavelmente pegou certo, mas confira 2-3 editais manualmente.
- `"fallback-headings"` → a estrutura real não é `<ul>/<ol>`; me manda o HTML de um
  trecho (`view-source:` de um item tipo "EDITAL Nº 006/2023") que eu ajusto o
  seletor em `find_content_root()`/`walk_list()`.

## Regras de classificação (Stage B)

| Padrão no texto | Classificado como |
|---|---|
| `EDITAL Nº...`, `EDITAL DE CHAMAMENTO PÚBLICO...`, `EDITAL DE CREDENCIAMENTO...` | `edital` (vira registro `Edital`) |
| `PNAB`, `LEI PAULO GUSTAVO`, `FUNDO ESTADUAL DE CULTURA - <ano>`, `CHAMAMENTOS PÚBLICOS - <ano>` | `categoria` (vira `CategoriaEdital`, agrupa os editais filhos) |
| `RESULTADO...`, `RETIFICAÇÃO`, `PORTARIA`, `HABILITAÇÃO`, `ERRATA` | `resultado` (vira `Resultado`, linkado por `numero_edital_relacionado`) |
| `ANEXO...`, `APÊNDICE...`, `FICHA DE INSCRIÇÃO`, `FORMULÁRIO...`, `MINUTA`, `TERMO DE COMPROMISSO` | `anexo` (embutido em `Edital.anexos[]`) |
| `CHAMAMENTO PÚBLICO GERAIS` e filhos soltos (fora do padrão edital/PNAB) | `chamamento` (vira `Chamamento` avulso) |

Tudo que a heurística não reconhece cai em `_nao_classificados.json` — nada é
descartado silenciosamente, só fica de fora do "lego" até revisão manual.
São candidatos esperados: `LINK PARA EMISSÃO DE CERTIDÕES`, `LOGOS PARA OS PROJETOS`,
os links de navegação do topo (`ACRE.GOV.BR`, `DIÁRIO OFICIAL`, etc — esses devem
ficar fora mesmo, são nav global, não conteúdo de editais).

## O que ainda falta pro Ciclo 01 (não fiz aqui, é o próximo passo)

1. **Download real dos PDFs** referenciados em `href` (hoje ficam como URL externa
   em `anexos[].arquivo` e `resultados[].arquivo` — o schema Directus espera um
   `uuid` de arquivo já enviado ao `/files` do Directus, não uma URL crua).
2. **Loader** que segue o padrão que você já tem em `scripts/add-campos-edital.cjs`
   e `scripts/simular-edital.cjs`: autenticar no Directus, resolver
   `categoria_slug` → `id` de `categorias_editais` (criando se não existir), então
   `POST /items/editais`, `POST /items/resultados` (resolvendo
   `numero_edital_relacionado` → `id` do edital já criado), `POST /items/chamamentos`.
3. **Datas** (`data_abertura`/`data_encerramento`) — o menu não traz datas
   estruturadas; teriam que vir do PDF do edital (fora de escopo de scraping de
   texto de menu) ou de preenchimento manual depois da importação.

Quer que eu já escreva o loader (`load_to_directus.py` ou `.cjs` no seu padrão) e o
downloader de PDFs agora, ou prefere primeiro rodar o Stage A no seu ambiente e me
mostrar o `raw_tree.json` real pra eu calibrar antes de ir pro Ciclo 01?
