const API_BASE = "http://127.0.0.1:5000";

let fluxoPassivo = [];

document.addEventListener("DOMContentLoaded", () => {
    configurarModoIntegracao();
    configurarTipoAtivo();
    carregarConfig();
    listarWebmetodos();
    consultarUltimaRequisicaoAtiva();

    document.getElementById("selectWebmetodos").addEventListener("change", carregarTemplate);
});

function configurarModoIntegracao() {
    document.querySelectorAll('input[name="modoIntegracao"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            const modo = document.querySelector('input[name="modoIntegracao"]:checked').value;

            document.getElementById("area-passivo").classList.toggle("hidden", modo !== "passivo");
            document.getElementById("area-ativo").classList.toggle("hidden", modo !== "ativo");

            if (modo === "ativo") {
                consultarUltimaRequisicaoAtiva();
            }
        });
    });
}

function configurarTipoAtivo() {
    document.querySelectorAll('input[name="tipoAtivo"]').forEach((radio) => {
        radio.addEventListener("change", () => {
            const tipo = document.querySelector('input[name="tipoAtivo"]:checked').value;

            document.getElementById("ativo-rest").classList.toggle("hidden", tipo !== "rest");
            document.getElementById("ativo-soap").classList.toggle("hidden", tipo !== "soap");

            consultarUltimaRequisicaoAtiva();
        });
    });
}

async function carregarConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        const config = await response.json();

        document.getElementById("endpointPassivo").value = config.endpoint || "";
    } catch (erro) {
        console.error("Erro ao carregar config:", erro);
    }
}

async function salvarEndpointPassivo() {
    const endpoint = document.getElementById("endpointPassivo").value.trim();

    if (!endpoint) {
        alert("Informe o endpoint.");
        return;
    }

    const response = await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ endpoint })
    });

    const data = await response.json();
    alert(data.mensagem || data.erro);
}

async function listarWebmetodos() {
    try {
        const response = await fetch(`${API_BASE}/webmetodos`);
        const catalogo = await response.json();

        const select = document.getElementById("selectWebmetodos");
        select.innerHTML = "";

        Object.keys(catalogo).forEach((nome) => {
            const option = document.createElement("option");
            option.value = nome;
            option.textContent = nome;
            select.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao listar webmétodos:", erro);
    }
}

async function cadastrarWebmetodo() {
    const nome = document.getElementById("nomeWebmetodo").value.trim();
    const xml_template = document.getElementById("xmlTemplate").value.trim();

    if (!nome || !xml_template) {
        alert("Informe o nome do WebMétodo e o XML Template.");
        return;
    }

    const response = await fetch(`${API_BASE}/webmetodos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nome,
            xml_template
        })
    });

    const data = await response.json();

    alert(data.mensagem || data.erro);

    if (response.ok) {
        document.getElementById("nomeWebmetodo").value = "";
        document.getElementById("xmlTemplate").value = "";
        listarWebmetodos();
    }
}

async function carregarTemplate() {
    const metodo = document.getElementById("selectWebmetodos").value;

    if (!metodo) {
        alert("Selecione um WebMétodo.");
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/template/${metodo}`);
        const data = await response.json();

        if (!response.ok) {
            alert(data.erro || "Erro ao carregar template.");
            return null;
        }

        document.getElementById("xmlRequest").value = data.xml;
        return data.xml;

    } catch (erro) {
        alert("Erro ao carregar template. Verifique se o Flask está rodando.");
        console.error(erro);
        return null;
    }
}


async function adicionarAoFluxo() {
    const metodo = document.getElementById("selectWebmetodos").value;
    let xml = document.getElementById("xmlRequest").value.trim();

    if (!metodo) {
        alert("Selecione um WebMétodo.");
        return;
    }

    if (!xml) {
        xml = await carregarTemplate();

        if (!xml) {
            alert("Não foi possível carregar o template deste WebMétodo.");
            return;
        }
    }

    fluxoPassivo.push({
        metodo: metodo,
        xml: xml,
        extrair: []
    });

    atualizarListaFluxo();
}


function limparFluxo() {
    fluxoPassivo = [];
    atualizarListaFluxo();
    document.getElementById("responsePassivo").value = "";
}

function atualizarListaFluxo() {
    const lista = document.getElementById("listaFluxo");
    lista.innerHTML = "";

    fluxoPassivo.forEach((item, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1} - ${item.metodo}`;
        lista.appendChild(li);
    });
}

async function executarFluxo() {
    const endpoint = document.getElementById("endpointPassivo").value.trim();

    if (!endpoint) {
        alert("Informe o endpoint.");
        return;
    }

    if (fluxoPassivo.length === 0) {
        alert("Adicione pelo menos um WebMétodo ao fluxo.");
        return;
    }

    const payload = {
        endpoint: endpoint,
        fluxo: fluxoPassivo
    };

    const response = await fetch(`${API_BASE}/executar-fluxo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    document.getElementById("responsePassivo").value = JSON.stringify(data, null, 4);
}

function copiarEndpoint(idCampo) {
    const campo = document.getElementById(idCampo);

    campo.select();
    campo.setSelectionRange(0, 99999);

    navigator.clipboard.writeText(campo.value)
        .then(() => {
            alert("Endpoint copiado.");
        })
        .catch(() => {
            alert("Não foi possível copiar o endpoint.");
        });
}

async function consultarUltimaRequisicaoAtiva() {
    const radioSelecionado = document.querySelector('input[name="tipoAtivo"]:checked');

    if (!radioSelecionado) {
        return;
    }

    const tipo = radioSelecionado.value;

    try {
        const response = await fetch(`${API_BASE}/api/ativo/ultima-requisicao/${tipo}`);
        const data = await response.json();

        const texto = data.ultima_requisicao
            ? JSON.stringify(data.ultima_requisicao, null, 4)
            : "Nenhuma requisição recebida ainda.";

        if (tipo === "rest") {
            document.getElementById("ultimaRequisicaoRest").value = texto;
        }

        if (tipo === "soap") {
            document.getElementById("ultimaRequisicaoSoap").value = texto;
        }
    } catch (erro) {
        const mensagem = "Erro ao consultar última requisição ativa. Verifique se o Flask está rodando.";

        if (tipo === "rest") {
            document.getElementById("ultimaRequisicaoRest").value = mensagem;
        }

        if (tipo === "soap") {
            document.getElementById("ultimaRequisicaoSoap").value = mensagem;
        }

        console.error(erro);
    }
}