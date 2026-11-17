"""Agente local de melhorias limitadas e revisadas; sem publicacao ou merge."""
import json
import os
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen

# Lista fechada. Agente nao altera arquivos sensiveis, credenciais, Workers ou D1.
TASKS = {
    "src/comparator_search.mjs": (
        "Revise busca de produtos: normalizacao, especificacoes e correspondencia exata. "
        "Mantenha a interface de funcoes exportadas e os testes existentes."
    ),
    "src/product_images.mjs": (
        "Revise validacao de URL de fotos para bugs, sem mudar productImageHosts, "
        "incluir novos dominios ou afrouxar o bloqueio de URLs inseguras."
    ),
    "scripts/check-public-catalog.mjs": (
        "Revise apenas bugs da auditoria publica de catalogo. Mantenha verificacao de "
        "fotos, preco, loja, URL HTTPS, paginacao e comportamento somente leitura."
    ),
}


def choose_task(run_number):
    if run_number < 1:
        raise ValueError("Numero de execucao invalido")
    return tuple(TASKS)[(run_number - 1) % len(TASKS)]


def exported_api(source):
    return tuple(sorted(re.findall(
        r"^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)",
        source, re.MULTILINE,
    )))


def validate_proposal(path, original, proposal):
    """Checagens adicionais aos testes Node e revisao de Pull Request."""
    if not proposal or len(proposal) > 20000 or len(proposal) > 2 * len(original) + 1000:
        raise ValueError("Arquivo proposto ausente ou muito grande")
    if exported_api(proposal) != exported_api(original):
        raise ValueError("API exportada alterada")
    banned = ("eval(", "new Function(", "child_process", "execSync(", "process.env.",
              "github.com/", "workers.dev/", "GEMINI_API_KEY")
    for token in banned:
        if token in proposal and token not in original:
            raise ValueError("Nova operacao proibida: " + token)
    # Evitar introduzir acesso a rede em modulos que sao funcoes locais.
    if path.startswith("src/") and ("fetch(" in proposal or "import(" in proposal):
        raise ValueError("Acesso a rede/importacao dinamica proibida")
    if path == "src/product_images.mjs":
        match = r"export const productImageHosts\s*=\s*\[[\s\S]*?\];"
        old_hosts = re.search(match, original)
        new_hosts = re.search(match, proposal)
        if not old_hosts or not new_hosts or old_hosts.group() != new_hosts.group():
            raise ValueError("Lista de dominios de fotos nao pode ser alterada")
    if path == "scripts/check-public-catalog.mjs":
        if "await checkCatalog" not in proposal or "new URL('/api/offers'" not in proposal:
            raise ValueError("Auditoria publica essencial removida")


def run_model(target, original, task):
    token = os.environ.get("GEMINI_API_KEY")
    backend = (os.environ.get("AI_BACKEND") or ("gemini" if token else "ollama")).strip()
    if backend not in ("gemini", "ollama"):
        raise ValueError("Backend nao permitido")
    prompt = (
        "Voce revisa UMA funcao pequena da loja Vitrine Radar. So corrija um bug objetivo. "
        "Se o arquivo estiver correto, retorne o arquivo SEM modificacoes. "
        "Nao adicione bibliotecas, rede, logins, imports dinamicos, URLs ou novos arquivos. "
        "Nao altere as exportacoes, filtros de seguranca ou formatos de dados. "
        "Retorne SOMENTE o arquivo JavaScript completo, sem markdown.\n"
        f"Arquivo: {target}\nTarefa: {task}\n"
        "Codigo atual:\n" + original
    )
    if backend == "gemini":
        if not token:
            raise ValueError("Gemini nao configurado")
        model = (os.environ.get("AI_MODEL") or "gemini-2.5-flash-lite").strip()
        if model not in ("gemini-2.5-flash", "gemini-2.5-flash-lite"):
            raise ValueError("Modelo Gemini fora da lista aprovada")
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 3000},
        }
        request = Request(
            "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
            data=json.dumps(body).encode(),
            headers={"x-goog-api-key": token, "Content-Type": "application/json",
                     "Accept": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=120) as response:
            result = json.load(response)
        return "".join(part.get("text", "") for part in result["candidates"][0]["content"]["parts"]).strip()
    body = {
        "model": "qwen2.5-coder:1.5b",
        "prompt": prompt, "stream": False,
        "options": {"temperature": 0.1, "num_ctx": 4096, "num_predict": 2300},
    }
    request = Request(
        "http://127.0.0.1:11434/api/generate",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=360) as response:
        result = json.load(response)
    return str(result["response"]).strip()


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "--choose":
        print(choose_task(int(sys.argv[2])))
        return
    target_name = (os.environ.get("AI_TARGET") or "src/comparator_search.mjs").strip()
    if target_name not in TASKS:
        raise SystemExit("Arquivo nao autorizado para o agente")
    target = Path(target_name)
    original = target.read_text(encoding="utf-8")
    if len(original) > 10000:
        raise SystemExit("Arquivo grande demais para o modelo gratuito")
    try:
        proposal = run_model(target_name, original, TASKS[target_name])
    except Exception as exc:
        raise SystemExit("Modelo indisponivel, sem alteracoes: " + str(exc)) from exc
    if proposal.startswith("```"):
        proposal = "\n".join(proposal.splitlines()[1:-1]).strip()
    if proposal == original.strip():
        print("Nenhuma alteracao segura necessaria em " + target_name)
        return
    try:
        validate_proposal(target_name, original, proposal)
    except ValueError as exc:
        raise SystemExit("Proposta rejeitada: " + str(exc)) from exc
    target.write_text(proposal.rstrip() + "\n", encoding="utf-8")
    print("Proposta limitada a " + target_name + "; testes e revisao de PR obrigatorios.")


if __name__ == "__main__":
    main()
