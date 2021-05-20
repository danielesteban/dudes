#!/bin/sh
#
# To run this, you'll need to install LLVM:
# https://chocolatey.org/packages/llvm
# It will complain about a missing file that you can get here:
# https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/libclang_rt.builtins-wasm32-wasi-12.0.tar.gz
# Just put it on the same path that the error specifies and you should be good to go.
# Also, make sure you downloaded the vendor submodules with: "git submodule init && git submodule update"
# and remember to run "make -j8" on ../../vendor/wasi-libc/ before running this.
#
cd "${0%/*}"
clang --target=wasm32-unknown-wasi --sysroot=../../vendor/wasi-libc/sysroot -nostartfiles -flto -Ofast \
-Wl,--import-memory -Wl,--no-entry -Wl,--lto-O3 \
-Wl,--export=malloc \
-Wl,--export=colliders \
-Wl,--export=findPath \
-Wl,--export=findTarget \
-Wl,--export=generate \
-Wl,--export=getHeight \
-Wl,--export=getLight \
-Wl,--export=heightmap \
-Wl,--export=mesh \
-Wl,--export=propagate \
-Wl,--export=update \
-o ../voxels.wasm voxels.c
