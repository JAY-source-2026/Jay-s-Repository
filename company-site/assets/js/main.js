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

  // ----- 데스크톱 하위 메뉴 -----
  // 마우스를 올리면 CSS 로 열리고, 터치·키보드에서는 눌러서 열 수 있게 한다.
  var navItems = Array.prototype.slice.call(document.querySelectorAll(".nav-item"));
  navItems.forEach(function (item) {
    var top = item.querySelector(".nav-top");
    if (!top) return;
    top.addEventListener("click", function (e) {
      // 아직 닫혀 있으면 첫 탭/클릭은 '열기'로 쓰고 이동은 막는다(터치 기기 배려)
      var isTouch = window.matchMedia && window.matchMedia("(hover: none)").matches;
      if (isTouch && !item.classList.contains("open")) {
        e.preventDefault();
        navItems.forEach(function (o) { if (o !== item) o.classList.remove("open"); });
        item.classList.add("open");
        top.setAttribute("aria-expanded", "true");
      }
    });
    item.addEventListener("mouseenter", function () { top.setAttribute("aria-expanded", "true"); });
    item.addEventListener("mouseleave", function () {
      item.classList.remove("open");
      top.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".nav-item")) return;
    navItems.forEach(function (o) {
      o.classList.remove("open");
      var t = o.querySelector(".nav-top");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    navItems.forEach(function (o) { o.classList.remove("open"); });
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

  // ----- 히어로 영상 다시보기 -----
  // hero3d.js 는 1회 재생 후 멈추므로 replay() 로 처음부터 다시 보여준다.
  // 3D 가 실제로 뜬 뒤에만 버튼을 노출한다(WebGL 미지원·모션 최소화 환경에서는 숨김).
  var replayBtn = document.getElementById("heroReplay");
  var brand = document.getElementById("brandHome");
  var heroSection = document.getElementById("home");
  var heroBody = document.getElementById("heroBody");

  // ----- 히어로 문구는 영상이 끝난 뒤 한 줄씩 들어온다 -----
  // 3D를 못 쓰거나 모션을 줄이는 환경에서는 클래스가 붙지 않아 처음부터 그대로 보인다.
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (heroBody && document.getElementById("hero3d") && !reduceMotion) {
    heroBody.classList.add("await");
    // 3D 로딩이 실패하면 문구가 영영 안 나오므로 안전장치를 둔다
    setTimeout(function () {
      if (!heroBody.classList.contains("in")) {
        heroBody.classList.remove("await");
        heroBody.classList.add("in");
      }
    }, 15000);
  }
  document.addEventListener("herofilm:start", function () {
    if (!heroBody) return;
    heroBody.classList.remove("in");
    heroBody.classList.add("await");
  });
  document.addEventListener("herofilm:end", function () {
    if (!heroBody) return;
    heroBody.classList.remove("await");
    heroBody.classList.add("in");
  });

  // id 가 hero3d 인 캔버스 때문에 window.hero3d 는 준비 전에도 참이 된다 → 실제 API인지 확인한다
  function heroApi() {
    var a = window.heroFilm;
    return a && typeof a.replay === "function" ? a : null;
  }

  function replayHero() {
    var api = heroApi();
    if (!api) return false;
    api.replay();
    if (replayBtn) {
      replayBtn.classList.remove("spin");
      void replayBtn.offsetWidth;
      replayBtn.classList.add("spin");
    }
    return true;
  }

  if (heroSection) {
    // 3D 준비를 기다린다(모듈 로딩이 끝나면 window.hero3d 가 생긴다)
    var waited = 0;
    var wait = setInterval(function () {
      waited += 300;
      if (heroApi()) {
        clearInterval(wait);
        if (replayBtn) replayBtn.classList.add("on");
      } else if (waited > 20000) {
        clearInterval(wait);
      }
    }, 300);

    // ⚠️ 스크롤을 끝낸 뒤에 재생을 건다.
    // 3D 렌더가 rAF 를 점유하면 브라우저의 부드러운 스크롤이 중단되어 페이지 중간에 멈춘다.
    // (CSS 의 scroll-behavior:smooth 때문에 scrollTop 대입도 애니메이션이라 같은 문제가 생긴다)
    function goTopAndReplay() {
      if (window.scrollY <= 4) { replayHero(); return; }
      window.scrollTo({ top: 0, behavior: "smooth" });
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        if (window.scrollY <= 4 || tries > 14) {       // 최대 1.4초까지만 기다린다
          clearInterval(t);
          window.scrollTo({ top: 0, behavior: "instant" }); // 못 닿았으면 마무리
          replayHero();
        }
      }, 100);
    }

    if (replayBtn) {
      replayBtn.addEventListener("click", goTopAndReplay);
    }
    // 왼쪽 위 로고를 누르면 맨 위로 올라가면서 영상이 처음부터 다시 재생된다
    if (brand) {
      brand.classList.add("is-replay");
      brand.addEventListener("click", function (e) {
        if (!heroApi()) return; // 3D가 없으면 평소처럼 홈으로 이동
        e.preventDefault();
        goTopAndReplay();
      });
    }
  }

  // ----- Footer year -----
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
