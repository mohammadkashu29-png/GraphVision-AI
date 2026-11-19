import sys
try:
    import torch
    print('torch version', torch.__version__)
except Exception as e:
    print('Import error:', e)
    sys.exit(1)
