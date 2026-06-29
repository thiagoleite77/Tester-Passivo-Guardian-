from ativo.soap_client import GuardianSOAPAtivoClient
from ativo.rest_client import GuardianRESTClient


class IntegracaoAtivaGuardian:
    def __init__(self, tipo, endpoint, soap_action=None):
        self.tipo = tipo.upper()
        self.endpoint = endpoint
        self.soap_action = soap_action

    def enviar(self, payload, metodo_http="POST"):
        if self.tipo == "SOAP":
            client = GuardianSOAPAtivoClient(
                endpoint=self.endpoint, soap_action=self.soap_action
            )

            return client.enviar_xml(payload)

        if self.tipo == "REST":
            client = GuardianRESTClient(endpoint=self.endpoint)

            return client.enviar_json(metodo_http=metodo_http, body_json=payload)

        return {
            "sucesso": False,
            "erro": "Tipo de integração ativa inválido. Use SOAP ou REST.",
        }
