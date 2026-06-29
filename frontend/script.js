const API_BASE = "http://127.0.0.1:5000";

let fluxoPassivo = [];
let webmetodoSelecionado = "";

document.addEventListener("DOMContentLoaded", () => {
    configurarModoIntegracao();
    configurarTipoAtivo();
    carregarConfig();
    listarWebmetodos();
    consultarUltimaRequisicaoAtiva();
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

        const lista = document.getElementById("listaWebmetodos");
        lista.innerHTML = "";

        const nomes = Object.keys(catalogo);

        if (nomes.length === 0) {
            lista.innerHTML = `<p class="texto-vazio">Nenhum WebMétodo cadastrado.</p>`;
            return;
        }

        nomes.forEach((nome) => {
            const item = document.createElement("button");
            item.className = "webmetodo-item";
            item.textContent = `📄 ${nome}`;

            if (nome === webmetodoSelecionado) {
                item.classList.add("ativo");
            }

            item.onclick = async () => {
                webmetodoSelecionado = nome;
                await listarWebmetodos();
                await carregarTemplate();
            };

            lista.appendChild(item);
        });
    } catch (erro) {
        console.error("Erro ao listar webmétodos:", erro);
    }
}

function abrirCadastroWebmetodo() {
    const area = document.getElementById("areaCadastroWebmetodo");
    area.classList.toggle("hidden");
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
        webmetodoSelecionado = nome;

        document.getElementById("nomeWebmetodo").value = "";
        document.getElementById("xmlTemplate").value = "";
        document.getElementById("areaCadastroWebmetodo").classList.add("hidden");

        await listarWebmetodos();
        await carregarTemplate();
    }
}

async function carregarTemplate() {
    if (!webmetodoSelecionado) {
        alert("Selecione um WebMétodo na lista.");
        return null;
    }

    try {
        const response = await fetch(`${API_BASE}/template/${encodeURIComponent(webmetodoSelecionado)}`);
        const data = await response.json();

        if (!response.ok) {
            alert(data.erro || "Erro ao carregar template.");
            return null;
        }

        document.getElementById("xmlRequest").value = data.xml;
        return data.xml;
    } catch (erro) {
        console.error("Erro ao carregar template:", erro);
        alert("Erro ao carregar template.");
        return null;
    }
}

async function adicionarAoFluxo() {
    if (!webmetodoSelecionado) {
        alert("Selecione um WebMétodo na lista.");
        return;
    }

    let xml = document.getElementById("xmlRequest").value.trim();

    if (!xml) {
        xml = await carregarTemplate();

        if (!xml) {
            return;
        }
    }

    fluxoPassivo.push({
        metodo: webmetodoSelecionado,
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

async function removerWebmetodo() {
    if (!webmetodoSelecionado) {
        alert("Selecione um WebMétodo para excluir.");
        return;
    }

    const confirmar = confirm(`Deseja realmente excluir o WebMétodo "${webmetodoSelecionado}"?`);

    if (!confirmar) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/webmetodos/${encodeURIComponent(webmetodoSelecionado)}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.erro || "Erro ao excluir WebMétodo.");
            return;
        }

        alert(data.mensagem);

        fluxoPassivo = fluxoPassivo.filter(item => item.metodo !== webmetodoSelecionado);

        webmetodoSelecionado = "";
        document.getElementById("xmlRequest").value = "";

        atualizarListaFluxo();
        await listarWebmetodos();
    } catch (erro) {
        console.error("Erro ao excluir WebMétodo:", erro);
        alert("Erro ao excluir WebMétodo.");
    }
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