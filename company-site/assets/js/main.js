// ===== DOENC site interactions =====
(function () {
  "use strict";

  // 사업부별 문의 메일 수신 주소 — 변경 시 이 부분만 수정하면 됩니다.
  var TEAM_EMAIL = {
    firestop: "firestop@doenc.com", // 내화채움구조 사업부
    firescreen: "firescreen@doenc.com", // 셔터 사업부
  };
  var DEFAULT_TEAM = "firestop";

  var header = document.getElementById("siteHeader");
  var navToggle = document.getElementById("navToggle");
  var mobileNav = document.getElementById("mobileNav");

  // ----- Header background on scroll -----
  function onScroll() {
    if (window.scrollY > 40) header.classList.add("solid");
    else header.classList.remove("solid");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ----- 데스크톱 메가 메뉴 -----
  // 대메뉴 하나에 박스가 딸려 나오는 방식이 아니라, 헤더 폭 전체에 판 하나가 내려오고
  // 네 메뉴의 하위 항목이 동시에 펼쳐진다. 열림 상태는 헤더의 .mega 클래스 하나로만 관리한다.
  var navItems = Array.prototype.slice.call(document.querySelectorAll(".nav-item"));
  var megaHold = null;

  function setMega(open) {
    if (!header) return;
    header.classList.toggle("mega", !!open);
    navItems.forEach(function (o) {
      var t = o.querySelector(".nav-top");
      if (t) t.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) o.classList.remove("open");
    });
  }
  function openMega() { if (megaHold) { clearTimeout(megaHold); megaHold = null; } setMega(true); }
  // 메뉴와 판 사이를 지나갈 때 깜빡이지 않을 만큼만 늦춘다 — 길면 판이 남아 답답하다
  function closeMega() {
    if (megaHold) clearTimeout(megaHold);
    megaHold = setTimeout(function () { setMega(false); megaHold = null; }, 55);
  }

  var navBar = document.querySelector(".hd-nav");
  function megaHeight() {
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--mega-h"));
    return v || 292;
  }
  if (header && navBar) {
    // 여는 건 대메뉴에 올렸을 때만 — 히어로 위에서 마우스가 스치기만 해도 열리면 성가시다
    navBar.addEventListener("mouseenter", openMega);
    // ⚠️ 판은 헤더 박스보다 아래로 내려와 있어 header 의 mouseleave 가 판 위에서 먼저 뜬다.
    //    그래서 닫는 판정은 '헤더 + 판' 사각형으로 직접 한다.
    document.addEventListener("mousemove", function (e) {
      if (!header.classList.contains("mega")) return;
      var r = header.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.top + r.height + megaHeight();
      if (inside) openMega(); else closeMega();
    }, { passive: true });
  }

  navItems.forEach(function (item) {
    var top = item.querySelector(".nav-top");
    if (!top) return;
    // 터치 기기: 첫 탭은 '판 열기', 두 번째 탭에서 이동
    top.addEventListener("click", function (e) {
      var isTouch = window.matchMedia && window.matchMedia("(hover: none)").matches;
      if (isTouch && !header.classList.contains("mega")) { e.preventDefault(); openMega(); }
    });
    top.addEventListener("focus", openMega);
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".hd-nav")) return;
    setMega(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMega(false);
  });
  // 포커스가 헤더 밖으로 나가면 닫는다(키보드 이동)
  document.addEventListener("focusin", function (e) {
    if (!header) return;
    if (!header.contains(e.target)) setMega(false);
  });

  // ----- 모바일 하위 메뉴(아코디언) -----
  Array.prototype.slice.call(document.querySelectorAll(".mnav-group > button.mnav-top")).forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.parentNode;
      var open = !group.classList.contains("open");
      // 한 번에 하나만 열어둔다
      document.querySelectorAll(".mnav-group.open").forEach(function (g) {
        if (g !== group) {
          g.classList.remove("open");
          var b = g.querySelector("button.mnav-top");
          if (b) b.setAttribute("aria-expanded", "false");
        }
      });
      group.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  // ----- Mobile menu -----
  if (navToggle && mobileNav) {
    var setMenu = function (open) {
      mobileNav.classList.toggle("open", open);
      navToggle.classList.toggle("on", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      if (open) header.classList.add("solid");
      else onScroll();
    };
    navToggle.addEventListener("click", function () {
      setMenu(!mobileNav.classList.contains("open"));
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileNav.classList.contains("open")) {
        setMenu(false);
        navToggle.focus();
      }
    });
  }

  // ----- Reveal on scroll -----
  var revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("shown");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    revealables.forEach(function (el, i) {
      // 같은 그룹은 살짝 시차를 두고 등장
      el.style.transitionDelay = (i % 4) * 90 + "ms";
      io.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("shown");
    });
  }

  // ----- Nav current-section highlight -----
  // 링크가 '다른 페이지 + 해시' 형태(about.html#ceo)이므로 지금 페이지의 해시만 골라낸다
  var here = location.pathname.replace(/\/$/, "/index.html");
  var navLinks = Array.prototype.slice
    .call(document.querySelectorAll(".hd-nav a[href*='#']"))
    .filter(function (a) {
      var samePage = a.pathname.replace(/\/$/, "/index.html") === here;
      return samePage && a.hash.length > 1;
    });
  var sections = navLinks
    .map(function (a) {
      try { return document.querySelector(a.hash); } catch (e) { return null; }
    })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var active = {};
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          active[entry.target.id] = entry.isIntersecting;
        });
        // 화면에 걸린 섹션 중 문서상 첫 번째를 현재 위치로 본다.
        // 히어로·문의처럼 메뉴에 없는 구간에서는 표시를 모두 지운다.
        var current = sections.filter(function (s) {
          return active[s.id];
        })[0];
        navLinks.forEach(function (a) {
          var on = !!current && a.hash === "#" + current.id;
          a.classList.toggle("current", on);
          // 하위 메뉴가 켜지면 대메뉴에도 표시를 준다
          var item = a.closest ? a.closest(".nav-item") : null;
          if (item && a.classList.contains("nav-sub-link")) return;
          if (item && on) {
            var top = item.querySelector(".nav-top");
            if (top) top.classList.add("current");
          }
        });
        if (current) {
          document.querySelectorAll(".nav-item").forEach(function (item) {
            // 해시가 같아도 '지금 페이지의 링크'만 인정한다 (index#shutter vs archive#shutter)
            var has = Array.prototype.slice
              .call(item.querySelectorAll(".nav-sub a"))
              .some(function (a) {
                return a.hash === "#" + current.id &&
                  a.pathname.replace(/\/$/, "/index.html") === here;
              });
            var top = item.querySelector(".nav-top");
            var topSame = top && top.hash === "#" + current.id &&
              top.pathname.replace(/\/$/, "/index.html") === here;
            if (top) top.classList.toggle("current", has || !!topSame);
          });
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) {
      spy.observe(s);
    });
  }

  // ----- 작동 원리 애니메이션 (단계 자동 재생 + 직접 선택) -----
  // 각 단계 표시 시간(ms). CSS의 진행 바 길이도 이 값을 따라간다.
  var STEP_MS = 4200;
  var stillPrefers = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;

  document.querySelectorAll("[data-anim]").forEach(function (anim) {
    var buttons = Array.prototype.slice.call(anim.querySelectorAll(".anim-step"));
    var layers = Array.prototype.slice.call(anim.querySelectorAll(".fx"));
    if (!buttons.length) return;

    var last = buttons.length;
    var current = 1;
    var timer = null;
    var manual = false; // 방문자가 직접 고르면 자동 재생을 멈춘다

    var render = function () {
      anim.setAttribute("data-step", String(current));
      layers.forEach(function (el) {
        var on = (el.getAttribute("data-on") || "").split(",");
        el.classList.toggle("on", on.indexOf(String(current)) !== -1);
      });
      buttons.forEach(function (btn, i) {
        var on = i + 1 === current;
        btn.classList.toggle("on", on);
        btn.setAttribute("aria-current", on ? "step" : "false");
        // 진행 바를 처음부터 다시 그리게 한다
        btn.classList.remove("timing");
        if (on && !manual) {
          btn.style.setProperty("--dur", STEP_MS + "ms");
          void btn.offsetWidth;
          btn.classList.add("timing");
        }
      });
    };

    var stop = function () {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    var play = function () {
      if (timer || manual) return;
      render();
      timer = setInterval(function () {
        current = current >= last ? 1 : current + 1;
        render();
      }, STEP_MS);
    };

    buttons.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        manual = true;
        stop();
        current = i + 1;
        render();
      });
    });

    render();

    if (stillPrefers && stillPrefers.matches) {
      // 모션을 줄이도록 설정한 방문자에게는 자동 재생 없이 최종 상태를 보여준다
      manual = true;
      current = last;
      render();
    } else if ("IntersectionObserver" in window) {
      // 화면에 들어와 있을 때만 재생
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) play();
            else stop();
          });
        },
        { threshold: 0.25 }
      ).observe(anim);
    } else {
      play();
    }
  });

  // ----- Contact form → 방문자의 메일 앱을 내용이 채워진 상태로 실행 -----
  var form = document.getElementById("contactForm");
  var note = document.getElementById("formNote");
  if (form) {
    var productSel = form.elements.product;
    var hint = document.getElementById("deptHint");

    var teamOf = function () {
      var opt = productSel.options[productSel.selectedIndex];
      return (opt && opt.getAttribute("data-team")) || DEFAULT_TEAM;
    };
    var teamName = function (team) {
      return team === "firescreen" ? "셔터 사업부" : "내화채움구조 사업부";
    };
    var updateHint = function () {
      if (!productSel.value) {
        hint.textContent = "문의 분야를 선택하면 담당 사업부가 표시됩니다.";
        return;
      }
      var team = teamOf();
      hint.textContent = teamName(team) + " (" + TEAM_EMAIL[team] + ") 담당입니다.";
    };
    productSel.addEventListener("change", updateHint);
    updateHint();

    // 사업영역 카드·상세 CTA에서 넘어오면 해당 분야를 미리 선택
    document.querySelectorAll("[data-product]").forEach(function (el) {
      el.addEventListener("click", function () {
        var value = el.getAttribute("data-product");
        if (!Array.from(productSel.options).some(function (option) { return option.value === value; })) return;
        productSel.value = value;
        updateHint();
      });
    });

    var fields = Array.from(form.querySelectorAll("input[required], select[required], textarea[required]"));
    var validateField = function (field) {
      field.setCustomValidity(field.value.trim() ? "" : "이 항목을 입력해 주세요.");
      field.setAttribute("aria-invalid", String(!field.validity.valid));
    };
    fields.forEach(function (field) {
      field.addEventListener("input", function () {
        if (!field.hasAttribute("aria-invalid")) return;
        validateField(field);
        if (fields.every(function (item) { return item.validity.valid; })) {
          note.textContent = "";
          note.classList.remove("is-error");
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      fields.forEach(validateField);
      if (!form.checkValidity()) {
        note.textContent = "필수 항목과 이메일 형식을 확인해 주세요.";
        note.classList.add("is-error");
        form.reportValidity();
        return;
      }
      note.classList.remove("is-error");
      var product = productSel.value;
      var team = teamOf();
      var name = form.elements.name.value.trim();
      var company = form.elements.company.value.trim();
      var contact = form.elements.contact.value.trim();
      var email = form.elements.email.value.trim();
      var inquiryType = form.elements.inquiryType.value;
      var message = form.elements.message.value.trim();

      var subject = "[" + inquiryType + "/" + product + "] " + name + (company ? " · " + company : "");
      var body = [
        "■ 문의 분야: " + product,
        "■ 문의 유형: " + inquiryType,
        "■ 성함: " + name,
        "■ 회사명: " + (company || "미입력"),
        "■ 연락처: " + contact,
        "■ 이메일: " + email,
        "",
        "■ 문의 내용",
        message,
        "",
        "---",
        "디오이엔씨 홈페이지에서 작성한 문의입니다.",
      ].join("\n");

      var mailto =
        "mailto:" +
        TEAM_EMAIL[team] +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);

      note.textContent =
        teamName(team) + "로 보낼 메일 앱을 여는 중입니다. 창이 뜨면 그대로 '보내기'를 눌러주세요.";
      window.location.href = mailto;
    });
  }

  // ----- Footer year -----
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
