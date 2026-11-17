"""Agente experimental limitado a um arquivo, sem acesso a segredos da aplicacao."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

target = Path("src/comparator_search.mjs")
original = target.read_text(encoding="utf-8")
token = os.environ.get("GITHUB_TOKEN")
if not token:
    raise SystemExit("GITHUB_TOKEN indisponivel")
prompt = (
    "Revise este modulo JavaScript de filtro de produtos. Corrija apenas bugs objetivos "
    "de correspondencia de texto, normalizacao e selecao, preservando a API exportada. "
    "Nao adicione dependencias, rede, arquivos ou efeitos colaterais. "
    "Retorne SOMENTE o conteudo completo do arquivo JavaScript, sem markdown. "
    "Se nao houver correcao segura, retorne o arquivo inalterado.\n\n" + original
)
payload = json.dumps({
    "model": "openai/gpt-4o-mini",
    "messages": [{"role": "user", "content": prompt}],
    "temperature": 0,
    "max_tokens": 3500,
}).encode()
req = Request(
    "https://models.github.ai/inference/chat/completions",
    data=payload,
    headers={"Authorization": "Bearer " + token,
             "Content-Type": "application/json",
             "Accept": "application/vnd.github+json",
             "X-GitHub-Api-Version": "2022-11-28"},
)
try:
    with urlopen(req, timeout=90) as response:
        result = json.load(response)
except Exception as exc:
    raise SystemExit("GitHub Models indisponivel; nenhuma alteracao realizada: " + str(exc))
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
