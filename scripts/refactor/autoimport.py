#!/usr/bin/env python3
"""Agrega los imports que faltan según los errores "Cannot find name" de tsc.

Uso: autoimport.py <repo> [archivo ...]   (sin archivos: todos los que tengan errores)
Arma una tabla de símbolos exportados del repo y repite hasta que no quede nada por resolver.
"""
import os, re, subprocess, sys

repo = os.path.abspath(sys.argv[1])
only = {os.path.abspath(os.path.join(repo, f)) for f in sys.argv[2:]}
SKIP = {"node_modules", ".next", ".git", "tests"}

REACT_VALUES = {"useState", "useEffect", "useMemo", "useCallback", "useRef", "useId", "useSyncExternalStore", "Fragment", "useContext", "createContext"}
REACT_TYPES = {"ReactNode", "FormEvent", "CSSProperties", "ChangeEvent", "Dispatch", "SetStateAction", "MutableRefObject", "RefObject"}
# Si un nombre se exporta en varios lados, gana el primero de esta lista.
PREFERENCE = ["shared/", "domain/", "features/", "server/"]
NEVER_FROM = {"today": "server/db/rows", "now": "server/db/rows"}

def exported_symbols():
    table = {}
    for root, dirs, files in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in SKIP]
        for name in files:
            if not name.endswith((".ts", ".tsx")) or name.endswith(".d.ts"):
                continue
            full = os.path.join(root, name)
            rel = os.path.relpath(full, repo)
            if rel.startswith("app/"):
                continue
            text = open(full, encoding="utf-8").read()
            for match in re.finditer(r"^export (?:default )?(?:async )?(function|const|let|type|interface|class) ([A-Za-z_][A-Za-z0-9_]*)", text, re.M):
                kind, symbol = match.groups()
                table.setdefault(symbol, []).append((rel, kind in ("type", "interface")))
            for match in re.finditer(r"^export (?:type )?\{([^}]+)\}", text, re.M):
                for part in match.group(1).split(","):
                    symbol = part.strip().split(" as ")[-1].replace("type ", "").strip()
                    if symbol:
                        table.setdefault(symbol, []).append((rel, part.strip().startswith("type ")))
    return table

def best(symbol, sources, for_file):
    rel_target = os.path.relpath(for_file, repo)
    candidates = [s for s in sources if s[0] != rel_target and NEVER_FROM.get(symbol) != s[0].rsplit(".", 1)[0]]
    if not candidates:
        return None
    def rank(source):
        for index, prefix in enumerate(PREFERENCE):
            if source[0].startswith(prefix):
                return index
        return len(PREFERENCE)
    return sorted(candidates, key=rank)[0]

def module_spec(rel):
    return "@/" + re.sub(r"\.(tsx|ts)$", "", rel)

def add_import(path, module, symbol, is_type):
    text = open(path, encoding="utf-8").read()
    lines = text.split("\n")
    keyword = "import type" if is_type else "import"
    pattern = re.compile(r'^' + re.escape(keyword) + r' \{([^}]*)\} from "' + re.escape(module) + r'";$')
    for index, line in enumerate(lines):
        match = pattern.match(line)
        if match:
            names = [n.strip() for n in match.group(1).split(",") if n.strip()]
            if symbol not in names:
                names.append(symbol)
            lines[index] = f'{keyword} {{ {", ".join(names)} }} from "{module}";'
            open(path, "w", encoding="utf-8").write("\n".join(lines))
            return
    insert_at = 0
    in_import = False
    for index, line in enumerate(lines):
        if line.startswith('"use client"') or line.startswith("'use client'"):
            insert_at = index + 1
        if line.startswith("import "):
            in_import = not re.search(r"""(from\s*['"][^'"]+['"]|^import\s+['"][^'"]+['"]);?\s*$""", line)
            if not in_import:
                insert_at = index + 1
        elif in_import and re.search(r"""from\s*['"][^'"]+['"];?\s*$""", line):
            in_import = False
            insert_at = index + 1
    if insert_at == 0 and lines and lines[0].startswith("/**"):
        insert_at = next((i + 1 for i, l in enumerate(lines) if l.strip().endswith("*/")), 0)
    lines.insert(insert_at, f'{keyword} {{ {symbol} }} from "{module}";')
    open(path, "w", encoding="utf-8").write("\n".join(lines))

for round_number in range(8):
    result = subprocess.run(["npx", "tsc", "--noEmit", "--pretty", "false"], cwd=repo, capture_output=True, text=True)
    missing = {}
    for match in re.finditer(r"^(.+?)\((\d+),\d+\): error TS(2304|2552|2503|2749|2724): (?:Cannot find name|Cannot find namespace|'[^']+' refers to a value)[^']*'([A-Za-z_][A-Za-z0-9_]*)'", result.stdout, re.M):
        file, _, _, symbol = match.groups()
        full = os.path.abspath(os.path.join(repo, file))
        if only and full not in only:
            continue
        missing.setdefault(full, set()).add(symbol)
    if not missing:
        break
    table = exported_symbols()
    changed = False
    for full, symbols in missing.items():
        for symbol in sorted(symbols):
            if symbol in REACT_VALUES:
                add_import(full, "react", symbol, False); changed = True
            elif symbol in REACT_TYPES:
                add_import(full, "react", symbol, True); changed = True
            elif symbol == "Image":
                text = open(full, encoding="utf-8").read()
                if 'import Image from "next/image";' not in text:
                    lines = text.split("\n")
                    at = 1 if lines[0].startswith('"use client"') else 0
                    lines.insert(at, 'import Image from "next/image";')
                    open(full, "w", encoding="utf-8").write("\n".join(lines)); changed = True
            elif symbol in table:
                source = best(symbol, table[symbol], full)
                if source:
                    add_import(full, module_spec(source[0]), symbol, source[1]); changed = True
    if not changed:
        break

result = subprocess.run(["npx", "tsc", "--noEmit", "--pretty", "false"], cwd=repo, capture_output=True, text=True)
errors = [line for line in result.stdout.split("\n") if "error TS" in line]
print(f"quedan {len(errors)} errores")
for line in errors[:40]:
    print(line[:220])
