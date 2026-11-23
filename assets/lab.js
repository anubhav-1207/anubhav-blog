/*
 * A tiny expression interpreter for the homepage.
 * Lexer -> recursive-descent parser -> tree-walking evaluator.
 * No dependencies. Everything is rendered with textContent.
 */
(function () {
  'use strict';

  var input = document.getElementById('expr');
  if (!input) return;

  var tokensEl = document.getElementById('tokens');
  var treeEl = document.getElementById('tree');
  var valueEl = document.getElementById('value');
  var errorEl = document.getElementById('lab-error');

  var KINDS = {
    '+': 'PLUS', '-': 'MINUS', '*': 'STAR', '/': 'SLASH',
    '%': 'PERCENT', '^': 'CARET', '(': 'LPAREN', ')': 'RPAREN'
  };
  var NAMES = { pi: Math.PI, e: Math.E };
  var LABELS = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'mod', '^': 'pow' };

  function fail(pos, msg) {
    throw { pos: pos, msg: msg };
  }

  /* ── lexer ─────────────────────────────────────────────── */

  function lex(src) {
    var out = [];
    var i = 0;
    var n = src.length;

    while (i < n) {
      var c = src[i];

      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        i++;
        continue;
      }

      if ((c >= '0' && c <= '9') || (c === '.' && src[i + 1] >= '0' && src[i + 1] <= '9')) {
        var start = i;
        var dot = false;
        while (i < n && ((src[i] >= '0' && src[i] <= '9') || (src[i] === '.' && !dot))) {
          if (src[i] === '.') dot = true;
          i++;
        }
        out.push({ kind: 'NUM', lex: src.slice(start, i), value: parseFloat(src.slice(start, i)), pos: start });
        continue;
      }

      if (/[A-Za-z_]/.test(c)) {
        var s = i;
        while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
        out.push({ kind: 'NAME', lex: src.slice(s, i), pos: s });
        continue;
      }

      if (KINDS[c]) {
        out.push({ kind: KINDS[c], lex: c, pos: i });
        i++;
        continue;
      }

      fail(i, "unexpected character '" + c + "'");
    }

    out.push({ kind: 'EOF', lex: '', pos: n });
    return out;
  }

  /* ── parser ────────────────────────────────────────────── */

  function parse(tokens) {
    var p = 0;

    function peek() { return tokens[p]; }
    function take() { return tokens[p++]; }

    function expect(kind, what) {
      if (peek().kind !== kind) fail(peek().pos, 'expected ' + what);
      return take();
    }

    function expression() {
      var node = term();
      while (peek().kind === 'PLUS' || peek().kind === 'MINUS') {
        var t = take();
        node = { t: 'bin', op: t.lex, a: node, b: term(), pos: t.pos };
      }
      return node;
    }

    function term() {
      var node = unary();
      while (peek().kind === 'STAR' || peek().kind === 'SLASH' || peek().kind === 'PERCENT') {
        var t = take();
        node = { t: 'bin', op: t.lex, a: node, b: unary(), pos: t.pos };
      }
      return node;
    }

    function unary() {
      if (peek().kind === 'MINUS') {
        var t = take();
        return { t: 'neg', a: unary(), pos: t.pos };
      }
      if (peek().kind === 'PLUS') {
        take();
        return unary();
      }
      return power();
    }

    function power() {
      var node = primary();
      if (peek().kind === 'CARET') {
        var t = take();
        node = { t: 'bin', op: '^', a: node, b: unary(), pos: t.pos };
      }
      return node;
    }

    function primary() {
      var t = peek();
      if (t.kind === 'NUM') {
        take();
        return { t: 'num', v: t.value };
      }
      if (t.kind === 'NAME') {
        take();
        return { t: 'name', v: t.lex, pos: t.pos };
      }
      if (t.kind === 'LPAREN') {
        take();
        var inner = expression();
        expect('RPAREN', "')'");
        return inner;
      }
      fail(t.pos, t.kind === 'EOF' ? 'unexpected end of input' : "unexpected '" + t.lex + "'");
    }

    var root = expression();
    if (peek().kind !== 'EOF') fail(peek().pos, "unexpected '" + peek().lex + "'");
    return root;
  }

  /* ── evaluator ─────────────────────────────────────────── */

  function evaluate(n) {
    if (n.t === 'num') return n.v;

    if (n.t === 'name') {
      if (Object.prototype.hasOwnProperty.call(NAMES, n.v)) return NAMES[n.v];
      fail(n.pos, "unknown name '" + n.v + "'");
    }

    if (n.t === 'neg') return -evaluate(n.a);

    var a = evaluate(n.a);
    var b = evaluate(n.b);
    switch (n.op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (b === 0) fail(n.pos, 'division by zero');
        return a / b;
      case '%':
        if (b === 0) fail(n.pos, 'division by zero');
        return a % b;
      case '^': return Math.pow(a, b);
    }
  }

  /* ── rendering ─────────────────────────────────────────── */

  function num(v) {
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    if (Math.abs(v) < 1e-12) return '0';
    if (Number.isInteger(v)) return String(v);
    return String(parseFloat(v.toPrecision(12)));
  }

  function label(n) {
    if (n.t === 'num') return 'num ' + num(n.v);
    if (n.t === 'name') return 'name ' + n.v;
    if (n.t === 'neg') return 'neg';
    return LABELS[n.op];
  }

  function kids(n) {
    if (n.t === 'bin') return [n.a, n.b];
    if (n.t === 'neg') return [n.a];
    return [];
  }

  function treeLines(n) {
    var out = [label(n)];
    var children = kids(n);
    for (var i = 0; i < children.length; i++) {
      var last = i === children.length - 1;
      var sub = treeLines(children[i]);
      out.push((last ? '└─ ' : '├─ ') + sub[0]);
      for (var j = 1; j < sub.length; j++) {
        out.push((last ? '   ' : '│  ') + sub[j]);
      }
    }
    return out;
  }

  function paintTokens(tokens) {
    tokensEl.textContent = '';
    tokens.forEach(function (t) {
      var li = document.createElement('li');
      var k = document.createElement('span');
      var v = document.createElement('span');
      k.className = 'tok-kind';
      v.className = 'tok-lex';
      k.textContent = t.kind;
      v.textContent = t.kind === 'EOF' ? '·' : t.lex;
      li.appendChild(k);
      li.appendChild(v);
      tokensEl.appendChild(li);
    });
  }

  function render(src) {
    tokensEl.textContent = '';
    treeEl.textContent = '';
    valueEl.textContent = '—';
    errorEl.textContent = '';
    errorEl.classList.remove('on');

    if (!src.trim()) return;

    try {
      var tokens = lex(src);
      paintTokens(tokens);

      var root = parse(tokens);
      treeEl.textContent = treeLines(root).join('\n');
      valueEl.textContent = num(evaluate(root));
    } catch (e) {
      if (typeof e.pos !== 'number') throw e;
      errorEl.textContent = 'col ' + (e.pos + 1) + ' — ' + e.msg;
      errorEl.classList.add('on');
      treeEl.textContent = '';
      valueEl.textContent = '—';
    }
  }

  input.addEventListener('input', function () { render(input.value); });
  render(input.value);
})();
