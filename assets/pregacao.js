// Lê o esboco.md da pasta da pregação e monta os cards expansíveis.
// Cada "## Título" do Markdown vira um card; os "### Subtítulos" aparecem como resumo no card.
(async function () {
  const root = document.getElementById("conteudo");
  const titleEl = document.getElementById("titulo");
  let md;
  try {
    const res = await fetch("esboco.md", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    md = await res.text();
  } catch (e) {
    root.innerHTML = '<p class="err">Não consegui carregar o esboço (esboco.md). Abra pelo link online ou por um servidor local.</p>';
    return;
  }

  const html = marked.parse(md);
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Título (h1)
  const h1 = tmp.querySelector("h1");
  if (h1) {
    titleEl.textContent = h1.textContent;
    document.title = h1.textContent;
    h1.remove();
  }

  // Links abrem em nova aba
  tmp.querySelectorAll("a").forEach(a => { a.target = "_blank"; a.rel = "noopener"; });

  // Conteúdo antes do primeiro h2 (ex.: texto base)
  const intro = document.createElement("div");
  intro.className = "intro";
  let node = tmp.firstChild;
  while (node && node.nodeName !== "H2") {
    const next = node.nextSibling;
    intro.appendChild(node);
    node = next;
  }
  root.appendChild(intro);

  // Cada h2 vira um <details>
  let i = 0;
  while (node) {
    if (node.nodeName === "H2") {
      const det = document.createElement("details");
      det.className = "sec";
      det.id = "s" + (++i);
      const sum = document.createElement("summary");
      const t = document.createElement("span");
      t.className = "t";
      t.textContent = node.textContent;
      sum.appendChild(t);
      const body = document.createElement("div");
      body.className = "body";
      det.appendChild(sum);
      det.appendChild(body);

      let n = node.nextSibling;
      while (n && n.nodeName !== "H2") {
        const next = n.nextSibling;
        body.appendChild(n);
        n = next;
      }
      const subs = [...body.querySelectorAll("h3")].map(h => h.textContent);
      if (subs.length) {
        const s = document.createElement("span");
        s.className = "subs";
        s.textContent = subs.join(" · ");
        sum.appendChild(s);
      }
      root.appendChild(det);
      node = n;
    } else {
      node = node.nextSibling;
    }
  }

  // Botões
  const all = () => [...document.querySelectorAll("details.sec")];
  document.getElementById("abrir").onclick = () => all().forEach(d => (d.open = true));
  document.getElementById("fechar").onclick = () => all().forEach(d => (d.open = false));

  const toast = msg => {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 1800);
  };

  document.getElementById("copiar").onclick = async () => {
    try { await navigator.clipboard.writeText(md); toast("Esboço copiado (Markdown)"); }
    catch { toast("Não deu pra copiar"); }
  };

  document.getElementById("compartilhar").onclick = async () => {
    const data = { title: document.title, url: location.href };
    if (navigator.share) { try { await navigator.share(data); } catch {} }
    else { await navigator.clipboard.writeText(location.href); toast("Link copiado"); }
  };

  // ---------- Ouvir (leitura em voz alta pelo navegador) ----------
  const synth = window.speechSynthesis;
  const btnOuvir = document.getElementById("ouvir");
  if (!synth) { btnOuvir.style.display = "none"; }

  const limpar = s => s
    .replace(/[\u{1F000}-\u{1FAFF}☀-➿️‍]/gu, "")
    .replace(/—\s*www\.\S+/g, "")
    .replace(/\bARC\b/g, "Almeida Revista e Corrigida")
    .replace(/(\d+):(\d+)[–-](\d+)/g, "$1, versículos $2 a $3")
    .replace(/(\d+):(\d+)/g, "$1, versículo $2")
    .replace(/·/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  // Blocos lidos, na ordem da página
  const blocos = () => {
    const out = [];
    const intro = document.querySelector(".intro");
    if (intro) intro.querySelectorAll("p").forEach(el => out.push({ el, sec: null }));
    all().forEach(sec => {
      out.push({ el: sec.querySelector("summary .t"), sec });
      sec.querySelectorAll(".body > h3, .body > p, .body > ul > li, .body > blockquote").forEach(el => out.push({ el, sec }));
    });
    return out.filter(b => limpar(b.el.textContent));
  };

  let gen = 0, fila = [], pos = 0, lendo = false, pausado = false, voz = null;
  const escolherVoz = () => {
    const vs = synth.getVoices();
    voz = vs.find(v => /pt[-_]BR/i.test(v.lang) && /google|natural|online/i.test(v.name))
       || vs.find(v => /pt[-_]BR/i.test(v.lang))
       || vs.find(v => /^pt/i.test(v.lang)) || null;
  };
  if (synth) { escolherVoz(); synth.onvoiceschanged = escolherVoz; }

  const marcar = el => {
    document.querySelectorAll(".lendo").forEach(e => e.classList.remove("lendo"));
    if (el) { el.classList.add("lendo"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  };
  const atualizarBotao = () => {
    btnOuvir.textContent = !lendo ? "▶ Ouvir" : pausado ? "▶ Continuar" : "❚❚ Pausar";
    document.getElementById("parar").style.display = lendo ? "" : "none";
  };

  const falar = () => {
    if (!lendo || pos >= fila.length) { parar(); return; }
    const b = fila[pos];
    if (b.sec && !b.sec.open) b.sec.open = true;
    marcar(b.el);
    const u = new SpeechSynthesisUtterance(limpar(b.el.textContent));
    u.lang = "pt-BR";
    if (voz) u.voice = voz;
    u.rate = 1;
    const g = ++gen;
    u.onend = () => { if (g === gen && lendo && !pausado) { pos++; falar(); } };
    synth.speak(u);
  };
  const iniciar = (inicio = 0) => {
    gen++; synth.cancel();
    fila = blocos(); pos = inicio; lendo = true; pausado = false;
    atualizarBotao(); falar();
  };
  const parar = () => {
    lendo = false; pausado = false; gen++; synth && synth.cancel(); marcar(null); atualizarBotao();
  };

  btnOuvir.onclick = () => {
    if (!lendo) {
      // começa na parte aberta (se tiver uma), senão do começo
      const aberta = all().find(d => d.open);
      const f = blocos();
      const i = aberta ? f.findIndex(b => b.sec === aberta) : 0;
      iniciar(Math.max(0, i));
    } else if (!pausado) {
      pausado = true; gen++; synth.cancel(); atualizarBotao();
    } else {
      pausado = false; atualizarBotao(); falar();
    }
  };
  document.getElementById("parar").onclick = parar;

  // Tocar num parágrafo enquanto lê: pula pra ele
  root.addEventListener("click", e => {
    if (!lendo) return;
    const el = e.target.closest("p, li, h3, blockquote");
    if (!el) return;
    const i = fila.findIndex(b => b.el === el || b.el.contains(el));
    if (i >= 0) { gen++; synth.cancel(); pos = i; pausado = false; atualizarBotao(); setTimeout(falar, 50); }
  });
  window.addEventListener("beforeunload", () => synth && synth.cancel());
  atualizarBotao();

  // Tamanho da fonte (salvo no aparelho)
  const r = document.documentElement;
  let fs = parseInt(localStorage.getItem("pregacao-fs") || "18", 10);
  const setFs = v => { fs = Math.max(14, Math.min(28, v)); r.style.setProperty("--fs", fs + "px"); localStorage.setItem("pregacao-fs", fs); };
  setFs(fs);
  document.getElementById("menos").onclick = () => setFs(fs - 2);
  document.getElementById("mais").onclick = () => setFs(fs + 2);
})();
