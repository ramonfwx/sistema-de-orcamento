(function () {
  "use strict";

  const LS = {
    provider: "orc_provider",
    clients: "orc_clients",
    catalog: "orc_catalog",
    lastNumber: "orc_lastNumber",
    current: "orc_current",
  };

  const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

  const $ = (id) => document.getElementById(id);

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ===================== State =====================
  let provider = loadJSON(LS.provider, { nome: "", doc: "", telefone: "", email: "", endereco: "", portfolio: "", logo: "" });
  let clients = loadJSON(LS.clients, []); // [{id, nome, doc, telefone, email}]
  let catalog = loadJSON(LS.catalog, { raw: "", items: [] }); // items: [{nome, valor}]
  let lastNumber = loadJSON(LS.lastNumber, 0);

  let quote = loadJSON(LS.current, null);
  if (!quote) {
    quote = freshQuote();
  }

  function freshQuote() {
    lastNumber += 1;
    saveJSON(LS.lastNumber, lastNumber);
    return {
      numero: String(lastNumber).padStart(3, "0"),
      dataEnvio: todayISO(),
      validade: "15",
      referencia: "",
      clienteId: "",
      cliente: { nome: "", doc: "", telefone: "", email: "" },
      itens: [{ nome: "", qtd: 1, valor: 0 }],
      descontoTipo: "valor",
      desconto: 0,
      imposto: 0,
      pagamento: "",
      observacoes: "",
    };
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function persistQuote() {
    saveJSON(LS.current, quote);
  }

  function formatDateBR(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} de ${MONTHS[m - 1]} de ${y}`;
  }

  function addDaysISO(iso, days) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  }

  function formatBRL(n) {
    n = Number(n) || 0;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  // ===================== Accordion =====================
  document.querySelectorAll(".acc-item").forEach((item) => {
    const header = item.querySelector(".acc-header");
    header.addEventListener("click", () => {
      const wasOpen = item.classList.contains("is-open");
      item.classList.toggle("is-open", !wasOpen);
    });
  });

  // ===================== Mobile view toggle =====================
  const paneEdit = $("paneEdit");
  const panePreview = $("panePreview");
  $("btnViewToggle").addEventListener("click", () => {
    paneEdit.classList.remove("is-visible");
    panePreview.classList.add("is-visible");
  });
  $("btnEdit").addEventListener("click", () => {
    panePreview.classList.remove("is-visible");
    paneEdit.classList.add("is-visible");
  });

  // ===================== Detalhes =====================
  const fldNumero = $("fldNumero");
  const fldDataEnvio = $("fldDataEnvio");
  const fldValidade = $("fldValidade");
  const fldReferencia = $("fldReferencia");

  fldNumero.addEventListener("input", () => { quote.numero = fldNumero.value.trim(); persistQuote(); renderAll(); });
  fldDataEnvio.addEventListener("input", () => { quote.dataEnvio = fldDataEnvio.value; persistQuote(); renderAll(); });
  fldValidade.addEventListener("change", () => { quote.validade = fldValidade.value; persistQuote(); renderAll(); });
  fldReferencia.addEventListener("input", () => { quote.referencia = fldReferencia.value; persistQuote(); renderAll(); });

  // ===================== Prestador =====================
  const fldProvNome = $("fldProvNome");
  const fldProvDoc = $("fldProvDoc");
  const fldProvTelefone = $("fldProvTelefone");
  const fldProvEmail = $("fldProvEmail");
  const fldProvEndereco = $("fldProvEndereco");
  const fldProvPortfolio = $("fldProvPortfolio");
  const fldProvLogo = $("fldProvLogo");
  const logoPreviewWrap = $("logoPreviewWrap");
  const logoPreview = $("logoPreview");
  const btnClearLogo = $("btnClearLogo");

  function resizeImageFile(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  fldProvLogo.addEventListener("change", () => {
    const file = fldProvLogo.files[0];
    if (!file) return;
    resizeImageFile(file, 300)
      .then((dataUrl) => {
        provider.logo = dataUrl;
        saveJSON(LS.provider, provider);
        fldProvLogo.value = "";
        fillProviderFields();
        renderAll();
      })
      .catch(() => alert("Não foi possível carregar essa imagem."));
  });

  btnClearLogo.addEventListener("click", () => {
    provider.logo = "";
    saveJSON(LS.provider, provider);
    fillProviderFields();
    renderAll();
  });

  function bindProviderField(el, key) {
    el.addEventListener("input", () => {
      provider[key] = el.value;
      saveJSON(LS.provider, provider);
      renderAll();
    });
  }
  bindProviderField(fldProvNome, "nome");
  bindProviderField(fldProvDoc, "doc");
  bindProviderField(fldProvTelefone, "telefone");
  bindProviderField(fldProvEmail, "email");
  bindProviderField(fldProvEndereco, "endereco");
  bindProviderField(fldProvPortfolio, "portfolio");

  $("btnClearProvider").addEventListener("click", () => {
    if (!confirm("Limpar os dados salvos do prestador neste dispositivo?")) return;
    provider = { nome: "", doc: "", telefone: "", email: "", endereco: "", portfolio: "", logo: "" };
    saveJSON(LS.provider, provider);
    fillProviderFields();
    renderAll();
  });

  function fillProviderFields() {
    fldProvNome.value = provider.nome || "";
    fldProvDoc.value = provider.doc || "";
    fldProvTelefone.value = provider.telefone || "";
    fldProvEmail.value = provider.email || "";
    fldProvEndereco.value = provider.endereco || "";
    fldProvPortfolio.value = provider.portfolio || "";
    if (provider.logo) {
      logoPreview.src = provider.logo;
      logoPreviewWrap.hidden = false;
      btnClearLogo.hidden = false;
    } else {
      logoPreviewWrap.hidden = true;
      btnClearLogo.hidden = true;
    }
  }

  // ===================== Cliente =====================
  const fldClienteSalvo = $("fldClienteSalvo");
  const fldCliNome = $("fldCliNome");
  const fldCliDoc = $("fldCliDoc");
  const fldCliTelefone = $("fldCliTelefone");
  const fldCliEmail = $("fldCliEmail");

  function renderClientOptions() {
    fldClienteSalvo.innerHTML = "";
    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "Nenhum";
    fldClienteSalvo.appendChild(optNone);
    clients.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.nome || "(sem nome)";
      fldClienteSalvo.appendChild(opt);
    });
    fldClienteSalvo.value = quote.clienteId || "";
  }

  fldClienteSalvo.addEventListener("change", () => {
    quote.clienteId = fldClienteSalvo.value;
    const c = clients.find((c) => c.id === quote.clienteId);
    if (c) {
      quote.cliente = { nome: c.nome, doc: c.doc, telefone: c.telefone, email: c.email };
      fldCliNome.value = c.nome || "";
      fldCliDoc.value = c.doc || "";
      fldCliTelefone.value = c.telefone || "";
      fldCliEmail.value = c.email || "";
    }
    persistQuote();
    renderAll();
  });

  function bindClienteField(el, key) {
    el.addEventListener("input", () => {
      quote.cliente[key] = el.value;
      persistQuote();
      renderAll();
    });
  }
  bindClienteField(fldCliNome, "nome");
  bindClienteField(fldCliDoc, "doc");
  bindClienteField(fldCliTelefone, "telefone");
  bindClienteField(fldCliEmail, "email");

  $("btnSaveClient").addEventListener("click", () => {
    if (!quote.cliente.nome.trim()) {
      alert("Preencha o nome do cliente antes de salvar.");
      return;
    }
    let id = quote.clienteId;
    let existing = clients.find((c) => c.id === id);
    if (!existing) {
      id = "c" + Date.now();
      existing = { id, ...quote.cliente };
      clients.push(existing);
    } else {
      Object.assign(existing, quote.cliente);
    }
    quote.clienteId = id;
    saveJSON(LS.clients, clients);
    persistQuote();
    renderClientOptions();
    renderAll();
  });

  // ===================== Catálogo =====================
  const fldCatalogo = $("fldCatalogo");

  function parseCatalog(raw) {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.lastIndexOf("-");
        if (idx === -1) return null;
        const nome = line.slice(0, idx).trim();
        const valorStr = line.slice(idx + 1).trim().replace(/\./g, "").replace(",", ".");
        const valor = parseFloat(valorStr);
        if (!nome || isNaN(valor)) return null;
        return { nome, valor };
      })
      .filter(Boolean);
  }

  $("btnSaveCatalog").addEventListener("click", () => {
    const raw = fldCatalogo.value;
    const items = parseCatalog(raw);
    catalog = { raw, items };
    saveJSON(LS.catalog, catalog);
    renderItemSelectOptions();
    renderAll();
  });

  // ===================== Itens =====================
  const itemsBody = $("itemsBody");

  function renderItemsEditor() {
    itemsBody.innerHTML = "";
    quote.itens.forEach((item, idx) => {
      const tr = document.createElement("tr");

      const tdSel = document.createElement("td");
      const select = document.createElement("select");
      select.appendChild(new Option("Selecione um serviço…", ""));
      catalog.items.forEach((ci) => {
        select.appendChild(new Option(`${ci.nome} — ${formatBRL(ci.valor)}`, ci.nome));
      });
      select.appendChild(new Option("Item personalizado…", "__custom__"));
      const matched = catalog.items.find((ci) => ci.nome === item.nome);
      select.value = matched ? item.nome : (item.nome ? "__custom__" : "");
      select.addEventListener("change", () => {
        if (select.value === "__custom__") {
          item.nome = item.nome && !matched ? item.nome : "";
        } else if (select.value === "") {
          item.nome = "";
          item.valor = 0;
        } else {
          const ci = catalog.items.find((c) => c.nome === select.value);
          item.nome = ci.nome;
          item.valor = ci.valor;
        }
        persistQuote();
        renderItemsEditor();
        renderAll();
      });
      tdSel.appendChild(select);

      if (select.value === "__custom__") {
        const customInput = document.createElement("input");
        customInput.type = "text";
        customInput.placeholder = "Nome do serviço";
        customInput.value = item.nome;
        customInput.style.marginTop = "6px";
        customInput.addEventListener("input", () => {
          item.nome = customInput.value;
          persistQuote();
          renderPreviewOnly();
        });
        tdSel.appendChild(customInput);
      }
      tr.appendChild(tdSel);

      const tdQtd = document.createElement("td");
      tdQtd.className = "col-qtd";
      const qtdInput = document.createElement("input");
      qtdInput.type = "number";
      qtdInput.min = "0";
      qtdInput.step = "1";
      qtdInput.value = item.qtd;
      qtdInput.addEventListener("input", () => {
        item.qtd = parseFloat(qtdInput.value) || 0;
        persistQuote();
        tdTotal.textContent = formatBRL((item.qtd || 0) * (item.valor || 0));
        renderStatuses();
        renderPreviewOnly();
      });
      tdQtd.appendChild(qtdInput);
      tr.appendChild(tdQtd);

      const tdValor = document.createElement("td");
      tdValor.className = "col-valor";
      const valorInput = document.createElement("input");
      valorInput.type = "number";
      valorInput.min = "0";
      valorInput.step = "0.01";
      valorInput.value = item.valor;
      valorInput.addEventListener("input", () => {
        item.valor = parseFloat(valorInput.value) || 0;
        persistQuote();
        tdTotal.textContent = formatBRL((item.qtd || 0) * (item.valor || 0));
        renderStatuses();
        renderPreviewOnly();
      });
      tdValor.appendChild(valorInput);
      tr.appendChild(tdValor);

      const tdTotal = document.createElement("td");
      tdTotal.className = "col-total";
      tdTotal.textContent = formatBRL((item.qtd || 0) * (item.valor || 0));
      tr.appendChild(tdTotal);

      const tdRemove = document.createElement("td");
      tdRemove.className = "col-remove";
      const btnRemove = document.createElement("button");
      btnRemove.type = "button";
      btnRemove.className = "row-remove-btn";
      btnRemove.textContent = "×";
      btnRemove.title = "Remover item";
      btnRemove.addEventListener("click", () => {
        quote.itens.splice(idx, 1);
        if (quote.itens.length === 0) quote.itens.push({ nome: "", qtd: 1, valor: 0 });
        persistQuote();
        renderItemsEditor();
        renderAll();
      });
      tdRemove.appendChild(btnRemove);
      tr.appendChild(tdRemove);

      itemsBody.appendChild(tr);
    });
  }

  function renderItemSelectOptions() {
    // Triggers a re-render of the items editor so <select> options reflect the saved catalog.
    renderItemsEditor();
  }

  $("btnAddItem").addEventListener("click", () => {
    quote.itens.push({ nome: "", qtd: 1, valor: 0 });
    persistQuote();
    renderItemsEditor();
    renderAll();
  });

  // ===================== Desconto / Imposto =====================
  const fldDesconto = $("fldDesconto");
  const fldImposto = $("fldImposto");
  const segDescontoTipo = $("segDescontoTipo");

  fldDesconto.addEventListener("input", () => {
    quote.desconto = parseFloat(fldDesconto.value) || 0;
    persistQuote();
    renderAll();
  });
  fldImposto.addEventListener("input", () => {
    quote.imposto = parseFloat(fldImposto.value) || 0;
    persistQuote();
    renderAll();
  });
  segDescontoTipo.querySelectorAll(".segmented__opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      quote.descontoTipo = btn.dataset.val;
      segDescontoTipo.querySelectorAll(".segmented__opt").forEach((b) => b.classList.toggle("is-active", b === btn));
      persistQuote();
      renderAll();
    });
  });

  // ===================== Pagamento / Observações =====================
  const fldPagamento = $("fldPagamento");
  const fldObservacoes = $("fldObservacoes");
  fldPagamento.addEventListener("input", () => { quote.pagamento = fldPagamento.value; persistQuote(); renderAll(); });
  fldObservacoes.addEventListener("input", () => { quote.observacoes = fldObservacoes.value; persistQuote(); renderAll(); });

  // ===================== Novo orçamento =====================
  $("btnNew").addEventListener("click", () => {
    if (!confirm("Iniciar um novo orçamento? Os dados de prestador e catálogo permanecem salvos, mas os itens, cliente e observações atuais serão limpos.")) return;
    quote = freshQuote();
    persistQuote();
    fillQuoteFields();
    renderAll();
  });

  // ===================== Exportar PDF =====================
  $("btnExportPdf").addEventListener("click", () => {
    window.print();
  });

  // ===================== Totals =====================
  function computeTotals() {
    const subtotal = quote.itens.reduce((sum, it) => sum + (it.qtd || 0) * (it.valor || 0), 0);
    let descontoValor = 0;
    if (quote.descontoTipo === "percent") {
      descontoValor = subtotal * ((quote.desconto || 0) / 100);
    } else {
      descontoValor = quote.desconto || 0;
    }
    descontoValor = Math.min(descontoValor, subtotal);
    const baseAposDesconto = subtotal - descontoValor;
    const impostoValor = baseAposDesconto * ((quote.imposto || 0) / 100);
    const total = baseAposDesconto + impostoValor;
    return { subtotal, descontoValor, impostoValor, total };
  }

  // ===================== Status labels (accordion headers) =====================
  function renderStatuses() {
    const validadeLabel = { "7": "7 dias", "15": "15 dias", "30": "30 dias", "0": "sem validade" }[quote.validade];
    $("statusDetalhes").textContent = `${quote.numero || "—"} · ${validadeLabel}`;

    $("statusPrestador").textContent = provider.nome ? provider.nome : "Nenhum";
    $("statusCliente").textContent = quote.cliente.nome ? quote.cliente.nome : "Nenhum";
    $("statusCatalogo").textContent = catalog.items.length ? `${catalog.items.length} serviço(s)` : "Nenhum";

    const itemCount = quote.itens.filter((i) => i.nome).length;
    $("statusItens").textContent = itemCount ? `${itemCount} item(ns)` : "Nenhum";

    $("statusPagamento").textContent = quote.pagamento ? quote.pagamento : "Nenhum";
    $("statusObservacoes").textContent = quote.observacoes ? "Preenchida" : "Nenhuma";
  }

  // ===================== Preview (paper) =====================
  function setLine(el, label, value) {
    if (value) {
      el.hidden = false;
      el.textContent = value;
    } else {
      el.hidden = true;
    }
  }

  function renderPreviewOnly() {
    if (provider.logo) {
      $("pvLogo").src = provider.logo;
      $("pvLogoWrap").hidden = false;
    } else {
      $("pvLogoWrap").hidden = true;
    }

    $("pvNumero").textContent = quote.numero || "—";
    $("pvEnviado").textContent = formatDateBR(quote.dataEnvio);

    const validadeDias = parseInt(quote.validade, 10);
    if (validadeDias > 0 && quote.dataEnvio) {
      $("pvValidoWrap").hidden = false;
      $("pvValido").textContent = formatDateBR(addDaysISO(quote.dataEnvio, validadeDias));
    } else {
      $("pvValidoWrap").hidden = true;
    }

    if (quote.referencia) {
      $("pvReferenciaWrap").hidden = false;
      $("pvReferencia").textContent = quote.referencia;
    } else {
      $("pvReferenciaWrap").hidden = true;
    }

    $("pvProvNome").textContent = provider.nome || "Seu nome";
    setLine($("pvProvDoc"), "doc", provider.doc);
    setLine($("pvProvTelefone"), "tel", provider.telefone);
    setLine($("pvProvEmail"), "email", provider.email);
    setLine($("pvProvEndereco"), "end", provider.endereco);

    $("pvCliNome").textContent = quote.cliente.nome || "Nome do cliente";
    setLine($("pvCliDoc"), "doc", quote.cliente.doc);
    setLine($("pvCliTelefone"), "tel", quote.cliente.telefone);
    setLine($("pvCliEmail"), "email", quote.cliente.email);

    const pvItemsBody = $("pvItemsBody");
    pvItemsBody.innerHTML = "";
    quote.itens.forEach((item) => {
      const tr = document.createElement("tr");
      const total = (item.qtd || 0) * (item.valor || 0);
      tr.innerHTML = `
        <td>${escapeHtml(item.nome) || "Item sem descrição"}</td>
        <td>${item.qtd || 0}</td>
        <td>${formatBRL(item.valor || 0)}</td>
        <td>${formatBRL(total)}</td>
      `;
      pvItemsBody.appendChild(tr);
    });

    const { subtotal, descontoValor, impostoValor, total } = computeTotals();
    $("pvSubtotal").textContent = formatBRL(subtotal);

    if (descontoValor > 0) {
      $("pvDescontoWrap").hidden = false;
      $("pvDesconto").textContent = `– ${formatBRL(descontoValor)}`;
    } else {
      $("pvDescontoWrap").hidden = true;
    }

    if (impostoValor > 0) {
      $("pvImpostoWrap").hidden = false;
      $("pvImposto").textContent = formatBRL(impostoValor);
    } else {
      $("pvImpostoWrap").hidden = true;
    }

    $("pvTotal").textContent = formatBRL(total);

    const hasPagamento = !!quote.pagamento;
    const hasObs = !!quote.observacoes;
    $("pvFootWrap").hidden = !(hasPagamento || hasObs);
    $("pvPagamentoWrap").hidden = !hasPagamento;
    $("pvPagamento").textContent = quote.pagamento || "";
    $("pvObservacoesWrap").hidden = !hasObs;
    $("pvObservacoes").textContent = quote.observacoes || "";

    if (provider.portfolio) {
      $("pvPortfolioWrap").hidden = false;
      $("pvPortfolioLink").textContent = provider.portfolio;
      $("pvQr").src = "https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=" + encodeURIComponent(provider.portfolio);
    } else {
      $("pvPortfolioWrap").hidden = true;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderAll() {
    renderStatuses();
    renderPreviewOnly();
  }

  // ===================== Init =====================
  function fillQuoteFields() {
    fldNumero.value = quote.numero;
    fldDataEnvio.value = quote.dataEnvio;
    fldValidade.value = quote.validade;
    fldReferencia.value = quote.referencia;

    renderClientOptions();
    fldCliNome.value = quote.cliente.nome;
    fldCliDoc.value = quote.cliente.doc;
    fldCliTelefone.value = quote.cliente.telefone;
    fldCliEmail.value = quote.cliente.email;

    fldDesconto.value = quote.desconto;
    fldImposto.value = quote.imposto;
    segDescontoTipo.querySelectorAll(".segmented__opt").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.val === quote.descontoTipo);
    });

    fldPagamento.value = quote.pagamento;
    fldObservacoes.value = quote.observacoes;

    renderItemsEditor();
  }

  fldCatalogo.value = catalog.raw || "";
  fillProviderFields();
  fillQuoteFields();
  renderAll();
})();
