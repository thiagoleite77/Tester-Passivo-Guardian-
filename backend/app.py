from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import json
import re

from passivo.soap_client import SoapClient
from ativo.integracao import IntegracaoAtivaGuardian

app = Flask(__name__)
CORS(app)


@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:arquivo>")
def arquivos_frontend(arquivo):
    return send_from_directory(FRONTEND_DIR, arquivo)


CATALOGO_PATH = "webmetodos.json"
TEMPLATES_DIR = "templates"
SOAPACTION_BASE = "http://toledobrasil.com.br/WS_Guardian/"
CONFIG_PATH = "config.json"


def garantir_estrutura():
    os.makedirs(TEMPLATES_DIR, exist_ok=True)

    if not os.path.exists(CATALOGO_PATH):
        with open(CATALOGO_PATH, "w", encoding="utf-8") as arquivo:
            json.dump({}, arquivo, indent=4, ensure_ascii=False)


def carregar_catalogo():
    garantir_estrutura()

    with open(CATALOGO_PATH, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_catalogo(catalogo):
    with open(CATALOGO_PATH, "w", encoding="utf-8") as arquivo:
        json.dump(catalogo, arquivo, indent=4, ensure_ascii=False)


def carregar_config():
    if not os.path.exists(CONFIG_PATH):
        return {"endpoint": ""}

    with open(CONFIG_PATH, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_config(config):
    with open(CONFIG_PATH, "w", encoding="utf-8") as arquivo:
        json.dump(config, arquivo, indent=4, ensure_ascii=False)


def carregar_config():
    if not os.path.exists(CONFIG_PATH):
        return {"endpoint": ""}

    with open(CONFIG_PATH, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_config(config):
    with open(CONFIG_PATH, "w", encoding="utf-8") as arquivo:
        json.dump(config, arquivo, indent=4, ensure_ascii=False)


def extrair_tag(xml, tag):
    padrao = rf"(?s)<[^:>]*:?{tag}>(.*?)</[^:>]*:?{tag}>"
    resultado = re.search(padrao, xml)
    return resultado.group(1).strip() if resultado else None


def substituir_variaveis(xml, variaveis):
    for nome, valor in variaveis.items():
        xml = xml.replace(f"{{{{{nome}}}}}", str(valor))
    return xml


FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "front-end")
)


@app.route("/", methods=["GET", "HEAD"])
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/style.css")
def style_css():
    return send_from_directory(FRONTEND_DIR, "style.css")


@app.route("/script.js")
def script_js():
    return send_from_directory(FRONTEND_DIR, "script.js")


@app.route("/webmetodos", methods=["GET"])
def listar_webmetodos():
    return jsonify(carregar_catalogo())


@app.route("/webmetodos", methods=["POST"])
def cadastrar_webmetodo():
    dados = request.get_json()

    nome = dados.get("nome", "").strip()
    xml_template = dados.get("xml_template", "").strip()

    if not nome or not xml_template:
        return (
            jsonify({"erro": "Nome do WebMétodo e XML Template são obrigatórios."}),
            400,
        )

    soap_action = f"{SOAPACTION_BASE}{nome}"

    catalogo = carregar_catalogo()
    caminho_template = os.path.join(TEMPLATES_DIR, f"{nome}.xml")

    with open(caminho_template, "w", encoding="utf-8") as arquivo:
        arquivo.write(xml_template)

    catalogo[nome] = {
        "soap_action": soap_action,
        "template": caminho_template.replace("\\", "/"),
    }

    salvar_catalogo(catalogo)

    return jsonify(
        {
            "status": "ok",
            "mensagem": "Webmétodo cadastrado com sucesso.",
            "nome": nome,
            "soap_action": soap_action,
            "webmetodo": catalogo[nome],
        }
    )


@app.route("/webmetodos/<nome_metodo>", methods=["DELETE"])
def excluir_webmetodo(nome_metodo):
    catalogo = carregar_catalogo()

    if nome_metodo not in catalogo:
        return jsonify({"erro": "Webmétodo não encontrado."}), 404

    template_path = catalogo[nome_metodo].get("template")

    del catalogo[nome_metodo]
    salvar_catalogo(catalogo)

    if template_path and os.path.exists(template_path):
        os.remove(template_path)

    return jsonify(
        {"status": "ok", "mensagem": f"Webmétodo {nome_metodo} excluído com sucesso."}
    )


@app.route("/template/<nome_metodo>", methods=["GET"])
def obter_template(nome_metodo):
    catalogo = carregar_catalogo()

    if nome_metodo not in catalogo:
        return jsonify({"erro": "Webmétodo não encontrado."}), 404

    template_path = catalogo[nome_metodo]["template"]

    if not os.path.exists(template_path):
        return jsonify({"erro": f"Template não encontrado: {template_path}"}), 404

    with open(template_path, "r", encoding="utf-8") as arquivo:
        xml = arquivo.read()

    return jsonify({"metodo": nome_metodo, "xml": xml})


@app.route("/executar-fluxo", methods=["POST"])
def executar_fluxo():
    dados = request.get_json()

    endpoint = dados.get("endpoint", "").strip()
    fluxo = dados.get("fluxo", [])

    if not endpoint:
        return jsonify({"erro": "Endpoint é obrigatório."}), 400

    if not fluxo:
        return jsonify({"erro": "Fluxo vazio."}), 400

    catalogo = carregar_catalogo()
    client = SoapClient(endpoint)

    variaveis = {}
    logs = []

    for index, etapa in enumerate(fluxo, start=1):
        metodo = etapa.get("metodo")
        xml = etapa.get("xml", "")
        extracoes = etapa.get("extrair", [])

        if metodo not in catalogo:
            logs.append(
                {
                    "etapa": index,
                    "metodo": metodo,
                    "status": "erro",
                    "erro": "Webmétodo não cadastrado.",
                }
            )
            break

        try:
            xml_final = substituir_variaveis(xml, variaveis)
            soap_action = catalogo[metodo]["soap_action"]

            response = client.chamar(soap_action, xml_final)

            novas_variaveis = {}

            for item in extracoes:
                nome_variavel = item.get("variavel", "").strip()
                tag = item.get("tag", "").strip()

                if nome_variavel and tag:
                    valor = extrair_tag(response, tag)

                    if valor is not None:
                        variaveis[nome_variavel] = valor
                        novas_variaveis[nome_variavel] = valor

            logs.append(
                {
                    "etapa": index,
                    "metodo": metodo,
                    "status": "sucesso",
                    "soap_action": soap_action,
                    "request": xml_final,
                    "response": response,
                    "variaveis_extraidas": novas_variaveis,
                }
            )

        except Exception as erro:
            logs.append(
                {
                    "etapa": index,
                    "metodo": metodo,
                    "status": "erro",
                    "erro": str(erro),
                    "request": xml,
                }
            )
            break

    return jsonify({"status": "finalizado", "variaveis": variaveis, "logs": logs})


@app.route("/config", methods=["GET"])
def obter_config():
    return jsonify(carregar_config())


@app.route("/config", methods=["POST"])
def atualizar_config():
    dados = request.get_json()
    endpoint = dados.get("endpoint", "").strip()

    if not endpoint:
        return jsonify({"erro": "Endpoint é obrigatório."}), 400

    config = {"endpoint": endpoint}
    salvar_config(config)

    return jsonify(
        {
            "status": "ok",
            "mensagem": "Endpoint salvo com sucesso.",
            "endpoint": endpoint,
        }
    )


# ativo ============

from datetime import datetime

ULTIMA_REQUISICAO_ATIVA = {"rest": None, "soap": None}


@app.route("/api/guardian/rest", methods=["POST", "PUT"])
def receber_ativo_rest():
    dados = request.get_json(silent=True)

    registro = {
        "tipo": "REST/JSON",
        "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "metodo_http": request.method,
        "ip_origem": request.remote_addr,
        "headers": dict(request.headers),
        "body": dados,
    }

    ULTIMA_REQUISICAO_ATIVA["rest"] = registro

    return (
        jsonify(
            {
                "status": "OK",
                "mensagem": "Evento REST recebido com sucesso pelo endpoint ativo.",
                "recebido_em": registro["data_hora"],
            }
        ),
        200,
    )


@app.route("/api/guardian/soap", methods=["POST"])
def receber_ativo_soap():
    xml_recebido = request.data.decode("utf-8", errors="replace")

    registro = {
        "tipo": "SOAP",
        "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "metodo_http": request.method,
        "ip_origem": request.remote_addr,
        "headers": dict(request.headers),
        "body": xml_recebido,
    }

    ULTIMA_REQUISICAO_ATIVA["soap"] = registro

    resposta_soap = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <ReceberEventoResponse>
            <Status>OK</Status>
            <Mensagem>Evento SOAP recebido com sucesso pelo endpoint ativo.</Mensagem>
        </ReceberEventoResponse>
    </soap:Body>
</soap:Envelope>"""

    return resposta_soap, 200, {"Content-Type": "text/xml; charset=utf-8"}


@app.route("/api/ativo/ultima-requisicao/<tipo>", methods=["GET"])
def obter_ultima_requisicao_ativa(tipo):
    tipo = tipo.lower()

    if tipo not in ["rest", "soap"]:
        return jsonify({"erro": "Tipo inválido. Use rest ou soap."}), 400

    return jsonify({"tipo": tipo, "ultima_requisicao": ULTIMA_REQUISICAO_ATIVA[tipo]})


import os

if __name__ == "__main__":
    garantir_estrutura()

    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
