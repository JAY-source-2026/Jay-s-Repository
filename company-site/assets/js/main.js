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

  // Header background on scroll
  function onScroll() {
    if (window.scrollY > 20) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile menu toggle
  if (navToggle && mobileNav) {
    var setMenu = function (open) {
      mobileNav.classList.toggle("open", open);
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
      // keep header solid while menu open
      if (open) header.classList.add("scrolled");
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

  // Reveal sections on scroll
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );
    document.querySelectorAll(".section").forEach(function (s) {
      io.observe(s);
    });
  } else {
    document.querySelectorAll(".section").forEach(function (s) {
      s.classList.add("visible");
    });
  }

  // Contact form → 방문자의 메일 앱을 내용이 채워진 상태로 실행
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

    // 제품 카드·상세 CTA에서 넘어오면 해당 분야를 미리 선택
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

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
