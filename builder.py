import docker
import os
image_tag="from-py"
path_to_wasm="./tree-sitter-L.wasm"
client = docker.from_env()
client.images.build(path="./", tag=image_tag, rm=True)
container = client.containers.create(image_tag)
container_id = container.id
os.system("docker cp {}:/tree-sitter-L.wasm ./tree-sitter-l.wasm".format(container_id))
container.remove()