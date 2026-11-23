# anubhav-blog

Notes on interpreters, compilers, and the machinery of programs.

A static site: hand-written HTML and CSS, no framework, no trackers.
Roughly 4.5 KB of gzipped stylesheet, and a little dependency-free
JavaScript for the theme toggle and the interpreter.

The homepage also runs a small expression interpreter — a real lexer,
recursive-descent parser, and tree-walking evaluator, about 200 lines of
dependency-free JavaScript. It is the site's one interactive thing: the
argument of the first article, executing.

## Preview locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Structure

```
index.html          home: intro, live interpreter, post index, projects, about
posts/              one HTML file per article
assets/style.css    the whole design
assets/lab.js       lexer + parser + evaluator for the homepage figure
```
