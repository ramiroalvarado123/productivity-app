#!/usr/bin/env python3
"""Saca una sección de la pantalla (progress-app.tsx) y su estado propio del hook.

Uso: extract_section.py <repo> <spec.json>
spec:
{
  "file": "features/sleep/components/sleep-section.tsx",
  "component": "SleepSection",
  "doc": "comentario de la sección",
  "hook": ["sleepEntryDate", "setSleepEntryDate", "effect:checkin.bedtime"],   // nombres o "effect:<texto>"
  "shell": ["sleepPanel", ...],                                                // nombres declarados en la pantalla
  "render": "<>{sleepPanel}</>",                                               // lo que devuelve el componente
  "replace": [["{section === \\"sleep\\" && sleepPanel}", "{section === \\"sleep\\" && <SleepSection key={today} />}"]],
  "props": ""                                                                   // opcional: firma de props
}
"""
import json, os, re, sys

repo = sys.argv[1]
spec = json.load(open(sys.argv[2], encoding="utf-8"))
HOOK = os.path.join(repo, "features/app-shell/use-workspace-state.tsx")
SHELL = os.path.join(repo, "features/app-shell/progress-app.tsx")

def strip_strings(line, state):
    """Devuelve la línea sin el contenido de strings, para contar corchetes."""
    out = []
    i = 0
    quote = state.get("quote")
    while i < len(line):
        ch = line[i]
        if quote:
            if ch == "\\":
                i += 2; continue
            if ch == quote:
                quote = None
            elif quote == "`" and line.startswith("${", i):
                # Las expresiones dentro del template cuentan como código.
                out.append("{"); i += 2; state.setdefault("tpl", []).append(1); quote = None; continue
            i += 1; continue
        if line.startswith("//", i):
            break
        if ch in "\"'`":
            quote = ch; i += 1; continue
        if ch == "}" and state.get("tpl") and state["tpl"][-1] == 1:
            # Fin de ${ ... } → volvemos al template.
            state["tpl"].pop(); out.append("}"); quote = "`"; i += 1; continue
        out.append(ch); i += 1
    state["quote"] = quote if quote == "`" else None
    return "".join(out)

def statements(lines, start, end, indent="  "):
    """Statements de nivel superior (indentados con `indent`) entre start y end."""
    result = []
    i = start
    pending = []
    while i < end:
        line = lines[i]
        if not line.strip():
            pending = []
            i += 1; continue
        if not line.startswith(indent) or line.startswith(indent + " "):
            i += 1; continue
        stripped = line[len(indent):]
        if stripped.startswith("//") or stripped.startswith("/*") and not stripped.startswith("/* eslint"):
            if stripped.startswith("/**") and not stripped.rstrip().endswith("*/"):
                j = i
                while not lines[j].rstrip().endswith("*/"):
                    j += 1
                pending += list(range(i, j + 1)); i = j + 1; continue
            pending.append(i); i += 1; continue
        if stripped.startswith("/* eslint"):
            pending = []; i += 1; continue
        # Inicio de statement: contar corchetes hasta cerrar.
        depth = 0; state = {}
        j = i
        while True:
            code = strip_strings(lines[j], state)
            depth += sum(code.count(c) for c in "([{") - sum(code.count(c) for c in ")]}")
            next_line = lines[j + 1] if j + 1 < end else ""
            next_is_statement = (not next_line.strip()) or (next_line.startswith(indent) and not next_line.startswith(indent + " ") and not next_line[len(indent):].startswith((")", "]", "}", ".", "?", ":", "&&", "||", "<", "/>", ">")))
            if depth <= 0 and not state.get("quote") and lines[j].rstrip().endswith((";", "}")) and (j + 1 >= end or next_is_statement):
                break
            j += 1
        text = "\n".join(lines[i:j + 1])
        names = []
        m = re.match(r"const \[(\w+), (\w+)\] = ", stripped)
        if m: names = [m.group(1), m.group(2)]
        else:
            m = re.match(r"(?:const|let) (\w+)\b", stripped) or re.match(r"(?:async )?function (\w+)", stripped)
            if m: names = [m.group(1)]
        result.append({"start": pending[0] if pending else i, "code_start": i, "end": j, "names": names, "text": text})
        pending = []
        i = j + 1
    return result

hook_lines = open(HOOK, encoding="utf-8").read().split("\n")
shell_lines = open(SHELL, encoding="utf-8").read().split("\n")

hook_fn = next(i for i, l in enumerate(hook_lines) if l.startswith("export function useWorkspaceState("))
hook_ret = max(i for i, l in enumerate(hook_lines) if l == "  return {")
hook_stmts = statements(hook_lines, hook_fn + 1, hook_ret)
shell_fn = next(i for i, l in enumerate(shell_lines) if l.startswith("export default function ProgressClient("))
shell_end = max(i for i, l in enumerate(shell_lines) if l.startswith("  return <WorkspaceContext.Provider"))
shell_stmts = statements(shell_lines, shell_fn + 1, shell_end)

def pick(stmts, wanted, where):
    chosen = []
    for item in wanted:
        if item.startswith("effect:"):
            needle = item[len("effect:"):]
            found = [s for s in stmts if not s["names"] and needle in s["text"]]
        else:
            found = [s for s in stmts if item in s["names"]]
        if len(found) != 1:
            raise SystemExit(f"{where}: no encontré exactamente un statement para {item!r} ({len(found)})")
        if found[0] not in chosen:
            chosen.append(found[0])
    return sorted(chosen, key=lambda s: s["start"])

moved_hook = pick(hook_stmts, spec.get("hook", []), "hook")
moved_shell = pick(shell_stmts, spec.get("shell", []), "pantalla")

def body_of(stmts, lines):
    out = []
    for s in stmts:
        out += lines[s["start"]:s["end"] + 1]
    return out

section_body = body_of(moved_hook, hook_lines) + [""] + body_of(moved_shell, shell_lines)
moved_names = {n for s in moved_hook + moved_shell for n in s["names"]}

# Lo que la sección necesita del espacio de trabajo.
ret_end = next(i for i in range(hook_ret, len(hook_lines)) if hook_lines[i] == "  };")
returned = [l.strip().rstrip(",") for l in hook_lines[hook_ret + 1:ret_end]]
section_text = "\n".join(section_body) + "\n" + spec["render"]
needed = [n for n in returned if n not in moved_names and re.search(r"(?<![\w.])" + re.escape(n) + r"\b", section_text)]

has_effect = any("useEffect(" in s["text"] for s in moved_hook)
lines_out = ['"use client";', "", "export function " + spec["component"] + "(" + spec.get("props", "") + ") {"]
if spec.get("doc"):
    lines_out = ['"use client";', "", "/** " + spec["doc"] + " */", "export function " + spec["component"] + "(" + spec.get("props", "") + ") {"]
if needed:
    lines_out += ["  const {"] + [f"    {n}," for n in needed] + ["  } = useWorkspace();"]
if has_effect:
    lines_out.append("  /* eslint-disable react-hooks/set-state-in-effect */")
lines_out += section_body
if has_effect:
    lines_out.append("  /* eslint-enable react-hooks/set-state-in-effect */")
lines_out += ["", "  return " + spec["render"] + ";", "}", ""]
out_path = os.path.join(repo, spec["file"])
os.makedirs(os.path.dirname(out_path), exist_ok=True)
open(out_path, "w", encoding="utf-8").write("\n".join(lines_out))

# Sacar lo movido del hook y de su return.
drop = set()
for s in moved_hook:
    drop.update(range(s["start"], s["end"] + 1))
new_hook = [l for i, l in enumerate(hook_lines) if i not in drop]
new_hook = [l for l in new_hook if not (l.startswith("    ") and l.strip().rstrip(",") in moved_names and l.strip().endswith(",") and re.fullmatch(r"\s{4}\w+,", l))]
open(HOOK, "w", encoding="utf-8").write("\n".join(new_hook))

# Sacar lo movido de la pantalla y aplicar los reemplazos.
drop = set()
for s in moved_shell:
    drop.update(range(s["start"], s["end"] + 1))
new_shell = "\n".join(l for i, l in enumerate(shell_lines) if i not in drop)
for old, new in spec.get("replace", []):
    if old not in new_shell:
        raise SystemExit(f"reemplazo no encontrado: {old[:80]}")
    new_shell = new_shell.replace(old, new)
# Destructurado de la pantalla: sólo lo que todavía usa.
m = re.search(r"  const \{\n((?:    \w+,\n)+)  \} = workspace;", new_shell)
names = [n.strip().rstrip(",") for n in m.group(1).strip().split("\n")]
rest = new_shell[m.end():]
keep = [n for n in names if n not in moved_names and re.search(r"(?<![\w.])" + re.escape(n) + r"\b", rest)]
new_shell = new_shell[:m.start()] + "  const {\n" + "".join(f"    {n},\n" for n in keep) + "  } = workspace;" + rest
open(SHELL, "w", encoding="utf-8").write(new_shell)
print(f"{spec['component']}: {len(moved_hook)} del hook, {len(moved_shell)} de la pantalla, usa {len(needed)} del espacio de trabajo")
