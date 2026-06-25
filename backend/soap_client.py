import requests


class SoapClient:
    def __init__(self, endpoint: str):
        self.endpoint = endpoint

    def chamar(self, soap_action: str, xml: str) -> str:
        headers = {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": f'"{soap_action}"',
        }

        response = requests.post(
            self.endpoint, data=xml.encode("utf-8"), headers=headers, timeout=60
        )

        if response.status_code >= 400:
            raise Exception(f"HTTP {response.status_code}: {response.text}")

        return response.text
