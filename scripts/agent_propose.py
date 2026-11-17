"""Agente experimental limitado a um arquivo, sem acesso a segredos da aplicacao."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

target = Path("src/comparator_search.mjs")
original = target.read_text(encoding="utf-8")
token = os.environ.get("AI_API_KEY")
base_url = (os.environ.get("AI_BASE_URL") or "https://api.groq.com/openai/v1").rstrip("/")
model = os.environ.get("AI_MODEL") or "openai/gpt-oss-20b"
if not token:
    raise SystemExit("AI_API_KEY nao configurada; sem chamadas de IA nem cobrancas")
if not base_url.startswith("https://"):
    raise SystemExit("AI_BASE_URL deve usar HTTPS")
prompt = (
    "Revise este modulo JavaScript de filtro de produtos. Corrija apenas bugs objetivos "
    "de correspondencia de texto, normalizacao e selecao, preservando a API exportada. "
    "Nao adicione dependencias, rede, arquivos ou efeitos colaterais. "
    "Retorne SOMENTE o conteudo completo do arquivo JavaScript, sem markdown. "
    "Se nao houver correcao segura, retorne o arquivo inalterado.\n\n" + original
)
payload = json.dumps({
    "model": model,
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0,
    "max_tokens": 3500,
}).encode()
req = Request(
    base_url + "/chat/completions",
    data=payload,
    headers={"Authorization": "Bearer " + token,
             "Content-Type": "application/json"},
)
try:
    with urlopen(req, timeout=90) as response:
        result = json.load(response)
except Exception as exc:
    raise SystemExit("Provedor de IA indisponivel; nenhuma alteracao realizada: " + str(exc))
proposal = result["choices"][0]["message"]["content"].strip()
if proposal.startswith("```"):
    proposal = "\n".join(proposal.splitlines()[1:-1]).strip()
if not proposal or len(proposal) > 30000 or "import(" in proposal or "fetch(" in proposal:
    raise SystemExit("Proposta rejeitada por verificacoes preventivas.")
if proposal != original.strip():
    target.write_text(proposal + "\n", encoding="utf-8")
    print("Proposta gerada; testes e revisao de PR obrigatorios.")
else:
    print("Nenhuma alteracao necessaria.")
