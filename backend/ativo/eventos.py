def montar_evento_ticket_criado(codigo_ticket, placa, peso=None):
    return {
        "evento": "TICKET_CRIADO",
        "codigoTicket": codigo_ticket,
        "placa": placa,
        "peso": peso,
    }


def montar_evento_peso_capturado(codigo_ticket, peso):
    return {"evento": "PESO_CAPTURADO", "codigoTicket": codigo_ticket, "peso": peso}


def montar_evento_ticket_finalizado(codigo_ticket):
    return {"evento": "TICKET_FINALIZADO", "codigoTicket": codigo_ticket}
