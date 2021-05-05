#!/bin/sh
#
# To run this, you'll need to install LLVM:
# https://chocolatey.org/packages/llvm
# It will complain about a missing file that you can get here:
# https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/libclang_rt.builtins-wasm32-wasi-12.0.tar.gz
# Just put it on the same path that the error specifies and you should be good to go.
# Also, make sure you downloaded the vendor submodules with: "git submodule init && git submodule update"
# and remember to run "make -j8" on ../vendor/wasi-libc/ before running this.
#
cd "${0%/*}"
clang --target=wasm32-unknown-wasi -nostartfiles --sysroot=../vendor/wasi-libc/sysroot -Ofast -flto \
-Wl,--import-memory -Wl,--lto-O3 -Wl,--no-entry \
-Wl,--export=__heap_base \
-Wl,--export=generate \
-Wl,--export=propagate \
-Wl,--export=update \
-Wl,--export=mesh \
-Wl,--export=colliders \
-Wl,--export=findPath \
-Wl,--export=findTarget \
-o voxels.wasm ../vendor/AStar/AStar.c voxels.c
