"""Agente experimental Gemini (apenas nivel gratuito), limitado a um arquivo. Sem deploy."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

target = Path("src/comparator_search.mjs")
original = target.read_text(encoding="utf-8")
token = os.environ.get("GEMINI_API_KEY")
if not token:
    raise SystemExit("GEMINI_API_KEY ausente: nenhuma chamada de IA executada")
prompt = (
    "Revise este modulo JavaScript de filtro de produtos. Corrija apenas bugs objetivos "
    "de correspondencia de texto, normalizacao e selecao, preservando a API exportada. "
    "Nao adicione dependencias, rede, arquivos ou efeitos colaterais. "
    "Retorne SOMENTE o conteudo completo do arquivo JavaScript, sem markdown. "
    "Se nao houver correcao segura, retorne o arquivo inalterado.\n\n" + original
)
model = (os.environ.get("AI_MODEL") or "gemini-2.5-flash").strip()
if model not in ("gemini-2.5-flash", "gemini-2.5-flash-lite"):
    raise SystemExit("Modelo fora da lista gratuita permitida.")
payload = json.dumps({
    "contents": [{"parts": [{"text": prompt}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4000},
}).encode("utf-8")
req = Request(
    "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    data=payload,
    headers={"x-goog-api-key": token,
             "Content-Type": "application/json",
             "Accept": "application/json"},
    method="POST",
)
try:
    with urlopen(req, timeout=90) as response:
        result = json.load(response)
except Exception as exc:
    raise SystemExit("Gemini indisponivel ou cota gratuita excedida; nenhuma alteracao realizada: " + str(exc))
try:
    proposal = "".join(part.get("text", "") for part in result["candidates"][0]["content"]["parts"]).strip()
except (KeyError, IndexError, TypeError) as exc:
    raise SystemExit("Resposta sem codigo gerado; nenhuma alteracao realizada.") from exc
if proposal.startswith("```"):
    proposal = "\n".join(proposal.splitlines()[1:-1]).strip()
if not proposal or len(proposal) > 30000 or "import(" in proposal or "fetch(" in proposal:
    raise SystemExit("Proposta rejeitada por verificacoes preventivas.")
if proposal != original.strip():
    target.write_text(proposal + "\n", encoding="utf-8")
    print("Proposta gerada; testes e revisao de PR obrigatorios.")
else:
    print("Nenhuma alteracao necessaria.")
