A docker container is used to compile the language to a wasm file.
The file is compiled in the container defined in the docker file. 
It is not needed to run the container, simply create it and then copy the file using 
the following commands.

```docker create --name container test```
```docker cp container:/tree-sitter-L.wasm ./tree-sitter-L.wasm```