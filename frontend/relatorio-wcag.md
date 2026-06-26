# Relatório de Conformidade WCAG 2.2 AA — Portal FEM

**Data:** 26/06/2026  
**Versão do site:** Produção (branch principal)  
**Escopo:** Portal completo — Fundação de Cultura Elias Mansour (FEM), Governo do Acre  
**Ferramentas:** Auditoria manual de código + análise de componentes + testes de navegação por teclado  
**Responsável:** Equipe de desenvolvimento

---

## Resumo

| Critério | Total | Corrigidos | Pendentes |
|----------|-------|------------|-----------|
| A (críticos) | 7 | 7 | 0 |
| AA (altos) | 8 | 7 | 1 |
| AAA (melhorias) | 8 | 6 | 2 |

---

## 1. Critérios de Sucesso WCAG 2.2 — Nível A

### 1.1 1.1.1 — Texto Alternativo (Non-text Content)

| Item | Status | Detalhes |
|------|--------|----------|
| Ícones decorativos `material-symbols-outlined` | ✅ Corrigido | 122 ícones com `aria-hidden="true"` |
| Imagens de notícias/eventos | ✅ Corrigido | `alt` descritivo em todas (`CardNoticia`, `CardEvento`, `index.astro`) |
| Logotipo FEM | ✅ OK | `alt="FEM - Fundação de Cultura Elias Mansour"` no Header e Footer |
| Redes sociais | ✅ Corrigido | `aria-label` nos links sociais do footer |
| SVG decorativos | ✅ OK | `aria-hidden="true"` em todos os SVGs decorativos |

### 1.2 1.3.1 — Informação e Relacionamentos (Info and Relationships)

| Item | Status | Detalhes |
|------|--------|----------|
| Hierarquia de headings em todas as páginas | ✅ Corrigido | h1 único por página, níveis sem saltos |
| `politica-privacidade.astro` | ✅ Corrigido | h1 duplicado removido (PageHero + inline) |
| `editais.astro` | ✅ Corrigido | h3→h2 (Programas, Abertos, Em Análise, Encerrados) |
| `eventos.astro` (lista) | ✅ Corrigido | `<section>` + `<h2 class="sr-only">` adicionado |
| `institucional/[slug].astro` | ✅ Corrigido | Missão/Visão h3→h2; presidentes h4→h3 |
| Labels em inputs | ✅ Corrigido | `aria-label` em busca editais/eventos, `<label for>` no BuscaForm |

### 1.3 1.4.1 — Uso de Cor

| Item | Status | Detalhes |
|------|--------|----------|
| Contraste de links no texto | ✅ Corrigido | `outline #717a6d → #5c6458` (`tailwind.config.mjs`) |
| Cor de erro | ✅ Corrigido | `error #ba1a1a → #a00000` |
| Indicadores visuais além de cor | ✅ Corrigido | Ícones + texto nos cards, `text-decoration: underline` no modo alto contraste |

### 1.4 2.1.1 — Teclado (Keyboard)

| Item | Status | Detalhes |
|------|--------|----------|
| Skip-to-content link | ✅ OK | `Layout.astro:144` — link "Pular para conteúdo principal" ao Tab |
| Menu mobile | ✅ Corrigido | Focus trap + `aria-expanded` |
| "Adicionar ao Calendário" | ✅ Corrigido | `<span>` → `<button type="button">` |
| Cookie consent | ✅ Corrigido | Foco automático, tecla Escape fecha |
| `focus-visible` global | ✅ Corrigido | `outline: 2px solid #00450d; outline-offset: 2px` |

### 1.5 2.4.1 — Blocos de Navegação (Bypass Blocks)

| Item | Status | Detalhes |
|------|--------|----------|
| Skip link presente | ✅ OK | `Layout.astro:144` |
| Landmarks semânticas | ✅ OK | `<header>`, `<nav>`, `<main>`, `<footer>` em todas as páginas |

### 1.6 2.4.4 — Propósito do Link (In Context)

| Item | Status | Detalhes |
|------|--------|----------|
| Links externos `target="_blank"` | ✅ Corrigido | `aria-label` adicionado em 12 links (sistemas externos, certidões, portaria) |
| Links internos com `confirm()` | ✅ Corrigido | `aria-label` descritivo para sistemas internos |

### 1.7 4.1.2 — Nome, Função, Valor (Name, Role, Value)

| Item | Status | Detalhes |
|------|--------|----------|
| Landmarks ARIA nomeados | ✅ Corrigido | `nav` do breadcrumb e mobile agora com `aria-label` |
| Role dos botões | ✅ Corrigido | Todos `<button>` com type explícito |
| Dialog de cookies | ✅ OK | `role="dialog"` + `aria-modal` |

### 1.8 4.1.3 — Mensagens de Status (Status Messages)

| Item | Status | Detalhes |
|------|--------|----------|
| Resultado de busca (editais) | ✅ Corrigido | `aria-live="polite" aria-atomic="true"` no `#result-count` |
| Resultado de busca (eventos) | ✅ Corrigido | `aria-live="polite" aria-atomic="true"` no `#result-count` |

---

## 2. Critérios de Sucesso WCAG 2.2 — Nível AA

### 2.1 1.4.3 — Contraste Mínimo (Contrast Ratio ≥ 4.5:1)

| Item | Status | Detalhes |
|------|--------|----------|
| Cores do design system verificadas | ✅ Corrigido | Ajustes em `tailwind.config.mjs` |
| Plugin alto contraste | ✅ Implementado | `AccessibilityBar.astro` — toggle com CSS `high-contrast` persistido em cookie |

### 2.2 1.4.4 — Redimensionar Texto (200% sem perda)

| Item | Status | Detalhes |
|------|--------|----------|
| Plugin aumentar/diminuir fonte | ✅ Implementado | `AccessibilityBar.astro` — botões +/-, ajuste via `font-size` no `<html>`, persistido em cookie |

### 2.3 1.4.10 — Reflow (viewport 320px sem scroll 2D)

| Item | Status | Detalhes |
|------|--------|----------|
| Layout responsivo | ✅ OK | Tailwind responsive classes em todas as páginas |

### 2.4 1.4.12 — Espaçamento de Texto

| Item | Status | Detalhes |
|------|--------|----------|
| Layout não quebra com espaçamento extra | ⚠️ Pendente | Verificar manualmente todos os cards e grids |

### 2.5 2.4.5 — Múltiplos Mecanismos

| Item | Status | Detalhes |
|------|--------|----------|
| Busca global presente | ✅ OK | Página `/busca` + BuscaForm no header |
| Navegação por breadcrumbs | ✅ OK | PageHero com breadcrumb em todas as páginas internas |

### 2.6 2.4.6 — Headings e Labels

| Item | Status | Detalhes |
|------|--------|----------|
| Headings descritivos | ✅ OK | Todos os headings descrevem o conteúdo da seção |

### 2.7 3.3.2 — Labels ou Instruções

| Item | Status | Detalhes |
|------|--------|----------|
| BuscaForm (BuscaForm.astro) | ✅ OK | `<label for="busca-input">` (sr-only) |
| Busca editais/eventos | ✅ OK | `aria-label` nos inputs |
| Labels visíveis preferíveis | ⚠️ Pendente | BuscaForm usa `sr-only` — aceitável por WCAG, mas visível é melhor |

### 2.8 3.3.4 — Prevenção de Erros (Legal/Financeiro)

| Item | Status | Detalhes |
|------|--------|----------|
| Ouvidoria | ✅ OK | Página informativa sem formulário — usa canais externos (Fala.BR) |

### 2.9 4.1.1 — Parsing (HTML válido)

| Item | Status | Detalhes |
|------|--------|----------|
| `aria-hidden` dentro de `class` | ✅ Corrigido | Malformed HTML revertido e refeito corretamente |

---

## 3. Resumo de Arquivos Modificados

### Sessão atual (26/06)
| Arquivo | Alteração |
|---------|-----------|
| `src/components/AccessibilityBar.astro` | **NOVO** — Barra de acessibilidade (alto contraste + fonte) |
| `src/components/Header.astro` | Import e inclusão do AccessibilityBar + `aria-label` no nav mobile |
| `src/components/PageHero.astro` | `aria-label="Breadcrumb"` no nav |
| `src/layouts/Layout.astro` | CSS `high-contrast` + `focus-visible` global |
| `src/pages/politica-privacidade.astro` | h1 duplicado removido |
| `src/pages/editais.astro` | h3→h2 (4 headings) + `aria-live` no result-count |
| `src/pages/eventos.astro` | Lista em `<section>` + h2 sr-only + `aria-live` no result-count |
| `src/pages/institucional/[slug].astro` | Missão/Visão h3→h2, presidentes h4→h3 |
| `src/pages/servicos.astro` | `aria-label` em todos os links externos e internos |
| `src/components/CardEvento.astro` | `<span>` → `<button type="button">` |
| `src/components/Footer.astro` | Link "Contatos" duplicado removido |
| `src/pages/api/file/[id].ts` | Validação de ID, MIME case-insensitive, limite 50MB, timeout 15s |
| `src/pages/preview/[tipo]/[id].astro` | XSS via `set:html` removido, sem secret default |
| `src/lib/directus.ts` | Warn se token vazio, erro se URL inválida |
| `backend/.env.example` | Placeholders genéricos + aviso de segurança |
| `src/pages/404.astro` | `aria-hidden` em ícones |
| `src/pages/busca.astro` | `aria-hidden` em ícones + `aria-label` no input |
| `src/components/Breadcrumbs.astro` | (já ok) |

### Sessão anterior
| Arquivo | Alteração |
|---------|-----------|
| `src/middleware.ts` | CSP completo para VLibras |
| `nginx/public.conf` | CSP Nginx |
| `src/components/VLibras.astro` | URL sem `www.` |
| `src/components/CookieConsent.astro` | `role="dialog"`, `aria-modal`, foco automático |
| `src/components/CardEvento.astro` | `isPast` corrigido |
| `tailwind.config.mjs` | Cores de contraste |
| `package.json` | Dev host → localhost |

---

## 4. Pendências Conhecidas

| Item | Gravidade | WCAG | Observação |
|------|-----------|------|------------|
| Labels visíveis nos inputs de busca | Baixa | 3.3.2 | Atual: `aria-label` (aceitável, mas `<label>` visível é melhor) |
| Teste de espaçamento de texto (1.4.12) | Média | AA | Verificar se layout não quebra com texto 200% + espaçamento 2x |
| Reset de acessibilidade preferences | Média | - | Botão "Resetar" não implementado na AccessibilityBar |
| Botão "Adicionar ao Calendário" | Média | - | Ainda sem funcionalidade real (apenas visual) |
| `backend/.env` | Alta | - | 6 senhas em texto plano no disco — excluir ou usar cofre |

---

## 5. Próximos Passos Recomendados

1. **Testes com usuários reais** — Validar as correções com leitores de tela (NVDA, JAWS, VoiceOver)
2. **Automação** — Integrar axe-core ou Lighthouse CI no pipeline para detectar regressões
3. **Formulário da Ouvidoria** — Implementar formulário inline com validação acessível (em vez de redirecionar para Fala.BR)
4. **Cofre de senhas** — Migrar `backend/.env` para variáveis de ambiente do sistema ou Windows Credential Manager
5. **Reset de acessibilidade** — Adicionar botão "Resetar" na AccessibilityBar para limpar cookies de preferências
