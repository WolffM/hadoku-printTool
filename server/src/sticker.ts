/**
 * Sticker Pipeline Integration
 *
 * Invokes the lifted StickerMaker Python pipeline as a subprocess.
 * The Python sources live in `../python/sticker/` and are kept as a direct
 * lift from `repos/StickerMaker/`. This module is the thin Node adapter:
 *   1. Prep a per-request scratch directory with the expected Input/Output layout
 *   2. Write user-uploaded images into Input/raw/
 *   3. Spawn `python main.py --copies N --size M` with cwd = scratch dir
 *   4. Read the resulting JPEG from Output/
 *   5. Clean up
 */

import { spawn } from 'node:child_process'
import { readFile, writeFile, mkdir, readdir, rm, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir, platform } from 'node:os'
import { randomBytes } from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/** server/ directory root — parent of src/, host of .venv/ and python/. */
const SERVER_ROOT = join(__dirname, '..')

/** Where the lifted Python sources live. */
const PYTHON_DIR = join(SERVER_ROOT, 'python', 'sticker')

/**
 * Path to the venv's Python interpreter, per the hadoku ecosystem convention
 * (see personal-dataplatform/server/CLAUDE.md: per-repo `.venv` at server/.venv).
 */
const VENV_PYTHON =
  platform() === 'win32'
    ? join(SERVER_ROOT, '.venv', 'Scripts', 'python.exe')
    : join(SERVER_ROOT, '.venv', 'bin', 'python')

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export interface StickerImageInput {
  filename: string
  /** Buffer of the raw image bytes (PNG / JPEG / etc.). */
  data: Buffer
}

export interface StickerOptions {
  images: StickerImageInput[]
  /** Copies per image (Python --copies). Default 1. */
  copies?: number
  /** Cutline offset size 1-4 (Python --size). Default 2. */
  size?: number
  /** Custom offset in inches (overrides --size). Maps to Python --offset. */
  offsetInches?: number
  /** Test mode: emit a sample-cutlines page instead of a full sheet. */
  test?: boolean
  /** Override the Python interpreter (defaults to `python`, then `python3`). */
  pythonBin?: string
}

export interface StickerResult {
  /** Final sheet bytes (JPEG). */
  data: Buffer
  filename: string
  stdout: string
  stderr: string
}

async function createScratchDir(): Promise<string> {
  const id = randomBytes(8).toString('hex')
  const dir = join(tmpdir(), `sticker-${id}`)
  await mkdir(join(dir, 'Input', 'raw'), { recursive: true })
  await mkdir(join(dir, 'Input', 'bgRemoved'), { recursive: true })
  await mkdir(join(dir, 'Input', 'Finished'), { recursive: true })
  await mkdir(join(dir, 'Output'), { recursive: true })
  return dir
}

/**
 * Resolve which Python interpreter to use.
 *
 * Priority (matches hadoku ecosystem convention — per-repo `.venv`):
 *   1. Explicit override (caller-provided)
 *   2. Repo venv: `server/.venv/Scripts/python.exe` (Windows) or `.venv/bin/python`
 *   3. System fallback: `python`, `python3`, `py`
 *
 * Using the system Python is allowed but will warn — the sticker pipeline's
 * deps (rembg, scipy) should be installed in the per-repo venv. See
 * `server/pyproject.toml`.
 */
async function resolvePython(override?: string): Promise<string> {
  if (override) {
    return override
  }

  // 1. Prefer the per-repo venv
  if (await fileExists(VENV_PYTHON)) {
    return VENV_PYTHON
  }

  // 2. Fall back to system Python
  for (const candidate of ['python', 'python3', 'py']) {
    const works = await new Promise<boolean>(resolve => {
      const proc = spawn(candidate, ['--version'], {
        stdio: 'ignore',
        windowsHide: true,
        shell: false
      })
      proc.on('error', () => resolve(false))
      proc.on('close', code => resolve(code === 0))
    })
    if (works) {
      console.warn(
        `[sticker] Using system Python (${candidate}) — repo .venv not found at ${VENV_PYTHON}. ` +
          'Run `cd server && python -m venv .venv && .venv/Scripts/pip install -e .` to set up.'
      )
      return candidate
    }
  }
  throw new Error(
    `Python interpreter not found. Expected venv at ${VENV_PYTHON} (preferred), or system python/python3/py.`
  )
}

/**
 * Run the lifted StickerMaker pipeline on a batch of images.
 */
export async function processSticker(options: StickerOptions): Promise<StickerResult> {
  const { images, copies = 1, size = 2, offsetInches, test = false, pythonBin } = options

  if (images.length === 0) {
    throw new Error('At least one input image is required')
  }

  const python = await resolvePython(pythonBin)
  const scratch = await createScratchDir()

  try {
    // Write input images into the expected Input/raw/ folder
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      // Prefix with index so natural sort matches upload order
      const safeName = `${String(i).padStart(3, '0')}_${img.filename.replace(/[^\w.\-]/g, '_')}`
      await writeFile(join(scratch, 'Input', 'raw', safeName), img.data)
    }

    // Build Python args (matches main.py argparse)
    const args = [join(PYTHON_DIR, 'main.py')]
    if (test) {
      args.push('--test')
    } else {
      args.push('--copies', String(copies))
      if (offsetInches !== undefined) {
        args.push('--offset', String(offsetInches))
      } else {
        args.push('--size', String(size))
      }
    }

    const { stdout, stderr } = await runPython(python, args, scratch)

    // Locate the produced JPEG. main.py writes `<n>_<MMDDYYYY>_<prefix>.jpg`
    // directly into Output/ (or `cutline_test_page.jpg` in test mode).
    const outputDir = join(scratch, 'Output')
    const outputFile = await findResultFile(outputDir, test)
    if (!outputFile) {
      throw new Error(
        `No output file found in ${outputDir}. Python stderr:\n${stderr || '(empty)'}`
      )
    }

    const data = await readFile(join(outputDir, outputFile))
    return { data, filename: outputFile, stdout, stderr }
  } finally {
    await rm(scratch, { recursive: true, force: true }).catch(() => {
      // best-effort cleanup
    })
  }
}

function runPython(
  python: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(python, args, {
      cwd,
      windowsHide: true,
      shell: false
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', chunk => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', chunk => {
      stderr += chunk.toString()
    })

    proc.on('error', err => reject(err))
    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(
          new Error(`Python exited with code ${code ?? 'null'}. stderr:\n${stderr || '(empty)'}`)
        )
      }
    })
  })
}

async function findResultFile(outputDir: string, test: boolean): Promise<string | null> {
  const entries = await readdir(outputDir)
  if (test) {
    return entries.find(name => name === 'cutline_test_page.jpg') ?? null
  }
  // Pick the most-recently-named .jpg directly in Output/ (Finished/ is a subdir)
  const candidates = entries.filter(name => name.toLowerCase().endsWith('.jpg'))
  if (candidates.length === 0) return null
  // The pipeline writes a single result file; if multiple, pick the lexicographically last
  // (highest counter prefix).
  candidates.sort()
  return candidates[candidates.length - 1]
}

/**
 * Probe whether Python + the sticker pipeline modules are available.
 */
export async function checkStickerEnvironment(): Promise<{
  python: boolean
  pythonVersion?: string
  rembg: boolean
  scipy: boolean
}> {
  let pythonBin: string
  try {
    pythonBin = await resolvePython()
  } catch {
    return { python: false, rembg: false, scipy: false }
  }

  const version = await new Promise<string>(resolve => {
    const proc = spawn(pythonBin, ['--version'], { windowsHide: true })
    let out = ''
    proc.stdout.on('data', d => (out += d.toString()))
    proc.stderr.on('data', d => (out += d.toString()))
    proc.on('close', () => resolve(out.trim()))
  })

  const probe = async (mod: string): Promise<boolean> => {
    return new Promise(resolve => {
      const proc = spawn(pythonBin, ['-c', `import ${mod}`], {
        stdio: 'ignore',
        windowsHide: true
      })
      proc.on('error', () => resolve(false))
      proc.on('close', code => resolve(code === 0))
    })
  }

  const [rembg, scipy] = await Promise.all([probe('rembg'), probe('scipy')])
  return { python: true, pythonVersion: version, rembg, scipy }
}
