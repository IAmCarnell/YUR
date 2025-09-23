# YUR OS Assets

This directory contains 3D models, icons, backgrounds, and other visual assets for the YUR OS spatial interface.

## Structure

```
/assets
  /models          # 3D models for spatial environments
    - mandala.glb
    - fractal-patterns.fbx
    - app-icons.glb
  /icons           # 2D icons and UI elements
    - yur-logo.svg
    - app-icons/
  /backgrounds     # Procedural and static backgrounds
    - cosmic.hdr
    - mandala-patterns/
  /audio           # Spatial audio and feedback sounds
    - ui-sounds/
    - ambient/
```

## Guidelines

- All 3D models should be optimized for web (< 1MB)
- Use GLTF/GLB format for Three.js compatibility
- Icons should be SVG for crisp scaling
- Backgrounds should support HDR for realistic lighting
- Audio files should be spatial-ready (binaural)

## Coming Soon

- Procedural mandala generator
- Fractal geometry library
- Sacred geometry patterns
- Infinite-dimensional visualizations