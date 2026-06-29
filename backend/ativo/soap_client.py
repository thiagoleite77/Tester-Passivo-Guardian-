import requests


class GuardianSOAPAtivoClient:
    def __init__(self, endpoint, soap_action=None, timeout=30):
        self.endpoint = endpoint
        self.soap_action = soap_action
        self.timeout = timeout

    def enviar_xml(self, xml_request):
        headers = {"Content-Type": "text/xml; charset=utf-8"}

        if self.soap_action:
            headers["SOAPAction"] = self.soap_action

        try:
            response = requests.post(
                url=self.endpoint,
                data=xml_request.encode("utf-8"),
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
                "erro": "Timeout ao enviar requisição SOAP Ativa para o Guardian.",
            }

        except requests.exceptions.RequestException as erro:
            return {"sucesso": False, "erro": str(erro)}
