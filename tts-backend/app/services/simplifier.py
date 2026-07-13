import re
from typing import Dict, List, Any

class SimplifierService:
    @staticmethod
    def simplify_edital(text: str) -> Dict[str, Any]:
        """
        Processa o texto completo de um edital e extrai as informações estruturadas
        em linguagem simples, cronograma, checklist e FAQ.
        """
        # Limpeza básica de espaços extras
        clean_text = re.sub(r'[ \t]+', ' ', text)
        lines = [line.strip() for line in clean_text.split('\n') if line.strip()]

        # Executa a extração dos blocos
        title = SimplifierService._extract_title(clean_text)
        resumo = SimplifierService._generate_simple_resumo(clean_text, lines)
        cronograma = SimplifierService._extract_cronograma(clean_text, lines)
        checklist = SimplifierService._extract_checklist(clean_text, lines)
        faq = SimplifierService._generate_faq(clean_text, resumo, cronograma)

        return {
            "titulo": title,
            "resumo": resumo,
            "cronograma": cronograma,
            "requisitos": checklist,
            "faq": faq
        }

    @staticmethod
    def _extract_title(text: str) -> str:
        """Tenta extrair o título/cabeçalho do edital."""
        # Busca padrão comum de editais brasileiros
        match = re.search(r'(EDITAL[^\d\n]*Nº?\s*\d+[\/\-]\d+[^•\n]*)', text, re.IGNORECASE)
        if match:
            return match.group(1).strip().title()
        
        # Fallback
        return "Edital de Processo Seletivo / Concurso Público"

    @staticmethod
    def _generate_simple_resumo(text: str, lines: List[str]) -> str:
        """Gera um resumo do objetivo do concurso, vagas e remuneração."""
        # Procurar por menções de valores salariais
        salarios = []
        salario_patterns = [
            r'R\$\s*([1-9]\d{2,3}(?:\,\d{2})?)',
            r'remuneração[^\d\n]*R\$\s*([1-9]\d{0,2}(?:\.\d{3})*(?:\,\d{2})?)',
            r'vencimento[^\d\n]*R\$\s*([1-9]\d{0,2}(?:\.\d{3})*(?:\,\d{2})?)'
        ]
        
        for pat in salario_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            for m in matches:
                if m not in salarios:
                    salarios.append(m)

        vagas_match = re.search(r'(\d+)\s*(?:vagas|oportunidades)', text, re.IGNORECASE)
        vagas = vagas_match.group(1) if vagas_match else "a definir"

        # Tenta pegar as primeiras linhas explicativas
        objetivo = ""
        for line in lines[:30]:
            if any(x in line.lower() for x in ["destina-se", "objeto de", "finalidade", "objetivo", "visa o preenchimento"]):
                objetivo = line
                break
        
        if not objetivo and len(lines) > 2:
            # Pega uma das primeiras linhas que não seja título curto
            for line in lines[2:10]:
                if len(line) > 50:
                    objetivo = line
                    break

        # Constrói o texto em linguagem simples
        salario_info = f" com salários de até R$ {salarios[0]}" if salarios else ""
        resumo_text = (
            f"Este edital anuncia a realização de um Processo Seletivo/Concurso Público. "
            f"O objetivo principal é a contratação de profissionais para preenchimento de vagas na administração pública."
        )
        
        if objetivo:
            resumo_text += f"\n\n<b>O que diz o texto oficial:</b> {objetivo}"
            
        resumo_text += f"\n\n<b>Resumo prático:</b> Estão previstas cerca de {vagas} vagas{salario_info}. As contratações seguem a legislação estadual aplicável."
        return resumo_text

    @staticmethod
    def _extract_cronograma(text: str, lines: List[str]) -> List[Dict[str, str]]:
        """Extrai datas importantes associadas a eventos do edital."""
        cronograma = []
        
        # Padrões de datas
        date_pattern = r'(\d{2}/\d{2}(?:\/\d{2,4})?)'
        
        # Procura linhas que contêm datas e palavras do calendário
        keywords = ["inscrição", "inscrições", "prova", "isenção", "resultado", "gabarito", "recurso", "homologação", "matrícula"]
        
        for line in lines:
            if any(kw in line.lower() for kw in keywords):
                dates = re.findall(date_pattern, line)
                if dates:
                    # Tenta extrair a descrição limpando a data da linha
                    desc = line
                    for d in dates:
                        desc = desc.replace(d, "")
                    
                    # Limpezas extras na descrição
                    desc = re.sub(r'[\-\:\,\;\.\s]+$', '', desc).strip()
                    desc = re.sub(r'^[\-\:\,\;\.\s]+', '', desc).strip()
                    
                    # Evita descrições vazias ou muito longas (tabelas inteiras)
                    if desc and len(desc) < 150:
                        cronograma.append({
                            "data": " a ".join(dates),
                            "evento": desc
                        })

        # Fallback se não achar nada estruturado
        if not cronograma:
            # Procura por datas aleatórias e tenta contextualizar
            dates_found = re.findall(r'(\d{2}/\d{2}/\d{4})', text)
            if dates_found:
                # Remove duplicados mantendo a ordem
                dates_found = list(dict.fromkeys(dates_found))
                for i, d in enumerate(dates_found[:4]):
                    events = ["Publicação do Edital", "Período de Inscrição", "Data Prevista das Provas", "Divulgação de Resultados"]
                    cronograma.append({
                        "data": d,
                        "evento": events[i] if i < len(events) else "Etapa Importante do Edital"
                    })
            else:
                cronograma = [
                    {"data": "Ver edital completo", "evento": "Período de inscrições online"},
                    {"data": "A definir", "evento": "Aplicação da Prova Objetiva"}
                ]
                
        return cronograma[:8]  # Limita a 8 itens principais

    @staticmethod
    def _extract_checklist(text: str, lines: List[str]) -> List[str]:
        """Extrai requisitos e obrigações do candidato."""
        checklist = []
        
        # Palavras indicadoras de requisitos
        req_start = False
        req_keywords = ["requisitos básicos", "requisitos para investidura", "dos requisitos", "condições para a inscrição"]
        
        for line in lines:
            # Detecta o início da seção de requisitos
            if any(kw in line.lower() for kw in req_keywords):
                req_start = True
                continue
            
            # Se já iniciou os requisitos, busca itens listados
            if req_start:
                # Se mudou de assunto/título grande, para de extrair
                if len(line) < 30 and line.isupper():
                    # Evita parar no próprio cabeçalho se houver linhas em maiúsculo
                    if not any(x in line.lower() for x in ["requisito", "condições"]):
                        req_start = False
                        continue
                
                # Procura por linhas iniciadas com números, marcadores, hífens ou letras minúsculas (continuação)
                is_bullet = re.match(r'^(?:[a-z]\)|\d+[\.\-\)]|[\-\*•])\s*(.*)', line)
                if is_bullet:
                    item_text = is_bullet.group(1).strip()
                    if len(item_text) > 15:
                        checklist.append(item_text)
                elif line.strip().endswith(';') or line.strip().endswith('.'):
                    # Às vezes não tem marcador claro mas são linhas curtas terminadas em ; ou .
                    if len(line) > 20 and len(line) < 150:
                        checklist.append(line.strip())
                        
            # Limite de itens para não ficar gigante
            if len(checklist) >= 6:
                break
                
        # Fallback genérico se não achou lista no documento
        if not checklist:
            checklist = [
                "Ter nacionalidade brasileira ou portuguesa (conforme a lei).",
                "Estar em dia com a Justiça Eleitoral (ter votado ou justificado).",
                "Ter idade mínima de 18 anos completos na data de contratação.",
                "Apresentar comprovante de escolaridade exigido para o cargo.",
                "Estar em dia com o serviço militar (candidatos do sexo masculino).",
                "Gozar de boa saúde física e mental comprovada por exame médico."
            ]
            
        return checklist

    @staticmethod
    def _generate_faq(text: str, resumo: str, cronograma: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Gera perguntas e respostas frequentes inteligentes baseadas nas informações do edital."""
        # Tenta pegar datas chaves do cronograma
        insc_date = "Verificar no edital completo"
        prova_date = "A ser divulgada pela comissão"
        
        for c in cronograma:
            if "inscri" in c["evento"].lower():
                insc_date = c["data"]
            elif "prova" in c["evento"].lower():
                prova_date = c["data"]

        # Busca taxa de inscrição no texto
        taxa = "a ser consultada na ficha de inscrição"
        taxa_match = re.search(r'(?:taxa|valor)[^\d\n]*R\$\s*([1-9]\d{0,2}(?:\,\d{2})?)', text, re.IGNORECASE)
        if taxa_match:
            taxa = f"R$ {taxa_match.group(1)}"

        # Estrutura do FAQ
        faq = [
            {
                "pergunta": "Como faço para me inscrever no processo?",
                "resposta": f"As inscrições devem ser realizadas de forma online no site da banca organizadora do concurso dentro do período estipulado ({insc_date})."
            },
            {
                "pergunta": "Qual o valor da taxa de inscrição e há isenção?",
                "resposta": f"O valor estimado da taxa é de {taxa}. Geralmente, candidatos de baixa renda inscritos no CadÚnico ou doadores de sangue/medula podem solicitar a isenção do pagamento nas datas iniciais do cronograma."
            },
            {
                "pergunta": "Quando serão aplicadas as provas?",
                "resposta": f"A data limite ou provável para a realização das provas está marcada para {prova_date}. É importante conferir o cartão de confirmação do candidato dias antes da prova."
            },
            {
                "pergunta": "Quais os requisitos mínimos de escolaridade?",
                "resposta": "Os requisitos dependem de cada vaga oferecida no edital, variando entre nível fundamental, médio, técnico ou superior. Você pode verificar os detalhes específicos na aba 'Requisitos & Checklist'."
            }
        ]
        return faq
