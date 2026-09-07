#!/bin/zsh
set -eu
demo_dir="${0:A:h}"
godot_bin="$demo_dir/../../Godot.app/Contents/MacOS/Godot"
if [[ ! -x "$godot_bin" ]]; then
  godot_bin="/Applications/Godot.app/Contents/MacOS/Godot"
fi
if [[ ! -x "$godot_bin" ]]; then
  echo 'Open project.godot with Godot 4.4 or newer, then press F5.'
  exit 1
fi
exec "$godot_bin" --path "$demo_dir"
