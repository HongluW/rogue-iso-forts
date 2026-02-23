# IsoForts

An isometric fort-building game built with **Next.js**, **TypeScript**, and **HTML5 Canvas**.

Made with [Cursor](https://cursor.com)

## Features

-   **Isometric Rendering Engine**: Custom-built rendering system using HTML5 Canvas with depth sorting and sprite rendering.
-   **Interactive Grid**: Tile-based placement system for terrain and buildings.
-   **State Management**: Save/Load functionality for multiple forts.
-   **Responsive Design**: Mobile-friendly interface with touch controls.
-   **Keyboard Controls**: WASD for camera movement, right-click drag for panning.

## Tech Stack

-   **Framework**: [Next.js 16](https://nextjs.org/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Graphics**: HTML5 Canvas API (No external game engine libraries; pure native implementation).
-   **Icons**: Lucide React.

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/HongluW/isometric-fort.git
    cd isometric-fort
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the game:**
    Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Controls

-   **WASD**: Pan the camera
-   **Right-click drag**: Pan the camera
-   **Left-click**: Select/place tiles
-   **Mouse wheel**: Zoom in/out

## License

Distributed under the MIT License. See `LICENSE` for more information.
