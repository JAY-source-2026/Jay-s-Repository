// ===== 자료실(앨범) · 고객지원(게시판) · 라이트박스 =====
// 데이터는 assets/data/archive.json, assets/data/support.json 에 있습니다.
// 자료를 추가할 때 이 파일은 손대지 않고 JSON 만 고치면 됩니다.
(function () {
  "use strict";

  var DOENC = (window.DOENC = window.DOENC || {});

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }

  // ---------------------------------------------------------------- 라이트박스
  var lb = {
    root: null, stage: null, title: null, desc: null, count: null, file: null,
    prev: null, next: null, items: [], i: 0, lastFocus: null,
  };
  function lbInit() {
    if (lb.root) return true;
    lb.root = document.getElementById("lightbox");
    if (!lb.root) return false;
    lb.stage = document.getElementById("lbStage");
    lb.title = document.getElementById("lbTitle");
    lb.desc = document.getElementById("lbDesc");
    lb.count = document.getElementById("lbCount");
    lb.file = document.getElementById("lbFile");
    lb.prev = document.getElementById("lbPrev");
    lb.next = document.getElementById("lbNext");
    lb.root.querySelectorAll("[data-lb-close]").forEach(function (b) {
      b.addEventListener("click", lbClose);
    });
    lb.prev.addEventListener("click", function () { lbGo(-1); });
    lb.next.addEventListener("click", function () { lbGo(1); });
    document.addEventListener("keydown", function (e) {
      if (!lb.root.classList.contains("open")) return;
      if (e.key === "Escape") lbClose();
      else if (e.key === "ArrowLeft") lbGo(-1);
      else if (e.key === "ArrowRight") lbGo(1);
    });
    return true;
  }
  // opts: { title, desc, items:[{src,type}], file:{name,size,href} }
  function lbOpen(opts) {
    if (!lbInit()) return;
    lb.items = opts.items || [];
    lb.i = opts.index || 0;
    lb.title.textContent = opts.title || "";
    lb.desc.textContent = opts.desc || "";
    var f = opts.file;
    if (f && f.name) {
      lb.file.hidden = false;
      lb.file.textContent = f.href
        ? f.name + " 받기"
        : f.name + " (준비중)";
      if (f.href) {
        lb.file.href = f.href;
        lb.file.classList.remove("off");
        lb.file.removeAttribute("aria-disabled");
      } else {
        lb.file.href = "#";
        lb.file.classList.add("off");
        lb.file.setAttribute("aria-disabled", "true");
      }
    } else {
      lb.file.hidden = true;
    }
    lb.lastFocus = document.activeElement;
    lb.root.hidden = false;
    lb.root.classList.add("open");
    document.body.classList.add("lb-lock");
    lbRender();
    lb.root.querySelector(".lb-close").focus();
  }
  function lbClose() {
    lb.root.classList.remove("open");
    lb.root.hidden = true;
    document.body.classList.remove("lb-lock");
    // 영상이 열려 있었다면 소리·재생을 멈춘다
    var v = lb.stage.querySelector("video");
    if (v) v.pause();
    lbStageClear();
    if (lb.lastFocus && lb.lastFocus.focus) lb.lastFocus.focus();
  }
  function lbStageClear() {
    Array.prototype.slice.call(lb.stage.children).forEach(function (c) {
      if (c !== lb.prev && c !== lb.next) lb.stage.removeChild(c);
    });
  }
  function lbGo(d) {
    if (lb.items.length < 2) return;
    lb.i = (lb.i + d + lb.items.length) % lb.items.length;
    lbRender();
  }
  function lbRender() {
    lbStageClear();
    var it = lb.items[lb.i];
    if (!it) return;
    if (it.label) lb.title.textContent = it.label;
    var node;
    if (it.type === "video") {
      node = document.createElement("video");
      node.src = it.src;
      node.controls = true;
      node.autoplay = true;
      node.loop = true;
      node.playsInline = true;
      node.muted = true;
      if (it.poster) node.poster = it.poster;
    } else {
      node = document.createElement("img");
      node.src = it.src;
      node.alt = lb.title.textContent;
    }
    lb.stage.insertBefore(node, lb.prev);
    var many = lb.items.length > 1;
    lb.prev.hidden = lb.next.hidden = !many;
    lb.count.textContent = many ? lb.i + 1 + " / " + lb.items.length : "";
  }
  DOENC.lightbox = lbOpen;

  // ---------------------------------------------------------------- 탭 공통
  // 카테고리 탭을 만들고, 해시(#firestop 등)로 진입할 수 있게 한다
  function buildTabs(cats, counts, onPick) {
    var tabs = document.getElementById("tabs");
    var lead = document.getElementById("paneLead");
    var btns = [];
    cats.forEach(function (c) {
      var b = el("button", "tab", esc(c.name) +
        (counts[c.id] ? ' <span class="tab-count">' + counts[c.id] + "</span>" : ""));
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { pick(c.id, true); });
      tabs.appendChild(b);
      btns.push(b);
    });
    function pick(id, push) {
      var idx = 0;
      cats.forEach(function (c, i) { if (c.id === id) idx = i; });
      btns.forEach(function (b, i) {
        b.classList.toggle("on", i === idx);
        b.setAttribute("aria-selected", i === idx ? "true" : "false");
      });
      lead.textContent = cats[idx].lead || "";
      if (push && location.hash.slice(1) !== cats[idx].id) {
        history.replaceState(null, "", "#" + cats[idx].id);
      }
      // 헤더 하위 메뉴에서 현재 위치 표시
      document.querySelectorAll(".nav-sub a, .mnav-sub a").forEach(function (a) {
        a.classList.toggle("current", a.hash === "#" + cats[idx].id &&
          a.pathname === location.pathname);
      });
      onPick(cats[idx]);
    }
    var start = location.hash.slice(1);
    var valid = cats.some(function (c) { return c.id === start; });
    pick(valid ? start : cats[0].id, false);
    window.addEventListener("hashchange", function () {
      var h = location.hash.slice(1);
      if (cats.some(function (c) { return c.id === h; })) pick(h, false);
    });
  }

  // ---------------------------------------------------------------- 자료실(앨범)
  DOENC.initArchive = function () {
    var panel = document.getElementById("albumPanel");
    if (!panel) return;
    panel.innerHTML = '<p class="empty">자료를 불러오는 중입니다…</p>';

    getJSON("assets/data/archive.json").then(function (data) {
      var counts = {};
      data.items.forEach(function (it) { counts[it.cat] = (counts[it.cat] || 0) + 1; });

      buildTabs(data.categories, counts, function (cat) {
        var items = data.items.filter(function (it) { return it.cat === cat.id; });
        panel.innerHTML = "";
        if (!items.length) {
          panel.appendChild(el("p", "empty", "등록된 자료가 없습니다. 자료가 준비되면 이곳에 올라갑니다."));
          return;
        }
        var ul = el("ul", "album");
        items.forEach(function (it) {
          var media = [];
          if (it.video) media.push({ type: "video", src: it.video, poster: (it.images || [])[0] });
          (it.images || []).forEach(function (src) {
            if (!(it.video && media.length === 1 && src === media[0].poster)) media.push({ type: "image", src: src });
          });
          var cover = (it.images || [])[0] || "";
          var extra = "";
          if (it.video) {
            extra = '<span class="album-play"><span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
              '<path d="M8 5v14l11-7z"/></svg></span></span>';
          } else if (media.length > 1) {
            extra = '<span class="album-count">' + media.length + "장</span>";
          }
          var li = el("li", "album-card reveal shown",
            '<button type="button" class="album-thumb" aria-label="' + esc(it.title) + ' 크게 보기">' +
              (cover ? '<img src="' + esc(cover) + '" alt="" loading="lazy">' : "") +
              (it.tag ? '<span class="album-tag">' + esc(it.tag) + "</span>" : "") +
              extra +
            "</button>" +
            '<div class="album-body"><h3>' + esc(it.title) + "</h3>" +
              '<p class="album-meta"><span>' + esc(it.date || "") + "</span>" +
              (it.file ? '<span class="album-file">' + esc(it.file.name) + "</span>" : "") +
              "</p></div>");
          li.querySelector(".album-thumb").addEventListener("click", function () {
            lbOpen({ title: it.title, desc: it.body, items: media, file: it.file });
          });
          ul.appendChild(li);
        });
        panel.appendChild(ul);
      });
    }).catch(function (err) {
      panel.innerHTML = '<p class="empty">자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
      if (window.console) console.error(err);
    });
  };

  // ---------------------------------------------------------------- 고객지원(게시판)
  DOENC.initSupport = function () {
    var panel = document.getElementById("boardPanel");
    if (!panel) return;
    panel.innerHTML = '<p class="empty">게시글을 불러오는 중입니다…</p>';

    getJSON("assets/data/support.json").then(function (data) {
      var counts = {};
      data.posts.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });

      function renderList(cat) {
        var posts = data.posts.filter(function (p) { return p.cat === cat.id; });
        panel.innerHTML = "";
        if (!posts.length) {
          panel.appendChild(el("p", "empty", "등록된 글이 없습니다."));
          return;
        }
        var box = el("div", "board");
        posts.forEach(function (p, i) {
          var body = (p.body || []).join(" ");
          var row = el("button", "board-row",
            '<span class="board-no">' + (posts.length - i) + "</span>" +
            '<span class="board-subj"><h3>' + esc(p.title) + "</h3>" +
              (body ? '<span class="board-excerpt">' + esc(body) + "</span>" : "") +
            "</span>" +
            '<span class="board-side">' +
              (p.images && p.images.length ? '<span class="board-chip">사진 ' + p.images.length + "</span>" : "") +
              (p.file ? '<span class="board-chip file">첨부</span>' : "") +
              "<span>" + esc(p.date || "") + "</span>" +
            "</span>");
          row.type = "button";
          row.addEventListener("click", function () { renderPost(cat, p); });
          box.appendChild(row);
        });
        panel.appendChild(box);
      }

      function renderPost(cat, p) {
        panel.innerHTML = "";
        var post = el("article", "post");
        post.appendChild(el("div", "post-head",
          "<h2>" + esc(p.title) + "</h2>" +
          '<p class="post-meta"><span>' + esc(cat.name) + "</span><span>" + esc(p.date || "") + "</span></p>"));

        var bodyHtml = (p.body || []).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
        var bodyEl = el("div", "post-body", bodyHtml);
        if (p.images && p.images.length) {
          var figs = el("ul", "post-figs");
          p.images.forEach(function (src, i) {
            var li = el("li", null, '<img src="' + esc(src) + '" alt="' + esc(p.title) + " 사진 " + (i + 1) +
              '" loading="lazy">');
            li.querySelector("img").style.cursor = "zoom-in";
            li.addEventListener("click", function () {
              lbOpen({
                title: p.title, desc: (p.body || [])[0] || "", index: i,
                items: p.images.map(function (s) { return { type: "image", src: s }; }),
              });
            });
            figs.appendChild(li);
          });
          bodyEl.appendChild(figs);
        }
        post.appendChild(bodyEl);

        if (p.file) {
          post.appendChild(el("div", "post-file",
            "<b>첨부</b><span>" + esc(p.file.name) + "</span>" +
            '<span class="size">' + esc(p.file.size || "") + "</span>" +
            (p.file.href
              ? '<a class="more" style="margin-left:auto" href="' + esc(p.file.href) + '" download>내려받기</a>'
              : '<span class="pending">파일 준비중</span>')));
        }
        var back = el("button", "post-back", "← 목록으로");
        back.type = "button";
        back.addEventListener("click", function () {
          renderList(cat);
          document.getElementById("tabs").scrollIntoView({ block: "start" });
        });
        post.appendChild(back);
        panel.appendChild(post);
        post.scrollIntoView({ block: "start" });
      }

      buildTabs(data.categories, counts, renderList);
    }).catch(function (err) {
      panel.innerHTML = '<p class="empty">게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
      if (window.console) console.error(err);
    });
  };

  // ---------------------------------------------------------------- 인증서 확대 보기
  var certBtns = document.querySelectorAll("[data-cert]");
  if (certBtns.length) {
    var all = Array.prototype.slice.call(certBtns);
    all.forEach(function (b, i) {
      b.addEventListener("click", function () {
        lbOpen({
          title: b.getAttribute("data-kind") + " · " + b.getAttribute("data-title"),
          desc: "㈜디오이엔씨 인증·특허 문서",
          index: i,
          items: all.map(function (x) {
            return {
              type: "image", src: x.getAttribute("data-cert"),
              label: x.getAttribute("data-kind") + " · " + x.getAttribute("data-title"),
            };
          }),
        });
      });
    });
  }
})();
