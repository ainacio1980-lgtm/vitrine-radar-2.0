"""Testes da politica local e restrita do agente autonomo."""
import unittest
import os
from unittest.mock import patch
from pathlib import Path
from scripts.agent_propose import choose_task, exported_api, validate_proposal, TASKS, main


class AgentPolicyTests(unittest.TestCase):
    def test_rota_completa_sem_repetir_mesmo_arquivo(self):
        names = list(TASKS)
        self.assertEqual([choose_task(i) for i in range(1, 5)], names + [names[0]])
        with self.assertRaises(ValueError):
            choose_task(0)

    def test_exportacoes_nao_podem_ser_removidas(self):
        original = "export function clean(x) { return x; }\n"
        self.assertEqual(exported_api(original), ("clean",))
        with self.assertRaisesRegex(ValueError, "API"):
            validate_proposal("src/comparator_search.mjs", original, "function clean(x) { return x; }")

    def test_codigo_puro_nao_pode_introduzir_efeitos_colaterais(self):
        original = "export function norm(x) { return String(x); }\n"
        for code in (
            "export function norm(x) { fetch('https://example.org'); return String(x); }",
            "export function norm(x) { eval(x); return String(x); }",
            "export function norm(x) { process.env.SECRET; return String(x); }",
        ):
            with self.assertRaises(ValueError):
                validate_proposal("src/comparator_search.mjs", original, code)

    def test_dominio_de_fotos_nao_pode_mudar(self):
        original = (
            'export const productImageHosts = ["a-static.mlcdn.com.br"];\n'
            'export function safeProductImageUrl(x) { return x; }\n'
        )
        validate_proposal("src/product_images.mjs", original, original)
        proposed = original.replace('a-static.mlcdn.com.br', 'outro.dominio.com.br')
        with self.assertRaisesRegex(ValueError, "dominios"):
            validate_proposal("src/product_images.mjs", original, proposed)

    def test_rejeicao_do_modelo_preserva_arquivo_e_sinaliza_sem_repetir(self):
        original = (
            'export const productImageHosts = ["a-static.mlcdn.com.br"];\n'
            'export function safeProductImageUrl(x) { return x; }\n'
        )
        unsafe = original.replace("a-static.mlcdn.com.br", "outro.dominio.com.br")
        with patch.dict(os.environ, {"AI_TARGET": "src/product_images.mjs"}), \
             patch("scripts.agent_propose.run_model", return_value=unsafe) as model, \
             patch.object(Path, "read_text", return_value=original), \
             patch.object(Path, "write_text") as write:
            with self.assertRaises(SystemExit) as error:
                main()
        self.assertEqual(error.exception.code, 10)
        model.assert_called_once()
        write.assert_not_called()

    def test_auditoria_publica_deve_manter_paginacao(self):
        original = (
            "export async function checkCatalog(x) {\n"
            "  const u = new URL('/api/offers', x);\n"
            "  return await checkCatalog(u);\n}\n"
        )
        validate_proposal("scripts/check-public-catalog.mjs", original, original)
        proposed = "export async function checkCatalog(x) { return 0; }"
        with self.assertRaisesRegex(ValueError, "Auditoria"):
            validate_proposal("scripts/check-public-catalog.mjs", original, proposed)


if __name__ == "__main__":
    unittest.main()
