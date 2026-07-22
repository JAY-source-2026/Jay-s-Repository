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
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".hd-nav a")
  );
  var sections = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute("href"));
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
          a.classList.toggle(
            "current",
            !!current && a.getAttribute("href") === "#" + current.id
          );
        });
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
        hint.textContent = "";
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
        productSel.value = el.getAttribute("data-product");
        updateHint();
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        note.textContent = "필수 항목을 모두 입력해 주세요.";
        form.reportValidity();
        return;
      }
      var product = productSel.value;
      var team = teamOf();
      var name = form.elements.name.value.trim();
      var contact = form.elements.contact.value.trim();
      var message = form.elements.message.value.trim();

      var subject = "[홈페이지 문의/" + product + "] " + name;
      var body = [
        "■ 문의 분야: " + product,
        "■ 이름 / 회사: " + name,
        "■ 연락처: " + contact,
        "",
        "■ 문의 내용",
        message,
        "",
        "---",
        "디오이엔씨 홈페이지 문의폼에서 전송되었습니다.",
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
