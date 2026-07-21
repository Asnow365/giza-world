# Giza World

AI-powered Ancient Egyptian archaeological research platform. Browse 3D tomb reconstructions, chat with an AI knowledge agent trained on the G7050—G7070 excavation archives, and generate 3D character animations from text descriptions.

## Features

### 🏺 Type it! — Ancient Egyptian Knowledge Agent
- Claude-powered conversational AI with access to the complete G7050—G7070 tomb archives
- 171 indexed archival photos, maps, plans, manuscripts, and expedition diaries
- Natural language queries: "Show me the sarcophagus photos" / "What architrave records exist?"
- Inline photo display with lightbox viewer
- Source-based citation with academic rigor

### 🤖 AI Studio — Text to Motion
- Generate 3D character animations from natural language descriptions
- Target characters: Hathor, Menkaure, Ranefer
- Adjustable duration and intensity parameters
- Powered by Tripo API

### 🏛️ Scene Viewer
- Real-time 3D Gaussian Splatting rendering via Spark.js (World Labs)
- Two Giza archaeological scenes with PLY/SPZ support
- Orbit controls, scene switching, and character animation playback

### 🔬 3D World Generation (Coming Soon)
- See3D integration: single image → explorable 3D scene
- Deploying on 4× NVIDIA RTX 4090 GPU server
- End-to-end pipeline: upload photo → AI generates 3DGS → browser rendering

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | Three.js, Spark (3DGS), Visionary (WebGPU) |
| AI Chat | Anthropic Claude API (Sonnet 4) |
| Text-to-Motion | Tripo API |
| 3D Scene Generation | See3D (BAAI, CVPR 2025 Highlight) |
| UI | Tailwind CSS, vanilla JavaScript |
| Server | Python HTTP server with API proxy |

## Quick Start

```bash
# Start the server
python server.py 8080

# Open in browser
# Home:      http://localhost:8080/v3.html
# Type it!:  http://localhost:8080/type-it.html
```

Requires Python 3.8+. For Type it!, an Anthropic API key is needed (configured in-app).

## GPU Deployment (See3D)

For 3D scene generation, deploy to a server with NVIDIA GPU (≥12GB VRAM):

```bash
unzip giza-project.zip
cd giza-project
bash deploy_gpu.sh          # Install deps + download See3D model (~10GB)
source venv/bin/activate
python see3d_api.py --port 8090  # Start GPU inference API
```

## Project Structure

```
├── v3.html                  # Home page
├── type-it.html             # AI Knowledge Agent
├── server.py                # Main server + API proxy
├── see3d_api.py             # See3D GPU inference API
├── deploy_gpu.sh            # GPU server deployment script
├── lib/                     # Three.js, gl-matrix
├── visionary-core.*.js      # Visionary 3DGS engine
├── data/                    # Archaeological data (JSON)
├── scene/                   # 3D scene files (PLY/SPZ)
└── motion/                  # Character models (GLB)
```

## License

MIT — Giza World is open source. See3D and Visionary are used under their respective open-source licenses.
