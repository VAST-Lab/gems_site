import * as pc from 'playcanvas';
import { CameraControls } from 'camera-controls';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(document.body),
    touch: new pc.TouchDevice(document.body),
    elementInput: new pc.ElementInput(canvas),
    graphicsDeviceOptions: { antialias: false }
});

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();

// 1. Setup Camera (Ensure clearColor is pitch black)
const camera = new pc.Entity('Camera');
camera.addComponent('camera', { 
    clearColor: new pc.Color(0, 0, 0) // Critical for splat visibility
});
camera.addComponent('script');
camera.script.create(CameraControls); 
camera.setPosition(0, 0, 8); // Move further back to ensure it's in view
app.root.addChild(camera);

// 2. Load with Error Checking
const splatUrl = 'https://huggingface.co/datasets/vastlabstudent/Gems_Splats/resolve/main/purple_gem.sog';
const splatAsset = new pc.Asset('gem', 'gsplat', { url: splatUrl });

app.assets.add(splatAsset);
app.assets.load(splatAsset);

splatAsset.ready(() => {
    console.log("Splat asset ready!");
    const splatEntity = new pc.Entity('Splat');
    splatEntity.addComponent('gsplat', { asset: splatAsset });
    
    // Some splats need a 180-degree flip to be upright
    splatEntity.setLocalEulerAngles(180, 0, 0); 
    app.root.addChild(splatEntity);
});

splatAsset.on('error', (err) => {
    console.error("Asset failed to load:", err);
});

window.addEventListener('resize', () => app.resizeCanvas());
