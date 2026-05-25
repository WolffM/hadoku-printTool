# Sticker Pipeline (Python sidecar)

Lifted directly from `repos/StickerMaker/` to keep parity with the original tool.
Invoked by the local Node server via subprocess in a per-request scratch directory.

## Files (unmodified lift)

- `main.py` — pipeline orchestrator (bg removal → padding → cutlines → archive)
- `drawCutline.py` — contour tracing, dilation, smoothing
- `removeBG.py` — wraps `rembg`
- `__init__.py` — marks this as a Python package for Hatchling packaging

Dependencies are declared in `server/pyproject.toml` (one `.venv` per the
hadoku ecosystem convention — see `personal-dataplatform/server/CLAUDE.md`).

## Setup (one-time, per-repo)

```bash
cd server
python -m venv .venv
.venv/Scripts/pip install -e .       # Windows
# or:
.venv/bin/pip install -e .            # macOS/Linux
```

This creates `server/.venv/` and installs the sticker deps (Pillow, numpy,
scipy, rembg). The Node server (`server/src/sticker.ts`) automatically uses
the venv's interpreter at `server/.venv/Scripts/python.exe` (Windows) or
`server/.venv/bin/python`.

System Python will be used as a fallback if the venv is missing, but you'll
get a warning — the heavy deps should live in the per-repo venv, not global.

## Invocation contract

The Node server prepares a scratch directory with this layout:

```
<scratch>/
  Input/raw/          # input PNGs/JPGs the user uploaded
  Input/bgRemoved/    # empty (populated by pipeline)
  Input/Finished/     # empty (archive of processed inputs)
  Output/             # empty (final sheet written here)
```

Then runs `python main.py --copies <N> --size <1-4>` with `cwd=<scratch>`.
Output filename is `1_<MMDDYYYY>_<first10chars>.jpg`.

## Not modified

These files are kept as a direct lift so refactors here remain in lockstep with
the original `repos/StickerMaker/`. If the algorithm needs changes, port them
back upstream and re-copy.
