"""Read the same normalized model as Hexo, without requiring a generated file."""
import json
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def load_model():
    return json.loads(subprocess.check_output(['node', 'tools/lib/content-model.js'], cwd=ROOT))
