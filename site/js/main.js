// Pontos únicos de configuração.
const WHATSAPP = "5585992136722"; // (85) 99213-6722, conforme ficha.md
const INSTAGRAM_URL = "https://instagram.com/confeitaria_docelar";
// Endereço do Google Apps Script que grava na planilha (ver planilha/LEIAME.md).
const PLANILHA_URL = "https://script.google.com/macros/s/AKfycbzc6Fcr-JKYNgozDdZ9tYBLFkUaLaSF7ni7WhDdjZY7PEQUFhDPaOOAYzV1air0vRg/exec";

const MENSAGENS = {
  geral: "Olá! Gostaria de fazer uma encomenda.",
  bolo: "Olá! Gostaria de encomendar um bolo.",
  doces: "Olá! Gostaria de encomendar doces para uma festa.",
  salgados: "Olá! Gostaria de encomendar salgados.",
  encomenda: "Olá! Gostaria de um orçamento para uma encomenda.",
  delivery: "Olá! Gostaria de fazer uma encomenda com entrega.",
  privacidade: "Olá! Gostaria de falar sobre meus dados pessoais.",
};
const POLITICA_VERSAO = "1.0"; // igual à versão exibida em politica-de-privacidade.html
const ENDERECO_MAPA = "Av. Jovita Feitosa, 123, Parquelândia, Fortaleza";

document.documentElement.classList.add("js");
const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

// Links do WhatsApp e do Instagram
document.querySelectorAll("[data-wa]").forEach((el) => {
  const msg = MENSAGENS[el.dataset.wa] || MENSAGENS.geral;
  el.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
});
document.querySelectorAll("[data-ig]").forEach((el) => { el.href = INSTAGRAM_URL; });

// Menu mobile
const topo = document.getElementById("topo");
const menu = document.getElementById("menu");
const burger = topo.querySelector(".topo__burger");

function alternarMenu(abrir) {
  if (!menu || !burger) return;
  menu.classList.toggle("aberto", abrir);
  burger.setAttribute("aria-expanded", String(abrir));
  burger.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
}
if (menu && burger) {
  burger.addEventListener("click", () => alternarMenu(!menu.classList.contains("aberto")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("aberto")) { alternarMenu(false); burger.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (menu.classList.contains("aberto") && !topo.contains(e.target)) alternarMenu(false);
  });
}

// Rolagem suave com compensação do menu fixo
document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach((link) => {
  link.addEventListener("click", (e) => {
    const alvo = document.querySelector(link.getAttribute("href"));
    if (!alvo) return;
    e.preventDefault();
    alternarMenu(false);
    const y = alvo.getBoundingClientRect().top + window.scrollY - topo.offsetHeight - 8;
    window.scrollTo({ top: y, behavior: reduzMovimento.matches ? "auto" : "smooth" });
    history.replaceState(null, "", link.getAttribute("href"));
  });
});

// Animação de entrada leve
const revelaveis = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reduzMovimento.matches) {
  const obs = new IntersectionObserver((itens) => {
    itens.forEach((i) => { if (i.isIntersecting) { i.target.classList.add("visivel"); obs.unobserve(i.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.1 });
  revelaveis.forEach((el) => obs.observe(el));
} else {
  revelaveis.forEach((el) => el.classList.add("visivel"));
}

// Mapa do Google: só carrega depois do clique
const botaoMapa = document.getElementById("mapa-botao");
if (botaoMapa) {
  botaoMapa.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(ENDERECO_MAPA)}&output=embed`;
    iframe.title = "Mapa com a localização da Confeitaria Doce Lar, Av. Jovita Feitosa, 123, Parquelândia, Fortaleza";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.allowFullscreen = true;
    document.getElementById("mapa").replaceChildren(iframe);
    iframe.focus();
  });
}

// Formulário de encomenda: valida e envia o pedido para a planilha (Google Apps Script)
const form = document.getElementById("form-encomenda");
if (form) {
  const campos = {
    nome: form.elements.nome,
    whatsapp: form.elements.whatsapp,
    servico: form.elements.servico,
    descricao: form.elements.descricao,
    consentimento: form.elements.consentimento,
  };
  const conta = document.getElementById("f-descricao-conta");

  const limpar = (txt) => txt.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  const digitos = (txt) => txt.replace(/\D/g, "");

  function mascararTelefone(valor) {
    let d = digitos(valor);
    if (d.startsWith("55") && d.length > 11) d = d.slice(2); // colado com código do país
    d = d.slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  const regras = {
    nome: (v) => ((limpar(v).match(/\p{L}/gu) || []).length >= 2 ? "" : "Conte seu nome para a gente."),
    whatsapp: (v) => {
      const d = digitos(v);
      return d.length === 11 && d[2] === "9" ? "" : "Informe o DDD e o número, como (85) 99999-9999.";
    },
    servico: (v) => (v ? "" : "Escolha o que você quer pedir."),
    descricao: (v) => (limpar(v).length >= 10 ? "" : "Conte um pouco mais (pelo menos 10 letras)."),
    consentimento: (v) => (v ? "" : "Marque a caixa para continuar."),
  };

  function validar(nome) {
    const campo = campos[nome];
    const msg = regras[nome](campo.type === "checkbox" ? campo.checked : campo.value);
    const caixa = campo.closest(".campo");
    caixa.classList.toggle("campo--erro", Boolean(msg));
    caixa.querySelector(".campo__erro span").textContent = msg;
    campo.setAttribute("aria-invalid", String(Boolean(msg)));
    return !msg;
  }

  Object.keys(campos).forEach((nome) => {
    campos[nome].addEventListener("blur", () => validar(nome));
    campos[nome].addEventListener("change", () => validar(nome));
    campos[nome].addEventListener("input", () => {
      if (campos[nome].closest(".campo").classList.contains("campo--erro")) validar(nome);
    });
  });
  campos.whatsapp.addEventListener("input", () => { campos.whatsapp.value = mascararTelefone(campos.whatsapp.value); });
  campos.descricao.addEventListener("input", () => { conta.textContent = `${campos.descricao.value.length}/500`; });

  const botao = form.querySelector(".form__enviar");
  const rotulo = botao.querySelector("span");
  const aviso = document.getElementById("form-aviso");
  const ok = document.getElementById("form-ok");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const invalidos = Object.keys(campos).filter((n) => !validar(n));
    if (invalidos.length) { campos[invalidos[0]].focus(); return; }
    if (form.elements.site.value) return; // isca anti-robô preenchida

    const dados = {
      nome: limpar(campos.nome.value),
      whatsapp: campos.whatsapp.value,
      servico: campos.servico.value,
      descricao: limpar(campos.descricao.value),
      origem: "site",
      consentimento: true,
      politica_versao: POLITICA_VERSAO,
    };

    aviso.hidden = true;
    botao.disabled = true;
    rotulo.textContent = "Enviando...";
    let enviado = false;
    try {
      // text/plain evita a checagem prévia (preflight) do navegador no Apps Script
      const resp = await fetch(PLANILHA_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(dados) });
      const corpo = await resp.json();
      enviado = resp.ok && corpo.ok === true;
    } catch (_) { enviado = false; }

    botao.disabled = false;
    rotulo.textContent = "Enviar encomenda";
    if (!enviado) { aviso.hidden = false; return; }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "encomenda_enviada", secao: "encomenda" });
    form.reset();
    conta.textContent = "0/500";
    form.hidden = true;
    ok.hidden = false;
    ok.focus();
  });

  document.getElementById("form-outra").addEventListener("click", () => {
    ok.hidden = true;
    form.hidden = false;
    campos.nome.focus();
  });

  // Botão flutuante sai de cena enquanto o formulário está visível
  const flutuante = document.querySelector(".flutuante");
  if (flutuante && "IntersectionObserver" in window) {
    new IntersectionObserver(([i]) => flutuante.classList.toggle("flutuante--oculto", i.isIntersecting), { threshold: 0.05 })
      .observe(document.getElementById("encomenda"));
  }
}
