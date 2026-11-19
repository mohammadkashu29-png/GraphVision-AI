import sys
try:
    import cv2
    print('cv2 version', cv2.__version__)
except Exception as e:
    print('Import error:', e)
    sys.exit(1)
