// ===== 분야별 자료실(게시판) · 고객지원(게시판) · 라이트박스 =====
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
    prev: null, next: null, zoom: null, items: [], i: 0, lastFocus: null,
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
    lb.zoom = document.getElementById("lbZoom");
    if (lb.zoom) lb.zoom.addEventListener("click", function () {
      var zoomed = lb.root.classList.toggle("lb-zoomed");
      lb.zoom.setAttribute("aria-pressed", String(zoomed));
      lb.zoom.textContent = zoomed ? "화면에 맞추기" : "원본 크기";
      lb.stage.scrollTo(0, 0);
    });
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
    lb.root.classList.toggle("lb-document", !!opts.document);
    if (lb.zoom) lb.zoom.hidden = !opts.document;
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
    lb.root.classList.remove("lb-zoomed");
    if (lb.zoom) { lb.zoom.setAttribute("aria-pressed", "false"); lb.zoom.textContent = "원본 크기"; }
    lb.stage.scrollTo(0, 0);
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

  // ---------------------------------------------------------------- 분야별 자료실(게시판)
  DOENC.initArchive = function () {
    var panel = document.getElementById("archivePanel");
    if (!panel) return;
    var tabs = document.getElementById("archiveTabs");
    var status = document.getElementById("archiveStatus");
    var searchForm = document.getElementById("archiveSearch");
    var searchInput = document.getElementById("archiveQuery");
    var clearSearch = document.getElementById("archiveClear");
    panel.setAttribute("aria-busy", "true");
    panel.innerHTML = '<p class="empty">자료를 불러오는 중입니다…</p>';

    getJSON("assets/data/archive.json?v=20261104r5").then(function (data) {
      var previous = null;
      var pageSize = 10;
      function boardName(cat, board) { return cat.label + " " + board.name; }
      function boardHash(cat, board) { return "#" + cat.id + "/" + board.id; }
      function boardGroups(cat, board) { return (cat.boardGroups && cat.boardGroups[board.id]) || []; }
      function listHash(cat, board, group) { return boardHash(cat, board) + (group ? "/" + group.id : ""); }
      function routeHash(cat, board, group, post, query, page) {
        var hash = listHash(cat, board, group) + (post ? "/" + post.id : "");
        var params = new URLSearchParams();
        if (query) params.set("q", query);
        if (page > 1) params.set("page", page);
        return hash + (params.size ? "?" + params.toString() : "");
      }
      function normalized(value) {
        return String(value || "").normalize("NFKC").toLowerCase().replace(/[\s\-‐‑–—·()]/g, "");
      }
      function matchesSearch(item, query) {
        var code = normalized(query);
        if (/^(?:fs|fr)[a-z]+\d+$/.test(code)) return normalized(item.certificate).includes(code);
        var text = normalized([item.title, item.certificate, item.tag, item.file && item.file.name, item.body].join(" "));
        return query.trim().split(/\s+/).every(function (word) { return text.includes(normalized(word)); });
      }
      function getItems(cat, board) {
        return data.items.filter(function (it) { return it.cat === cat.id && it.board === board.id; })
          .sort(function (a, b) {
            if (a.sourceNumber && b.sourceNumber) return a.sourceNumber - b.sourceNumber;
            return (b.date || "").localeCompare(a.date || "");
          });
      }
      function renderTabs(cat, board) {
        if (!previous || previous.cat.id !== cat.id) {
          tabs.innerHTML = "";
          cat.boards.forEach(function (id) {
            var type = data.boards.find(function (b) { return b.id === id; });
            var button = el("button", "tab", esc(boardName(cat, type)) +
              ' <span class="tab-count">' + getItems(cat, type).length + "</span>");
            button.type = "button";
            button.id = "archive-tab-" + id;
            button.dataset.board = id;
            button.setAttribute("role", "tab");
            button.setAttribute("aria-controls", "archivePanel");
            button.addEventListener("click", function () { location.hash = boardHash(cat, type); });
            tabs.appendChild(button);
          });
        }
        tabs.setAttribute("aria-label", cat.label + " 자료 유형");
        tabs.querySelectorAll(".tab").forEach(function (button) {
          var selected = button.dataset.board === board.id;
          button.classList.toggle("on", selected);
          button.setAttribute("aria-selected", String(selected));
          button.tabIndex = selected ? 0 : -1;
        });
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", "archive-tab-" + board.id);
        panel.tabIndex = 0;
      }

      function renderGroups(cat, board, group, query) {
        var groups = boardGroups(cat, board);
        if (!groups.length) return;
        var nav = el("nav", "archive-groups");
        nav.setAttribute("aria-label", boardName(cat, board) + " 분류");
        var all = getItems(cat, board).filter(function (it) { return matchesSearch(it, query); });
        [null].concat(groups).forEach(function (g) {
          var count = g ? all.filter(function (it) { return it.group === g.id; }).length : all.length;
          var link = el("a", "archive-group", esc(g ? g.name : "전체") + ' <span>' + count + '</span>');
          link.href = routeHash(cat, board, g, null, query, 1);
          if ((!g && !group) || (g && group && g.id === group.id)) {
            link.classList.add("on");
            link.setAttribute("aria-current", "page");
          }
          nav.appendChild(link);
        });
        panel.appendChild(nav);
      }

      function renderList(cat, board, group, items, query, page, totalPages) {
        var name = boardName(cat, board) + (group ? " · " + group.name : "");
        panel.appendChild(el("div", "archive-board-head", '<h2 id="archiveListTitle" tabindex="-1">' + esc(name) + '</h2>' +
          '<p class="archive-total">' + (query ? '검색 결과 ' : '총 ') + '<strong>' + items.length + '</strong>건</p>'));
        if (query) panel.appendChild(el("p", "archive-query-summary", '“' + esc(query) + '” 검색 결과입니다.'));
        var table = el("table", "archive-table", '<caption class="sr-only">' + esc(name) + ' 게시글 목록</caption>' +
          '<thead><tr><th scope="col" class="archive-number">번호</th><th scope="col">제목</th>' +
          '<th scope="col" class="archive-attachment">첨부</th><th scope="col" class="archive-date">등록일</th></tr></thead>');
        var body = el("tbody");
        var offset = (page - 1) * pageSize;
        items.slice(offset, offset + pageSize).forEach(function (it, i) {
          var attachment = it.file ? "파일" : (it.video ? "영상" : (it.images || []).length ? "사진" : "—");
          var row = el("tr", null,
            '<td class="archive-number">' + (it.sourceNumber || items.length - offset - i) + '</td>' +
            '<td><a class="archive-subject" href="' + esc(routeHash(cat, board, group, it, query, page)) + '">' +
            (it.tag ? '<span class="archive-tag">' + esc(it.tag) + '</span>' : '') + esc(it.title) + '</a></td>' +
            '<td class="archive-attachment">' + attachment + '</td><td class="archive-date">' + esc(it.date || "—") + '</td>');
          body.appendChild(row);
        });
        table.appendChild(body);
        panel.appendChild(table);
        if (!items.length) panel.appendChild(el("p", "archive-empty", query ? "검색 결과가 없습니다. 검색어를 바꾸거나 초기화해 주세요." : "등록된 자료가 없습니다."));
        if (totalPages > 1) {
          var pagination = el("nav", "archive-pagination");
          pagination.setAttribute("aria-label", "게시글 목록 페이지");
          function pageLink(number, text, label) {
            var a = el("a", "", text);
            a.href = routeHash(cat, board, group, null, query, number);
            a.setAttribute("aria-label", label);
            if (number === page && text === String(number)) a.setAttribute("aria-current", "page");
            pagination.appendChild(a);
          }
          if (page > 1) pageLink(page - 1, "‹", "이전 페이지");
          for (var n = 1; n <= totalPages; n++) pageLink(n, String(n), n + "페이지");
          if (page < totalPages) pageLink(page + 1, "›", "다음 페이지");
          panel.appendChild(pagination);
        }
      }

      function renderPost(cat, board, group, it, query, page) {
        var post = el("article", "post");
        var itemGroup = boardGroups(cat, board).find(function (g) { return g.id === it.group; });
        post.appendChild(el("div", "post-head", '<h2 id="archivePostTitle" tabindex="-1">' + esc(it.title) + '</h2>' +
          '<p class="post-meta"><span>' + esc(boardName(cat, board)) + '</span>' +
          (itemGroup ? '<span>' + esc(itemGroup.name) + '</span>' : '') +
          '<span>등록일 ' + esc(it.date || "") + '</span></p>'));
        var paragraphs = Array.isArray(it.body) ? it.body : [it.body || ""];
        var body = el("div", "post-body", paragraphs.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(""));
        if (it.previews && it.previews.length) {
          var previews = el("section", "certificate-previews", '<h3>인정서 미리보기</h3><p>이미지를 누르면 확대해서 볼 수 있습니다.</p>');
          var grid = el("div", "certificate-preview-grid");
          it.previews.forEach(function (preview, index) {
            var figure = el("figure", "certificate-preview", '<button type="button" class="certificate-preview-button" aria-label="' + esc(preview.label) + ' 확대">' +
              '<img src="' + esc(preview.src) + '" width="' + preview.width + '" height="' + preview.height + '" alt="' + esc(it.certificate + ' ' + preview.label) + '" loading="lazy"></button>' +
              '<figcaption>' + esc(preview.label) + '</figcaption>');
            figure.querySelector("button").addEventListener("click", function () {
              lbOpen({ title: it.title, desc: "PDF 원문의 1페이지와 3페이지", document: true, index: index, file: it.file,
                items: it.previews.map(function (p) { return { type: "image", src: p.src, label: it.certificate + " · " + p.label }; }) });
            });
            grid.appendChild(figure);
          });
          previews.appendChild(grid);
          body.appendChild(previews);
        }
        if (it.video) {
          var video = document.createElement("video");
          video.className = "archive-video";
          video.src = it.video;
          video.controls = true;
          video.playsInline = true;
          video.preload = "metadata";
          video.setAttribute("aria-label", it.title);
          if (it.images && it.images[0]) video.poster = it.images[0];
          body.appendChild(video);
        }
        var images = (it.images || []).filter(function (src, i) { return !it.video || i > 0; });
        if (images.length) {
          var figures = el("ul", "post-figs");
          images.forEach(function (src, i) {
            var figure = el("li", null, '<button type="button" class="archive-photo" aria-label="' +
              esc(it.title) + ' 사진 ' + (i + 1) + ' 확대"><img src="' + esc(src) + '" alt="' +
              esc(it.title) + ' 사진 ' + (i + 1) + '" loading="lazy"></button>');
            figure.querySelector("button").addEventListener("click", function () {
              lbOpen({ title: it.title, desc: paragraphs[0], index: i,
                items: images.map(function (s) { return { type: "image", src: s }; }) });
            });
            figures.appendChild(figure);
          });
          body.appendChild(figures);
        }
        if (it.file) {
          post.appendChild(el("div", "post-file", '<div class="post-file-info"><span class="post-file-label">첨부파일</span>' +
            '<span class="post-file-name">' + esc(it.file.name) + '</span><span class="post-file-meta">' +
            '<span class="size">' + esc(it.file.size || "") + '</span>' +
            (it.file.pages ? '<span class="size">' + it.file.pages + '쪽</span>' : '') + '</span></div>' +
            (it.file.href ? '<span class="post-file-actions">' +
              (it.file.type === "application/pdf" ? '<a class="archive-file-button archive-pdf-open" href="' + esc(it.file.href) + '" target="_blank" rel="noopener">PDF 열기 <span class="sr-only">(새 창)</span><span aria-hidden="true">↗</span></a>' : '') +
              '<a class="archive-file-button archive-download" href="' + esc(it.file.href) + '" download="' + esc(it.file.name) + '">내려받기 <span aria-hidden="true">↓</span></a></span>' :
              '<span class="pending">파일 준비중</span>')));
        }
        post.appendChild(body);
        post.appendChild(el("a", "post-back", "← 목록으로"));
        post.querySelector(".post-back").href = routeHash(cat, board, group, null, query, page);
        panel.appendChild(post);
      }

      function render() {
        // 기존 #firestop 링크도 유지하며 세부 게시판·글은 해시에 저장한다.
        var route = location.hash.slice(1);
        var queryIndex = route.indexOf("?");
        var parts = (queryIndex < 0 ? route : route.slice(0, queryIndex)).split("/");
        var params = new URLSearchParams(queryIndex < 0 ? "" : route.slice(queryIndex + 1));
        var query = (params.get("q") || "").trim().slice(0, 120);
        var cat = data.categories.find(function (c) { return c.id === parts[0]; }) || data.categories[0];
        var boardId = cat.boards.indexOf(parts[1]) >= 0 ? parts[1] : cat.boards[0];
        var board = data.boards.find(function (b) { return b.id === boardId; });
        var group = boardGroups(cat, board).find(function (g) { return g.id === parts[2]; }) || null;
        var allItems = getItems(cat, board).filter(function (it) { return !group || it.group === group.id; });
        var post = allItems.find(function (it) { return it.id === parts[group ? 3 : 2]; });
        var items = allItems.filter(function (it) { return matchesSearch(it, query); });
        var totalPages = Math.max(1, Math.ceil(items.length / pageSize));
        var requestedPage = Number(params.get("page") || 1);
        var page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
        var list = routeHash(cat, board, group, null, query, page);
        var hash = routeHash(cat, board, group, post, query, page);
        if (location.hash !== hash) history.replaceState(null, "", hash);
        if (lb.root && lb.root.classList.contains("open")) lbClose();
        panel.querySelectorAll("video").forEach(function (v) { v.pause(); });
        var restoreGroupFocus = document.activeElement && document.activeElement.closest(".archive-groups");
        var restorePageFocus = document.activeElement && document.activeElement.closest(".archive-pagination");
        panel.innerHTML = "";
        document.getElementById("archiveCategory").textContent = cat.label;
        document.getElementById("archiveTitle").textContent = cat.name;
        document.getElementById("archiveLead").textContent = cat.lead;
        document.title = (post ? post.title : boardName(cat, board) + (group ? " · " + group.name : "")) + " | 디오이엔씨 자료실";
        document.querySelectorAll(".nav-sub a, .mnav-sub a").forEach(function (a) {
          var current = a.pathname === location.pathname && a.hash === "#" + cat.id;
          a.classList.toggle("current", current);
          if (current) a.setAttribute("aria-current", "page");
          else a.removeAttribute("aria-current");
        });
        document.querySelector('[data-nav="archive"] .nav-top').classList.add("current");
        renderTabs(cat, board);
        searchForm.hidden = !!post;
        searchInput.value = query;
        clearSearch.hidden = !query;
        renderGroups(cat, board, group, query);
        if (post) renderPost(cat, board, group, post, query, page);
        else renderList(cat, board, group, items, query, page, totalPages);
        panel.setAttribute("aria-busy", "false");
        status.textContent = boardName(cat, board) + (group ? " " + group.name : "") + (post ? ": " + post.title :
          (query ? ", " + query + " 검색 결과 " : ", 총 ") + items.length + "건, " + page + "/" + totalPages + "페이지");
        if (previous) {
          if (post) {
            var heading = document.getElementById("archivePostTitle");
            heading.focus({ preventScroll: true });
            heading.scrollIntoView({ block: "start" });
          } else if (previous.post && previous.list === list) {
            var link = Array.from(panel.querySelectorAll(".archive-subject")).find(function (a) {
              return a.getAttribute("href") === previous.hash;
            });
            if (link) { link.focus({ preventScroll: true }); link.scrollIntoView({ block: "center" }); }
          } else if (restorePageFocus) {
            var activePage = panel.querySelector('.archive-pagination [aria-current="page"]');
            if (activePage) activePage.focus({ preventScroll: true });
            document.getElementById("archiveListTitle").scrollIntoView({ block: "start" });
          } else if (restoreGroupFocus) {
            var activeGroup = panel.querySelector('.archive-groups [aria-current="page"]');
            if (activeGroup) activeGroup.focus({ preventScroll: true });
          } else if (previous.cat.id !== cat.id) {
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        }
        previous = { cat: cat, board: board, group: group, post: post, list: list, hash: hash, query: query, page: page };
      }

      function submitSearch() {
        if (!previous) return;
        location.hash = routeHash(previous.cat, previous.board, previous.group, null, searchInput.value.trim().slice(0, 120), 1);
      }
      searchForm.addEventListener("submit", function (e) { e.preventDefault(); submitSearch(); });
      clearSearch.addEventListener("click", function () { searchInput.value = ""; searchInput.focus(); submitSearch(); });
      searchInput.addEventListener("search", function () { if (!searchInput.value) submitSearch(); });

      tabs.addEventListener("keydown", function (e) {
        var buttons = Array.from(tabs.querySelectorAll('[role="tab"]'));
        var i = buttons.indexOf(document.activeElement);
        if (i < 0) return;
        if (e.key === "ArrowRight") i = (i + 1) % buttons.length;
        else if (e.key === "ArrowLeft") i = (i + buttons.length - 1) % buttons.length;
        else if (e.key === "Home") i = 0;
        else if (e.key === "End") i = buttons.length - 1;
        else return;
        e.preventDefault();
        buttons.forEach(function (b, index) { b.tabIndex = index === i ? 0 : -1; });
        buttons[i].focus();
      });
      document.getElementById("lightbox").addEventListener("keydown", function (e) {
        if (e.key !== "Tab") return;
        var controls = Array.from(this.querySelectorAll('button, a[href], video[controls]')).filter(function (n) {
          return !n.disabled && n.getAttribute("aria-disabled") !== "true" && n.getClientRects().length;
        });
        var first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      window.addEventListener("hashchange", render);
      render();
    }).catch(function (err) {
      panel.removeAttribute("aria-busy");
      panel.innerHTML = '<p class="empty" role="alert">자료를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>';
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
