import sys
import os

try:
    print("Attempting to import main...")
    import main
    print("Successfully imported main.")
    print(f"App object: {main.app}")
except ImportError as e:
    print(f"ImportError: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"An error occurred: {e}")
    import traceback
    traceback.print_exc()
