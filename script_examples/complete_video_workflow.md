# Complete Video Workflow (Script → Shots → Images → Video → Edit)

This example provides a full pipeline around ComfyUI generation with a single script:

1. **Script writing input** (`--script-file`)
2. **Shot list generation** (JSON + CSV)
3. **Image generation** (ComfyUI API prompts)
4. **Video generation** (one clip per shot via ffmpeg)
5. **Combining/editing** (concatenate all clips into `final_edit.mp4`)

## Run

```bash
python script_examples/complete_video_workflow.py \
  --script-file my_story.txt \
  --server 127.0.0.1:8188 \
  --comfy-output-dir output \
  --output-dir output/video_pipeline
```

## Notes

- Start ComfyUI first.
- The default image workflow is embedded in the script and uses `CheckpointLoaderSimple` + `KSampler`.
- You can export any UI workflow in API format and pass it with `--image-workflow-template`.
- `ffmpeg` is required for shot clip rendering + final edit assembly.

## Outputs

`output/video_pipeline/` will contain:

- `script.txt`
- `shot_list.json`
- `shot_list.csv`
- `clips/shot_001.mp4` ...
- `final_edit.mp4`

## Recommended production upgrades

- Add an LLM call for higher-quality shot planning.
- Add TTS per shot + mix with background music.
- Replace image-to-video clip generation with a native video model workflow template.
- Add continuity controls (character sheets, reference images, seed planning).
