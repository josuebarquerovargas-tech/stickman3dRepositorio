#!/bin/sh
# Junta las fotos de una carpeta en una hoja de contacto:  sh scripts/hoja.sh out/fotos out/hoja.jpg [7x4]
(cd "$1" && ls s_*.jpg | sort -t_ -k2 -n | sed "s/^/file '/;s/$/'/" > lista.txt)
ffmpeg -v error -y -f concat -safe 0 -i "$1/lista.txt" -vf "scale=300:-2,tile=${3:-7x4}" -frames:v 1 -q:v 3 "$2"
