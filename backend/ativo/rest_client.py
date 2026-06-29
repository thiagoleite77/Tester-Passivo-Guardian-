import requests


class GuardianRESTClient:
    def __init__(self, endpoint, timeout=30):
        self.endpoint = endpoint
        self.timeout = timeout

    def enviar_json(self, metodo_http, body_json=None, headers=None):
        headers = headers or {"Content-Type": "application/json"}

        try:
            response = requests.request(
                method=metodo_http.upper(),
                url=self.endpoint,
                json=body_json,
                headers=headers,
                timeout=self.timeout,
            )

            return {
                "sucesso": response.ok,
                "status_code": response.status_code,
                "resposta": response.text,
            }

        except requests.exceptions.Timeout:
            return {
                "sucesso": False,
                "erro": "Timeout ao enviar requisição REST para o Guardian.",
            }

        except requests.exceptions.RequestException as erro:
            return {"sucesso": False, "erro": str(erro)}
