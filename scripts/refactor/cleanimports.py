#!/usr/bin/env python3
"""Saca de los imports los nombres que ESLint marca como no usados."""
import json, os, re, subprocess, sys

repo = os.path.abspath(sys.argv[1])
targets = sys.argv[2:] or ["."]
result = subprocess.run(["npx", "eslint", "-f", "json", *targets], cwd=repo, capture_output=True, text=True)
reports = json.loads(result.stdout or "[]")
for report in reports:
    unused = {}
    for message in report["messages"]:
        if message.get("ruleId") != "@typescript-eslint/no-unused-vars":
            continue
        match = re.match(r"'([A-Za-z_][A-Za-z0-9_]*)' is (?:defined|assigned a value) but never used", message["message"])
        if match:
            unused.setdefault(message["line"], set()).add(match.group(1))
    if not unused:
        continue
    path = report["filePath"]
    lines = open(path, encoding="utf-8").read().split("\n")
    # Miembros sin usar de `const { ... } = useWorkspace();` / `= workspace;`: se borra la línea.
    in_destructure = False
    filtered = []
    for number, line in enumerate(lines, start=1):
        if re.match(r"^\s*const \{$", line):
            in_destructure = True
        elif in_destructure and re.match(r"^\s*\} = (useWorkspace\(\)|workspace);$", line):
            in_destructure = False
        elif in_destructure and re.fullmatch(r"\s*(\w+),", line) and re.fullmatch(r"\s*(\w+),", line).group(1) in unused.get(number, set()):
            filtered.append(None)
            continue
        filtered.append(line)
    if None in filtered:
        removed_numbers = [i + 1 for i, l in enumerate(filtered) if l is None]
        lines = [l for l in filtered if l is not None]
        # Recalcular números de línea de los imports (están arriba, no se movieron).
        unused = {n: v for n, v in unused.items() if n < min(removed_numbers)}
    # Un import puede ocupar varias líneas: se trabaja sobre el statement completo.
    index = 0
    output = []
    while index < len(lines):
        line = lines[index]
        if line.startswith("import ") and "from" not in line and line.rstrip().endswith("{"):
            end = index
            while not re.search(r"from\s+['\"][^'\"]+['\"];?\s*$", lines[end]):
                end += 1
            statement_lines = list(range(index + 1, end + 2))
            statement = "\n".join(lines[index:end + 1])
            index_next = end + 1
        else:
            statement_lines = [index + 1]
            statement = line
            index_next = index + 1
        names_to_drop = set().union(*(unused.get(n, set()) for n in statement_lines)) if statement.startswith("import ") else set()
        if names_to_drop:
            match = re.match(r"^import (type )?\{([\s\S]*)\} from ([\"'][^\"']+[\"']);?$", statement.strip())
            if match:
                kept = [part.strip() for part in match.group(2).replace("\n", " ").split(",") if part.strip() and part.strip().replace("type ", "").split(" as ")[-1].strip() not in names_to_drop]
                if kept:
                    output.append(f"import {match.group(1) or ''}{{ {', '.join(kept)} }} from {match.group(3)};")
                index = index_next
                continue
            match = re.match(r"^import (\w+)(?:, \{([^}]*)\})? from ([\"'][^\"']+[\"']);?$", statement.strip())
            if match and match.group(1) in names_to_drop and not match.group(2):
                index = index_next
                continue
        output.extend(lines[index:index_next])
        index = index_next
    open(path, "w", encoding="utf-8").write("\n".join(output))
print("ok")
