#!/usr/bin/env python3
"""Mueve archivos con `git mv` y reescribe todos los imports del repo.

Uso: move.py <repo> <mapping.txt>
mapping.txt: líneas "viejo/ruta.ts -> nueva/ruta.ts" (rutas relativas al repo).
Los imports que apuntan a un archivo movido (o los imports relativos dentro de
un archivo movido) se reescriben como "@/ruta/sin-extension".
"""
import os, re, subprocess, sys

repo = os.path.abspath(sys.argv[1])
pairs = []
for line in open(sys.argv[2]):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    old, new = [part.strip() for part in line.split("->")]
    pairs.append((old, new))

EXTS = [".ts", ".tsx", ".js", ".mjs", ".css"]
SKIP_DIRS = {"node_modules", ".next", ".git"}

def source_files():
    for root, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for name in files:
            if name.endswith((".ts", ".tsx", ".mjs")):
                yield os.path.join(root, name)

def resolve(spec, from_file):
    """Devuelve la ruta absoluta del archivo importado, o None si es un paquete."""
    if spec.startswith("@/"):
        base = os.path.join(repo, spec[2:])
    elif spec.startswith("."):
        base = os.path.normpath(os.path.join(os.path.dirname(from_file), spec))
    else:
        return None
    candidates = [base] + [base + ext for ext in EXTS] + [os.path.join(base, "index" + ext) for ext in EXTS]
    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
    return None

IMPORT_RE = re.compile(r"""((?:import|export)\s[^'"]*?from\s*|import\s*\(\s*|import\s+)(['"])([^'"]+)\2""")

# 1. Antes de mover: para cada archivo, qué archivo absoluto importa cada especificador.
plan = {}
for path in source_files():
    text = open(path, encoding="utf-8").read()
    entries = []
    for match in IMPORT_RE.finditer(text):
        target = resolve(match.group(3), path)
        if target:
            entries.append((match.group(3), target))
    plan[path] = entries

# 2. Mover.
moves = {}
for old, new in pairs:
    src, dst = os.path.join(repo, old), os.path.join(repo, new)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run(["git", "mv", src, dst], cwd=repo, check=True)
    moves[src] = dst

def new_location(path):
    return moves.get(path, path)

def spec_for(target):
    rel = os.path.relpath(target, repo)
    for ext in [".tsx", ".ts", ".mjs", ".js"]:
        if rel.endswith(ext):
            rel = rel[: -len(ext)]
            break
    return "@/" + rel

# 3. Reescribir imports afectados.
for old_path, entries in plan.items():
    path = new_location(old_path)
    moved_file = old_path in moves
    text = open(path, encoding="utf-8").read()
    replacements = {}
    for spec, target in entries:
        if target in moves or (moved_file and not spec.startswith("@/")):
            if target.endswith(".css") and not target in moves and not moved_file:
                continue
            replacements[spec] = spec_for(new_location(target)) if not target.endswith(".css") else os.path.relpath(new_location(target), os.path.dirname(path))
    if not replacements:
        continue
    def swap(match):
        spec = match.group(3)
        if spec in replacements:
            replacement = replacements[spec]
            if replacement.endswith(".css") and not replacement.startswith("."):
                replacement = "./" + replacement
            return match.group(1) + match.group(2) + replacement + match.group(2)
        return match.group(0)
    updated = IMPORT_RE.sub(swap, text)
    if updated != text:
        open(path, "w", encoding="utf-8").write(updated)
print(f"movidos {len(moves)} archivos")
