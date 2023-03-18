import docker
import os
import base64

def compile_wasm():
    image_tag="from-py"
    path_to_wasm="./tree-sitter-L.wasm"
    client = docker.from_env()
    client.images.build(path="./", tag=image_tag, rm=True)
    container = client.containers.create(image_tag)
    container_id = container.id
    os.system("docker cp {}:/tree-sitter-L0.wasm ./out/tree-sitter-l0.wasm".format(container_id))
    os.system("docker cp {}:/tree-sitter-L1.wasm ./out/tree-sitter-l1.wasm".format(container_id))
    container.remove()

def encode_wasm():
    with open("./out/tree-sitter-l1.wasm","rb") as wasm_file:
        encoded = base64.b64encode(wasm_file.read())
        encoded_l = encoded.decode('utf-8')

    code = """function asciiToBinary(str) {
        return atob(str)
    }

    function decode(encoded) {
    var binaryString =  asciiToBinary(encoded);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
    }
    """
    code += "encoded = '{}'; \nvar L_wasm = decode(encoded);".format(encoded_l)
    output_file = open("out/loadparser.js", "w")
    output_file.write(code)

def bundle_html():
    os.chdir('../')
    output_bundled = open("build/out/bundled.html", "w")
    html_template = open("index.html","r")

    for line in html_template:
        line_to_append = line   
        if "<script" in line and "src" in line:
            source_file_path = line.split("src=")[1].split(">")[0].replace('"','')
            with open(source_file_path, 'r') as source_file:
                code = source_file.read()
                line_to_append = "<script>"+code+"</script>"
        elif "<link href" in line and "rel" in line:
            source_file_path = line.split('href="')[1].split('"')[0]
            with open(source_file_path, 'r') as source_file:
                code = source_file.read()
                line_to_append = "<style>"+code+"</style>"
        output_bundled.write(line_to_append)
        
compile_wasm()
encode_wasm()
bundle_html()