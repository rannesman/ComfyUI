"""Complete video pipeline example for ComfyUI:
script -> shot list -> images -> video clips -> final edit.

This script demonstrates a practical automation workflow while keeping dependencies minimal
(standard library + optional ffmpeg for video assembly).
"""

from __future__ import annotations

import argparse
import copy
import csv
import json
import random
import subprocess
import textwrap
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any
from urllib import request


DEFAULT_IMAGE_WORKFLOW = {
    "3": {
        "class_type": "KSampler",
        "inputs": {
            "cfg": 8,
            "denoise": 1,
            "latent_image": ["5", 0],
            "model": ["4", 0],
            "negative": ["7", 0],
            "positive": ["6", 0],
            "sampler_name": "euler",
            "scheduler": "normal",
            "seed": 1,
            "steps": 20,
        },
    },
    "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {"ckpt_name": "v1-5-pruned-emaonly.safetensors"},
    },
    "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {"batch_size": 1, "height": 768, "width": 1344},
    },
    "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": ["4", 1], "text": "cinematic scene"},
    },
    "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {"clip": ["4", 1], "text": "blurry, artifacts, watermark"},
    },
    "8": {
        "class_type": "VAEDecode",
        "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
    },
    "9": {
        "class_type": "SaveImage",
        "inputs": {"filename_prefix": "video_pipeline", "images": ["8", 0]},
    },
}


@dataclass
class Shot:
    shot_id: int
    title: str
    visual_prompt: str
    narration: str
    duration_s: float
    camera: str


class ComfyClient:
    def __init__(self, server_address: str, timeout_s: int = 600):
        self.server_address = server_address
        self.timeout_s = timeout_s

    def queue_prompt(self, prompt: dict[str, Any]) -> str:
        data = json.dumps({"prompt": prompt}).encode("utf-8")
        req = request.Request(f"http://{self.server_address}/prompt", data=data)
        response = json.loads(request.urlopen(req).read())
        return response["prompt_id"]

    def get_history(self, prompt_id: str) -> dict[str, Any]:
        with request.urlopen(f"http://{self.server_address}/history/{prompt_id}") as response:
            payload = json.loads(response.read())
        return payload.get(prompt_id, {})

    def run_and_wait(self, prompt: dict[str, Any]) -> dict[str, Any]:
        prompt_id = self.queue_prompt(prompt)
        start = time.time()
        while True:
            history = self.get_history(prompt_id)
            if history.get("outputs"):
                return history
            if time.time() - start > self.timeout_s:
                raise TimeoutError(f"ComfyUI execution timeout for prompt_id={prompt_id}")
            time.sleep(1)


def read_script(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def split_beats(script_text: str, max_shots: int) -> list[str]:
    normalized = script_text.replace("\n", " ")
    chunks = [c.strip() for c in normalized.split(".") if c.strip()]
    if not chunks:
        return ["A cinematic opening scene."]
    return chunks[:max_shots]


def build_shot_list(script_text: str, max_shots: int, shot_duration: float) -> list[Shot]:
    beats = split_beats(script_text, max_shots)
    camera_options = ["wide", "medium", "close-up", "tracking", "aerial"]
    shots: list[Shot] = []
    for idx, beat in enumerate(beats, start=1):
        beat_short = textwrap.shorten(beat, width=100, placeholder="...")
        shots.append(
            Shot(
                shot_id=idx,
                title=f"Shot {idx}",
                visual_prompt=(
                    "cinematic, high detail, consistent character and wardrobe, "
                    f"scene: {beat_short}, lighting: dramatic natural light"
                ),
                narration=beat_short,
                duration_s=shot_duration,
                camera=camera_options[(idx - 1) % len(camera_options)],
            )
        )
    return shots


def find_nodes_by_class(workflow: dict[str, Any], class_type: str) -> list[str]:
    return [node_id for node_id, node in workflow.items() if node.get("class_type") == class_type]


def build_image_prompt(workflow_template: dict[str, Any], shot: Shot, seed: int) -> dict[str, Any]:
    workflow = copy.deepcopy(workflow_template)

    text_nodes = find_nodes_by_class(workflow, "CLIPTextEncode")
    if text_nodes:
        workflow[text_nodes[0]]["inputs"]["text"] = shot.visual_prompt

    ksampler_nodes = find_nodes_by_class(workflow, "KSampler")
    if ksampler_nodes:
        workflow[ksampler_nodes[0]]["inputs"]["seed"] = seed

    save_nodes = find_nodes_by_class(workflow, "SaveImage")
    if save_nodes:
        workflow[save_nodes[0]]["inputs"]["filename_prefix"] = f"shot_{shot.shot_id:03d}"

    return workflow


def find_first_saved_image(history: dict[str, Any], comfy_output_dir: Path) -> Path:
    outputs = history.get("outputs", {})
    for node_output in outputs.values():
        images = node_output.get("images", [])
        if images:
            image = images[0]
            subfolder = image.get("subfolder", "")
            return comfy_output_dir / subfolder / image["filename"]
    raise RuntimeError("No image output was found in ComfyUI history payload.")


def render_clip_from_image(image_path: Path, output_path: Path, duration_s: float, fps: int) -> None:
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(image_path),
        "-t",
        str(duration_s),
        "-vf",
        "scale=1280:720,format=yuv420p",
        "-r",
        str(fps),
        str(output_path),
    ]
    subprocess.run(cmd, check=True)


def concat_clips(clip_paths: list[Path], output_path: Path) -> None:
    concat_file = output_path.parent / "concat_inputs.txt"
    concat_file.write_text(
        "\n".join(f"file '{path.resolve()}'" for path in clip_paths),
        encoding="utf-8",
    )
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-c",
        "copy",
        str(output_path),
    ]
    subprocess.run(cmd, check=True)


def save_shot_list(shots: list[Shot], output_dir: Path) -> None:
    json_path = output_dir / "shot_list.json"
    csv_path = output_dir / "shot_list.csv"

    json_path.write_text(json.dumps([asdict(s) for s in shots], indent=2), encoding="utf-8")

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(asdict(shots[0]).keys()))
        writer.writeheader()
        for shot in shots:
            writer.writerow(asdict(shot))


def load_workflow_template(path: str | None) -> dict[str, Any]:
    if not path:
        return copy.deepcopy(DEFAULT_IMAGE_WORKFLOW)
    return json.loads(Path(path).read_text(encoding="utf-8"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a complete video from a script using ComfyUI + ffmpeg.")
    parser.add_argument("--script-file", required=True, help="Path to plain text script file.")
    parser.add_argument("--output-dir", default="output/video_pipeline", help="Pipeline output directory.")
    parser.add_argument("--server", default="127.0.0.1:8188", help="ComfyUI server address.")
    parser.add_argument("--comfy-output-dir", default="output", help="ComfyUI output directory on disk.")
    parser.add_argument("--image-workflow-template", default=None, help="Optional API-format workflow JSON for images.")
    parser.add_argument("--max-shots", type=int, default=8, help="Maximum shots generated from the script.")
    parser.add_argument("--shot-duration", type=float, default=4.0, help="Default shot duration in seconds.")
    parser.add_argument("--fps", type=int, default=24, help="Output FPS for generated clips.")
    parser.add_argument("--seed", type=int, default=42, help="Base random seed.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    script_path = Path(args.script_file)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    clips_dir = output_dir / "clips"
    clips_dir.mkdir(exist_ok=True)

    script_text = read_script(script_path)
    (output_dir / "script.txt").write_text(script_text, encoding="utf-8")

    shots = build_shot_list(script_text, args.max_shots, args.shot_duration)
    save_shot_list(shots, output_dir)

    workflow_template = load_workflow_template(args.image_workflow_template)
    comfy_client = ComfyClient(args.server)
    comfy_output_dir = Path(args.comfy_output_dir)

    rng = random.Random(args.seed)
    clip_paths: list[Path] = []

    for shot in shots:
        seed = rng.randint(1, 2**31 - 1)
        prompt = build_image_prompt(workflow_template, shot, seed)
        history = comfy_client.run_and_wait(prompt)
        image_path = find_first_saved_image(history, comfy_output_dir)

        clip_path = clips_dir / f"shot_{shot.shot_id:03d}.mp4"
        render_clip_from_image(image_path=image_path, output_path=clip_path, duration_s=shot.duration_s, fps=args.fps)
        clip_paths.append(clip_path)

    final_video = output_dir / "final_edit.mp4"
    concat_clips(clip_paths, final_video)

    print(f"Pipeline complete. Final video: {final_video}")


if __name__ == "__main__":
    main()
