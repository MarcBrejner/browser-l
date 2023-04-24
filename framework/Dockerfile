FROM ubuntu:22.04
# Install required tools
RUN apt-get update && apt-get install -y curl sudo git xz-utils lbzip2
# Install nodejs
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash
RUN apt-get install -y nodejs
# Install Emscripten
RUN git clone https://github.com/emscripten-core/emsdk.git \
    && cd /emsdk \
    && ./emsdk install 2.0.24 \
    && ./emsdk activate 2.0.24
# Set Emscripten paths
ENV PATH=$PATH:/emsdk:/emsdk/upstream/emscripten:/emsdk/upstream/bin:/emsdk/node/14.15.5_64bit
ENV EMSDK=/emsdk
ENV EM_CONFIG=/emsdk/.emscripten
ENV EMSDK_NODE=/emsdk/node/14.15.5_64bit/bin/node
# Install tree-sitter
RUN git clone https://github.com/MarcBrejner/tree-sitter-twenty
WORKDIR "/tree-sitter-twenty"
RUN git pull
#RUN rm -rf /script/build-wasm
#COPY build-wasm /script/build-wasm
#COPY tree-sitter tree-sitter
#WORKDIR "/tree-sitter"
RUN chmod +x ./script/build-wasm
RUN ./script/build-wasm
WORKDIR "/"
RUN npm install tree-sitter-cli@0.20.0
ENV PATH=$PATH:/node_modules/.bin
# Get input language
COPY levels/L0 L0 
COPY levels/L1 L1
WORKDIR "/L0"
RUN tree-sitter generate
WORKDIR "/L1"
RUN tree-sitter generate
WORKDIR "/"
# Compile input language to wasm
RUN npx tree-sitter build-wasm L0
RUN npx tree-sitter build-wasm L1