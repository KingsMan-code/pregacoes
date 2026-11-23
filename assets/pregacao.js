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

  // Tamanho da fonte (salvo no aparelho)
  const r = document.documentElement;
  let fs = parseInt(localStorage.getItem("pregacao-fs") || "18", 10);
  const setFs = v => { fs = Math.max(14, Math.min(28, v)); r.style.setProperty("--fs", fs + "px"); localStorage.setItem("pregacao-fs", fs); };
  setFs(fs);
  document.getElementById("menos").onclick = () => setFs(fs - 2);
  document.getElementById("mais").onclick = () => setFs(fs + 2);
})();
