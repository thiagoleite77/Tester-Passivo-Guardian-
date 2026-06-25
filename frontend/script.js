const API = "http://localhost:5000";

let webmetodos = {};
let fluxo = [];

async function carregarWebmetodos() {
    const resposta = await fetch(`${API}/webmetodos`);
    webmetodos = await resposta.json();

    const div = document.getElementById("webmetodos");
    div.innerHTML = "";

    Object.keys(webmetodos).forEach(nome => {
        const item = document.createElement("div");
        item.className = "metodo";

        item.innerHTML = `
            <strong>${nome}</strong><br>
            <small>SOAPAction automático: http://toledobrasil.com.br/WS_Guardian/${nome}</small><br>
            <button onclick="adicionarMetodo('${nome}')">Adicionar ao Fluxo</button>
            <button onclick="excluirWebMetodo('${nome}')">Excluir</button>
        `;

        div.appendChild(item);
    });
}

async function adicionarMetodo(nome) {
    const resposta = await fetch(`${API}/template/${encodeURIComponent(nome)}`);
    const dados = await resposta.json();

    if (dados.erro) {
        alert(dados.erro);
        return;
    }

    fluxo.push({
        metodo: nome,
        xml: dados.xml,
        extrair: []
    });

    renderizarFluxo();
}

function renderizarFluxo() {
    const div = document.getElementById("fluxo");
    div.innerHTML = "";

    fluxo.forEach((etapa, index) => {
        const bloco = document.createElement("div");
        bloco.className = "etapa";

        bloco.innerHTML = `
            <strong>${index + 1}. ${etapa.metodo}</strong>

            <label>XML SOAP</label>
            <textarea rows="12" oninput="atualizarXml(${index}, this.value)">${etapa.xml}</textarea>

            <h4>Extrair variável da Response</h4>

            <label>Nome da variável</label>
            <input 
                placeholder="Ex: Codigo"
                value="${etapa.extrair[0]?.variavel || ""}"
                oninput="atualizarExtracao(${index}, 0, 'variavel', this.value)"
            >

            <label>Tag da Response</label>
            <input 
                placeholder="Ex: Codigo"
                value="${etapa.extrair[0]?.tag || ""}"
                oninput="atualizarExtracao(${index}, 0, 'tag', this.value)"
            >

            <small>Use depois no XML como: {{Codigo}}</small><br><br>

            <button onclick="subirEtapa(${index})">Subir</button>
            <button onclick="descerEtapa(${index})">Descer</button>
            <button onclick="removerEtapa(${index})">Remover</button>
        `;

        div.appendChild(bloco);
    });
}

function atualizarXml(index, valor) {
    fluxo[index].xml = valor;
}

function atualizarExtracao(index, posicao, campo, valor) {
    if (!fluxo[index].extrair[posicao]) {
        fluxo[index].extrair[posicao] = {
            variavel: "",
            tag: ""
        };
    }

    fluxo[index].extrair[posicao][campo] = valor;
}

function removerEtapa(index) {
    fluxo.splice(index, 1);
    renderizarFluxo();
}

function subirEtapa(index) {
    if (index === 0) return;

    const temp = fluxo[index - 1];
    fluxo[index - 1] = fluxo[index];
    fluxo[index] = temp;

    renderizarFluxo();
}

function descerEtapa(index) {
    if (index === fluxo.length - 1) return;

    const temp = fluxo[index + 1];
    fluxo[index + 1] = fluxo[index];
    fluxo[index] = temp;

    renderizarFluxo();
}

async function excluirWebMetodo(nome) {
    const confirmar = confirm(`Deseja realmente excluir o webmétodo "${nome}"?`);

    if (!confirmar) return;

    const resposta = await fetch(`${API}/webmetodos/${encodeURIComponent(nome)}`, {
        method: "DELETE"
    });

    const dados = await resposta.json();

    if (dados.erro) {
        alert(dados.erro);
        return;
    }

    fluxo = fluxo.filter(etapa => etapa.metodo !== nome);

    await carregarWebmetodos();
    renderizarFluxo();

    document.getElementById("log").textContent = JSON.stringify(dados, null, 2);
}

async function executarFluxo() {
    const endpoint = document.getElementById("endpoint").value.trim();

    if (!endpoint) {
        alert("Informe o endpoint/link de comunicação.");
        return;
    }

    const resposta = await fetch(`${API}/executar-fluxo`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            endpoint,
            fluxo
        })
    });

    const dados = await resposta.json();

    document.getElementById("log").textContent = JSON.stringify(dados, null, 2);
}

function abrirCadastroWebMetodo() {
    document.getElementById("novoNome").focus();
}

async function carregarConfig() {
    const resposta = await fetch(`${API}/config`);
    const dados = await resposta.json();

    document.getElementById("endpoint").value = dados.endpoint || "";
}

async function salvarEndpoint() {
    const endpoint = document.getElementById("endpoint").value.trim();

    if (!endpoint) {
        alert("Informe o endpoint/link de comunicação.");
        return;
    }

    const resposta = await fetch(`${API}/config`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ endpoint })
    });

    const dados = await resposta.json();

    if (dados.erro) {
        alert(dados.erro);
        return;
    }

    document.getElementById("log").textContent = JSON.stringify(dados, null, 2);
}

async function cadastrarWebMetodo() {
    const nome = document.getElementById("novoNome").value.trim();
    const xmlTemplate = document.getElementById("novoXmlTemplate").value.trim();

    if (!nome || !xmlTemplate) {
        alert("Preencha Nome do WebMétodo e XML Template.");
        return;
    }

    const resposta = await fetch(`${API}/webmetodos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            nome,
            xml_template: xmlTemplate
        })
    });

    const dados = await resposta.json();

    if (dados.erro) {
        alert(dados.erro);
        return;
    }

    document.getElementById("novoNome").value = "";
    document.getElementById("novoXmlTemplate").value = "";

    await carregarWebmetodos();

    document.getElementById("log").textContent = JSON.stringify(dados, null, 2);
}

carregarConfig();
carregarWebmetodos();