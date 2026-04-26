"""Find which package has broken metadata causing transformers to fail."""
import importlib.metadata as im

# Read transformers dependency versions file
import os, sys
sys.path.insert(0, r"C:\Users\gech\anaconda3\envs\agentic_env\Lib\site-packages")

try:
    from transformers.utils.versions import require_version
    from transformers.dependency_versions_table import deps
    print("Checking", len(deps), "dependencies...")
    broken = []
    for pkg, req in deps.items():
        try:
            ver = im.version(pkg)
        except im.PackageNotFoundError:
            pass  # not installed, that's ok
        except Exception as e:
            broken.append((pkg, req, str(e)))
    if broken:
        print("BROKEN packages:")
        for p, r, e in broken:
            print(f"  {p} ({r}): {e}")
    else:
        print("All deps OK")
except Exception as e:
    print("Error:", e)
    import traceback; traceback.print_exc()
